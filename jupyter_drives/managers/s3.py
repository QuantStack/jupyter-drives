import tornado
import httpx
from itertools import chain
from typing import Dict, List, Optional, Tuple, Union, Any

import traitlets
from jupyter_server.utils import url_path_join
from tornado.httputil import url_concat

from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver
from s3contents import S3ContentsManager

from ..base import DrivesConfig
from .manager import JupyterDrivesManager

class S3Manager(JupyterDrivesManager):
    """Jupyter drives manager for S3 drives."""

    def __init__(self, config: traitlets.config.Config) -> None:
        super().__init__(DrivesConfig(config=config))
        self._drives_cache = {}
        self.s3_content_managers = {}

    @property
    def base_api_url(self):
        return self._config.api_base_url or "https://s3.amazonaws.com/"

    @property
    def per_page_argument(self) -> Optional[Tuple[str, int]]:
        """Returns query argument to set number of items per page.

        Returns
            [str, int]: (query argument name, value)
            None: the provider does not support pagination
        """
        return ("per_page", 100)
    
    async def list_drives(self):
        """Get the list of available drives.
            
        Returns:
            The list of available drives
        """
        data = []
        if (self._config.access_key_id and self._config.secret_access_key):
            S3Drive = get_driver(Provider.S3)
            drives = [S3Drive(self._config.access_key_id, self._config.secret_access_key)]
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
                        "provider": "S3"
                    }
                )
            response = {
                "data": data,
                "code": 200
            }
        else:
            response = {"code": 400}
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason="No AWS credentials specified. Please set them in your user jupyter_server_config file.",
            )

        return response
    
    async def mount_drive(self, drive_name):
        '''Mount a drive by creating an S3ContentsManager for it.

        Params: 
            drive_name: name of drive to mount
        
        Args:
            S3ContentsManager
        '''
       
        try :
            s3_contents_manager = S3ContentsManager(
                access_key_id = self._config.access_key_id,
                secret_access_key = self._config.secret_access_key,
                endpoint_url = self._config.api_base_url,
                bucket = drive_name
            )
   
            # checking if the drive wasn't mounted already
            if drive_name not in self.s3_content_managers or self.s3_content_managers[drive_name] is None:

                # dealing with long-term credentials (access key, secret key)
                if self._config.session_token is None:
                    s3_contents_manager = S3ContentsManager(
                    access_key_id = self._config.access_key_id,
                    secret_access_key = self._config.secret_access_key,
                    endpoint_url = self._config.api_base_url,
                    bucket = drive_name
                    )
                
                # dealing with short-term credentials (access key, secret key, session token)
                else:
                    s3_contents_manager = S3ContentsManager(
                    access_key_id = self._config.access_key_id,
                    secret_access_key = self._config.secret_access_key,
                    session_token = self._config.session_token,
                    endpoint_url = self._config.api_base_url,
                    bucket = drive_name
                    )
                
                self.s3_content_managers[drive_name] = s3_contents_manager

                response = {
                    "s3_contents_manager": s3_contents_manager,
                    "code": 201,
                    "message": "Drive successfully mounted."
                }
            else:
                response = {"code": 409, "message": "Drive already mounted."}

        except Exception as e:
            response = {"code": 400, "message": e}
        
        return response
    
    async def unmount_drive(self, drive_name):
        '''Unmount a drive.

        Args:
            drive_name: name of drive to unmount
        '''
        if drive_name in self.s3_content_managers:
            self.s3_content_managers.pop(drive_name, None)
            response = {"code": 204}
        
        else:
            response = {"code": 404}
            raise tornado.web.HTTPError(
            status_code= httpx.codes.BAD_REQUEST,
            reason="Drive is not mounted or doesn't exist.",
            )
        
    async def get_contents(self, drive_name, path = ""):
        '''Get contents of an S3 drive.

        Args: 
            drive_name: name of drive to get contents of
            path: path of file or directory to retrieve the contents of

        Returns:
            contents: contents of file or directory
        '''
        response = {}
        try:
            if drive_name in self.s3_content_managers:
                contents = self.s3_content_managers[drive_name].fs.ls(path)
                code = 200
                response["contents"] = contents
            else:
                code = 404
                response["message"] = "Drive doesn't exist or is not mounted."
        except Exception as e:
            code = 400
            response["message"] = e
            
        response["code"] = code
        return response
    
    
    async def new_file(self, drive_name, type = "notebook", path = ""):
        '''Create a new file or directory from an S3 drive.

        Args:
            type: type of content to be created (notebook or directory)
            drive_name: name of drive where new content should be created
            path: path where new content should be created
        '''
        response = {}
        try:
            if drive_name in self.s3_content_managers:
                new_content = self.s3_content_managers[drive_name].new_untitled(type)
                code = 201
                response["file_name"] = new_content["name"]
            else:
                code = 404
                response["message"] = "Drive doesn't exist or is not mounted."
        except Exception as e:
            code = 400
            response["message"] = e
            
        response["code"] = code
        return response
    
    async def rename_file(self, new_file_name, drive_name, path = ""):
        '''Rename a file from an S3 drive.

        Args:
            new_file_name: new name of file
            drive_name: name of drive where new content should be created
            path: path where new content should be created
        '''
        response = {}
        try:
            if drive_name in self.s3_content_managers:
                new_file_path = url_path_join(path, new_file_name)
                self.s3_content_managers[drive_name].rename_file(new_path = new_file_path, old_path = path)
                code = 201
            else:
                code = 404
                response["message"] = "Drive doesn't exist or is not mounted."
        except Exception as e:
            code = 400
            response["message"] = e
            
        response["code"] = code
        return response
    
    async def _call_s3(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        media_type: str = "application/xml",
        has_pagination: bool = True,
    ) -> Union[dict, str]:
        """Call S3 provider

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
            media_type: Type of accepted content
            has_pagination: Whether the pagination query arguments should be appended
        Returns:
            List or Dict: Create from JSON response body if load_json is True
            str: Raw response body if load_json is False
        """
        headers = {
            "Accept": media_type,
            "Authorization": f"session-token {self._config.session_token_token} access-key-id {self._config.access_key_id} secret-access-key {self._config.secret_access_key}",
        }

        return await super()._call_provider(
            url,
            load_json=load_json,
            method=method,
            body=body,
            params=params,
            headers=headers,
            has_pagination=has_pagination,
        )
