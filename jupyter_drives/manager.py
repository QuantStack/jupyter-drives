import http 
import json
import logging
from typing import Dict, List, Optional, Tuple, Union, Any

import os
import tornado
import httpx
import traitlets
import base64
from io import BytesIO
from jupyter_server.utils import url_path_join

import obstore as obs
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver
import pyarrow

from .log import get_logger
from .base import DrivesConfig

import re

class JupyterDrivesManager():
    """
    Jupyter-drives manager class.

    Args:
        config: Server extension configuration object
    
    .. note:

    The manager will receive the global server configuration object;
    so it can add configuration parameters if needed.
    It needs them to extract the ``DrivesConfig``.
    """
    def __init__(self, config: traitlets.config.Config) -> None:
        self._config = DrivesConfig(config=config)
        self._client = httpx.AsyncClient()
        self._content_managers = {}

    @property
    def base_api_url(self) -> str:
        """The provider base REST API URL"""
        return self._config.api_base_url
    
    @property
    def log(self) -> logging.Logger:
        return get_logger()

    @property
    def per_page_argument(self) -> Optional[Tuple[str, int]]:
        """Returns query argument to set number of items per page.

        Returns
            [str, int]: (query argument name, value)
            None: the provider does not support pagination
        """
        return ("per_page", 100)
    
    async def list_drives(self): 
        """Get list of available drives.

        Returns: 
            List of available drives and their properties.
        """
        data = []
        if self._config.access_key_id and self._config.secret_access_key:
            if self._config.provider == "s3":
                S3Drive = get_driver(Provider.S3)
                drives = [S3Drive(self._config.access_key_id, self._config.secret_access_key)]

            elif self._config.provider == 'gcs':
                GCSDrive = get_driver(Provider.GOOGLE_STORAGE)
                drives = [GCSDrive(self._config.access_key_id, self._config.secret_access_key)] # verfiy credentials needed
            
            else: 
               raise tornado.web.HTTPError(
                status_code= httpx.codes.NOT_IMPLEMENTED,
                reason="Listing drives not supported for given provider.",
                )

            results = []
            for drive in drives:
                results += drive.list_containers()
            
            for result in results:
                data.append(
                    {
                        "name": result.name,
                        "region": self._config.region_name if self._config.region_name is not None else "eu-north-1",
                        "creation_date": result.extra["creation_date"],
                        "mounted": False if result.name not in self._content_managers else True,
                        "provider": self._config.provider
                    }
                )
        else:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason="No credentials specified. Please set them in your user jupyter_server_config file.",
            )
        
        response = {
            "data": data
        }
        return response
    
    async def mount_drive(self, drive_name, provider, region):
        """Mount a drive.

        Args:
            drive_name: name of drive to mount

        Returns:
            The content manager for the drive.
        """
        try: 
            # check if content manager doesn't already exist
            if drive_name not in self._content_managers or self._content_managers[drive_name] is None:
                if provider == 's3':
                    store = obs.store.S3Store.from_url("s3://" + drive_name + "/", config = {"aws_access_key_id": self._config.access_key_id, "aws_secret_access_key": self._config.secret_access_key, "aws_region": region})
                elif provider == 'gcs':
                    store = obs.store.GCSStore.from_url("gs://" + drive_name + "/", config = {}) # add gcs config
                elif provider == 'http':
                    store = obs.store.HTTPStore.from_url(drive_name, client_options = {}) # add http client config
                
                self._content_managers[drive_name] = store

            else:
                raise tornado.web.HTTPError(
                status_code= httpx.codes.CONFLICT,
                reason= "Drive already mounted."
                )
                
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason= f"The following error occured when mouting the drive: {e}"
            )

        return 
    
    async def unmount_drive(self, drive_name: str):
        """Unmount a drive.

        Args:
            drive_name: name of drive to unmount
        """
        if drive_name in self._content_managers:
            self._content_managers.pop(drive_name, None)

        else:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.NOT_FOUND,
            reason="Drive is not mounted or doesn't exist.",
            )
        
        return
    
    async def get_contents(self, drive_name, path):
        """Get contents of a file or directory.

        Args:
            drive_name: name of drive to get the contents of
            path: path to file or directory (empty string for root listing)
        """
        if path == '/':
            path = ''
        else: 
            path = path.strip('/')

        try :
            data = []
            isDir = False
            emptyDir = True # assume we are dealing with an empty directory

            # using Arrow lists as they are recommended for large results
            # stream will be an async iterable of RecordBatch
            stream = obs.list(self._content_managers[drive_name], path, chunk_size=100, return_arrow=True)
            async for batch in stream:
                # if content exists we are dealing with a directory
                if isDir is False and batch: 
                    isDir = True
                    emptyDir = False
                    
                contents_list = pyarrow.record_batch(batch).to_pylist()
                for object in contents_list:
                    data.append({
                        "path": object["path"],
                        "last_modified": object["last_modified"].isoformat(),
                        "size": object["size"],
                    })
                
            # check if we are dealing with an empty drive
            if isDir is False and path != '':
                content = b""
                # retrieve contents of object
                obj = await obs.get_async(self._content_managers[drive_name], path)
                stream = obj.stream(min_chunk_size=5 * 1024 * 1024) # 5MB sized chunks
                async for buf in stream: 
                    # if content exists we are dealing with a file
                    if emptyDir is True and buf:
                        emptyDir = False
                    content += buf

                # retrieve metadata of object
                metadata = await obs.head_async(self._content_managers[drive_name], path)

                # for certain media type files, extracted content needs to be read as a byte array and decoded to base64 to be viewable in JupyterLab
                # the following extensions correspond to a base64 file format or are of type PDF
                ext = os.path.splitext(path)[1]
                if ext == '.pdf' or ext == '.svg' or ext == '.tif' or ext == '.tiff' or ext == '.jpg' or ext == '.jpeg' or ext == '.gif' or ext == '.png' or ext == '.bmp' or ext == '.webp':
                    processed_content = base64.b64encode(content).decode("utf-8")
                else:
                    processed_content = content.decode("utf-8")

                data = {
                    "path": path, 
                    "content": processed_content,
                    "last_modified": metadata["last_modified"].isoformat(),
                    "size": metadata["size"]
                }

            # dealing with the case of an empty directory, making sure it is not an empty file
            # TO DO: find better way to check
            if emptyDir is True: 
                ext_list = ['.R', '.bmp', '.csv', '.gif', '.html', '.ipynb', '.jl', '.jpeg', '.jpg', '.json', '.jsonl', '.md', '.ndjson', '.pdf', '.png', '.py', '.svg', '.tif', '.tiff', '.tsv', '.txt', '.webp', '.yaml', '.yml']
                object_name = os.path.basename(path)
                # if object doesn't contain . or doesn't end in one of the registered extensions
                if object_name.find('.') == -1 or ext_list.count(os.path.splitext(object_name)[1]) == 0:
                    data = []

            response = {
                "data": data
            }
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when retrieving the contents: {e}",
            )
        
        return response
    
    async def new_file(self, drive_name, path):
        """Create a new file or directory at the given path.
        
        Args:
            drive_name: name of drive where the new content is created
            path: path where new content should be created
            content: content of object
        """
        data = {}
        try:
            # eliminate leading and trailing backslashes
            path = path.strip('/')

            # TO DO: switch to mode "created", which is not implemented yet
            await obs.put_async(self._content_managers[drive_name], path, b"", mode = "overwrite")
            metadata = await obs.head_async(self._content_managers[drive_name], path)

            data = {
                "path": path,
                "content": "",
                "last_modified": metadata["last_modified"].isoformat(),
                "size": metadata["size"]
            }
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when creating the object: {e}",
            )
        
        response = {
            "data": data
        }
        return response

    async def save_file(self, drive_name, path, content, options_format, content_format, content_type):
        """Save file with new content.
        
        Args:
            drive_name: name of drive where file exists
            path: path where new content should be saved
            content: content of object
        """
        data = {}
        try: 
            # eliminate leading and trailing backslashes
            path = path.strip('/')

            if options_format == 'json':
                formattedContent = json.dumps(content, indent=2)
                formattedContent = formattedContent.encode("utf-8")
            elif options_format == 'base64' and (content_format == 'base64' or content_type == 'PDF'):
                # transform base64 encoding to a UTF-8 byte array for saving or storing
                byte_characters = base64.b64decode(content)
                
                byte_arrays = []
                for offset in range(0, len(byte_characters), 512):
                    slice_ = byte_characters[offset:offset + 512]
                    byte_array = bytearray(slice_)
                    byte_arrays.append(byte_array)
                
                # combine byte arrays and wrap in a BytesIO object 
                formattedContent = BytesIO(b"".join(byte_arrays))
                formattedContent.seek(0)  # reset cursor for any further reading
            elif options_format == 'text':
                formattedContent = content.encode("utf-8")
            else:
                formattedContent = content

            await obs.put_async(self._content_managers[drive_name], path, formattedContent, mode = "overwrite")
            metadata = await obs.head_async(self._content_managers[drive_name], path)

            data = {
                "path": path,
                "content": content,
                "last_modified": metadata["last_modified"].isoformat(),
                "size": metadata["size"]
            }
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when saving the file: {e}",
            )
        
        response = {
                "data": data
            }
        return response
    
    async def rename_file(self, drive_name, path, new_path):
        """Rename a file.
        
        Args:
            drive_name: name of drive where file is located
            path: path of file
        """
        data = {}
        try: 
            # eliminate leading and trailing backslashes
            path = path.strip('/')
            
            await obs.rename_async(self._content_managers[drive_name], path, new_path)
            metadata = await obs.head_async(self._content_managers[drive_name], new_path)

            data = {
                "path": new_path,
                "last_modified": metadata["last_modified"].isoformat(),
                "size": metadata["size"]
            }
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when renaming the object: {e}",
            )
        
        response = {
                "data": data
            }
        return response

    async def delete_file(self, drive_name, path):
        """Delete an object.
        
        Args:
            drive_name: name of drive where object exists
            path: path where content is located
        """
        try: 
            # eliminate leading and trailing backslashes
            path = path.strip('/')
            await obs.delete_async(self._content_managers[drive_name], path)

        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when deleting the object: {e}",
            )
        
        return
    
    async def check_file(self, drive_name, path):
        """Check if an object already exists within a drive.
        
        Args:
            drive_name: name of drive where object exists
            path: path where content is located
        """
        result = False
        try: 
            # eliminate leading and trailing backslashes
            path = path.strip('/')
            await obs.head_async(self._content_managers[drive_name], path)
            result = True
        except Exception:
           pass
        
        response = {
            result: result
        }
        return response
    
    async def copy_file(self, drive_name, path, to_path):
        """Save file with new content.
        
        Args:
            drive_name: name of drive where file exists
            path: path where original content exists
            to_path: path where object should be copied
        """
        data = {}
        try: 
            # eliminate leading and trailing backslashes
            path = path.strip('/')

            await obs.copy_async(self._content_managers[drive_name], path, to_path)
            metadata = await obs.head_async(self._content_managers[drive_name], to_path)

            data = {
                "path": to_path,
                "last_modified": metadata["last_modified"].isoformat(),
                "size": metadata["size"]
            }
        except Exception as e:
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason=f"The following error occured when copying the: {e}",
            )
        
        response = {
                "data": data
            }
        return response
    
    async def _call_provider(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        headers: Optional[Dict[str, str]] = None,
        has_pagination: bool = True,
    ) -> Union[dict, str]:
        """Call the third party service

        The request is presumed to support pagination by default if
        - The method is GET
        - load_json is True
        - The provider returns not None per_page_argument property

        Args:
            url: Endpoint to request
            load_json: Is the response of JSON type
            method: HTTP method
            body: Request body; None if no body
            params: Query arguments as dictionary; None if no arguments
            headers: Request headers as dictionary; None if no headers
            has_pagination: Whether the pagination query arguments should be appended
        Returns:
            List or Dict: Create from JSON response body if load_json is True
            str: Raw response body if load_json is False
        """
        if not self._config.session_token:
            raise tornado.web.HTTPError(
                status_code= httpx.codes.BAD_REQUEST,
                reason="No session token specified. Please set DriversConfig.session_token in your user jupyter_server_config file.",
            )
        
        if not self._config.access_key_id:
            raise tornado.web.HTTPError(
                status_code= httpx.codes.BAD_REQUEST,
                reason="No access key id specified. Please set DriversConfig.access_key_id in your user jupyter_server_config file.",
            )
        
        if not self._config.secret_access_key:
            raise tornado.web.HTTPError(
                status_code= httpx.codes.BAD_REQUEST,
                reason="No secret access key specified. Please set DriversConfig.secret_access_key in your user jupyter_server_config file.",
            )

        if body is not None:
            if headers is None:
                headers = {}
            headers["Content-Type"] = "application/json"
            body = tornado.escape.json_encode(body)

        if (not url.startswith(self.base_api_url)) and (not re.search("^https?:", url)):
            url = url_path_join(self.base_api_url, url)

        with_pagination = False
        if (
            load_json
            and has_pagination
            and method.lower() == "get"
            and self.per_page_argument is not None
        ):
            with_pagination = True
            params = params or {}
            params.update([self.per_page_argument])

        if params is not None:
            url = tornado.httputil.url_concat(url, params)

        request = tornado.httpclient.HTTPRequest(
            url,
            method=method.upper(),
            body=body,
            headers=headers,
        )

        self.log.debug(f"{method.upper()} {url}")
        try:
            response = await self._client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                # Handle pagination
                # Assume the link to be a comma separated list of <url>; rel="relation"
                # where the next chunk has `relation`=next
                link = response.headers.get("Link")
                next_url = None
                if link is not None:
                    for e in link.split(","):
                        args = e.strip().split(";")
                        data = args[0]
                        metadata = {
                            k.strip(): v.strip().strip('"')
                            for k, v in map(lambda s: s.strip().split("="), args[1:])
                        }
                        if metadata.get("rel", "") == "next":
                            next_url = data[1:-1]
                            break

                new_ = json.loads(result)
                if next_url is not None:
                    next_ = await self._call_provider(
                        next_url,
                        load_json=load_json,
                        method=method,
                        body=body,
                        headers=headers,
                        has_pagination=False,  # Relevant query arguments should be part of the link header
                    )
                    if not isinstance(new_, list):
                        new_ = [new_]
                    if not isinstance(next_, list):
                        next_ = [next_]
                    return new_ + next_
                else:
                    if with_pagination and not isinstance(new_, list):
                        return [new_]
                    else:
                        return new_
            else:
                return result
        except tornado.httpclient.HTTPClientError as e:
            self.log.debug(
                f"Failed to fetch {request.method} {request.url}", exc_info=e
            )
            error_body = (
                (e.response.body or b"{}").decode("utf-8")
                if e.response is not None
                else "{}"
            )
            self.log.debug(error_body)
            try:
                message = json.loads(error_body).get("message", str(e))
            except json.JSONDecodeError:
                message = str(e)
            raise tornado.web.HTTPError(
                status_code=e.code, reason=f"Invalid response in '{url}': {message}"
            ) from e
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            self.log.error("Failed to decode the response", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{url}': {e}",
            ) from e
        except Exception as e:
            self.log.error("Failed to fetch http request", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{url}': {e}",
            ) from e
