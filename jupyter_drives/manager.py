import http 
import json
import logging
from typing import Dict, List, Optional, Tuple, Union, Any

import tornado
import httpx
import traitlets
from jupyter_server.utils import url_path_join

import obstore as obs
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver

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
               response = {
                    "message": "Listing drives not supported for given provider.",
                    "code": 501
                }
               return response

            results = []
            for drive in drives:
                results += drive.list_containers()
            
            for result in results:
                data.append(
                    {
                            "name": result.name,
                            "region": result.driver.region,
                            "creation_date": result.extra["creation_date"],
                            "status": "inactive",
                            "provider": self._config.provider
                    }
                )
            response = {
                "data": data,
                "code": 200
            }
        else:
            response = {"code": 400, "message": "No credentials specified. Please set them in your user jupyter_server_config file."}
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason="No credentials specified. Please set them in your user jupyter_server_config file.",
            )
        
        return response
    
    async def mount_drive(self, drive_name, **kwargs):
        """Mount a drive.

        Args:
            drive_name: name of drive to mount

        Returns:
            The content manager for the drive.
        """
        try: 
            # check if content manager doesn't already exist
            if drive_name not in self._content_managers or self._content_managers[drive_name] is None:
                if kwargs.provider == 's3':
                    store = obs.store.S3Store.from_url("s3://" + drive_name + "/", config = {"aws_access_key_id": self._config.access_key_id, "aws_secret_access_key": self._config.secret_access_key, "aws_region": kwargs.drive_region})
                elif kwargs.provider == 'gcs':
                    store = obs.store.GCSStore.from_url("gs://" + drive_name + "/", config = {}) # add gcs config
                elif kwargs.provider == 'http':
                    store = obs.store.HTTPStore.from_url(drive_name, client_options = {}) # add http client config
                else: 
                    raise ValueError(f"Provider not supported: {kwargs.provider}")
                
                self._content_managers[drive_name].store = store
                self._content_managers[drive_name].provider = kwargs.provider

                response = {
                    "content_manager": store,
                    "code": 201,
                    "message": "Drive succesfully mounted."
                }
            else:
                response = {
                "code": 409,
                "message": "Drive already mounted."
                }
        except Exception as e:
            response = {
                "code": 400,
                "message": "The following error occured when mouting the drive: {e}"
            }
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason= "The following error occured when mouting the drive: {e}"
            )

        return response
    
    async def unmount_drive(self, drive_name: str, **kwargs):
        """Unmount a drive.

        Args:
            drive_name: name of drive to unmount
        """
        if drive_name in self._content_managers:
            self._content_managers.pop(drive_name, None)
            response = {
                "code": 204,
                "message": "Drive successfully unmounted."
            }

        else:
            response = {
                "code": 404,
                "message": "Drive is not mounted or doesn't exist."}
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason="Drive is not mounted or doesn't exist.",
            )
        
        return response
    
    async def get_contents(self, drive_name, path, **kwargs):
        """Get contents of a file or directory.

        Args:
            drive_name: name of drive to get the contents of
            path: path to file or directory
        """
        print('Get contents function called.')
    
    async def new_file(self, drive_name, path, **kwargs):
        """Create a new file or directory at the given path.
        
        Args:
            drive_name: name of drive where the new content is created
            path: path where new content should be created
        """
        print('New file function called.')
    
    async def rename_file(self, drive_name, path, **kwargs):
        """Rename a file.
        
        Args:
            drive_name: name of drive where file is located
            path: path of file
        """
        print('Rename file function called.')
    
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