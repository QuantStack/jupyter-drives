import json
from itertools import chain
from typing import Dict, List, Optional, Tuple, Union

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
    
    async def list_drives(self) -> List[Dict[str, str]]:
        """Get the list of available drives.
            
        Returns:
            The list of available drives
        """
        # drives_url = "/get-listDrives"
        # results = await self._call_s3(drives_url)  
        
        data = []
        error = ""
        if (self._config.access_key_id and self._config.secret_access_key):
            S3Drive = get_driver(Provider.S3)
            drives = [S3Drive(self._config.access_key_id, self._config.secret_access_key)]

            results = []
            for drive in drives:
                results += drive.list_containers()
                print(drive.list_containers())
        
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
        else:
            error = "No AWS credentials provided."

        return data, error
    
    async def _call_s3(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        media_type: str = "application/xml", # check type
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
