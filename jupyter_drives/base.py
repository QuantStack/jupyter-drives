import os
from sys import platform
import entrypoints
from traitlets import Enum, Unicode, default
from traitlets.config import Configurable

# Supported third-party services
MANAGERS = {}

for entry in entrypoints.get_group_all("jupyter_drives.manager_v1"):
    MANAGERS[entry.name] = entry

class DrivesConfig(Configurable):
    """
    Allows configuration of supported drives via jupyter_notebook_config.py
    """

    session_token = Unicode(
        None,
        config=True,
        allow_none=True,
        help="A session access token to authenticate.",
    )

    access_key_id = Unicode(
        None,
        config=True,
        allow_none=True,
        help="The id of the access key for the bucket.",
    )

    secret_access_key= Unicode(
        None,
        config=True,
        allow_none=True,
        help="The secret access key for the bucket.",
    )

    region_name = Unicode(
        "eu-north-1",
        config = True, 
        help = "Region name.",
    )

    api_base_url = Unicode(
        config=True,
        help="Base URL of the provider service REST API.",
    )

    custom_credentials_path = Unicode(
        None,
        config = True,
        allow_none = True,
        help="Custom path of file where credentials are located. Extension automatically checks jupyter_notebook_config.py or directly in ~/.aws/credentials for AWS CLI users."
    )

    @default("api_base_url")
    def set_default_api_base_url(self):
        # for AWS S3 drives
        if self.provider == "s3":
            return "https://s3.amazonaws.com/" # region? https://s3.<region>.amazonaws.com/
        
        # for Google Cloud Storage drives
        elif self.provider == "gcs":
            return "https://www.googleapis.com/"   

    provider = Enum(
        MANAGERS.keys(),
        default_value="s3",
        config=True,
        help="The source control provider.",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._load_credentials()
    
    def _load_credentials(self):
        # check if credentials were already set in jupyter_notebook_config.py
        if self.access_key_id is not None and self.secret_access_key is not None:
            return

        # check if user provided custom path for credentials extraction
        if self.custom_credentials_path is not None:
            self.access_key_id, self.secret_access_key, self.session_token = self._extract_credentials_from_file(self.custom_credentials_path)
            return
        
        # if not, try to load credentials from AWS CLI
        aws_credentials_path = "~/.aws/credentials" #add read me about credentials path in windows: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html
        if os.path_exists(aws_credentials_path):
            self.access_key_id, self.secret_access_key, self.session_token = self._extract_credentials_from_file(aws_credentials_path)
            return
        
    def _extract_credentials_from_file(self, file_path):
        try:
            with open(file_path, 'r') as file:
                access_key_id, secret_access_key, session_token = None, None, None
                lines = file.readlines()
                for line in lines:
                    if line.startswith("aws_access_key_id ="):
                        access_key_id = line.split("=")[1].strip()
                    elif line.startswith("aws_secret_access_key ="):
                        secret_access_key = line.split("=")[1].strip()
                    elif line.startswith("session_token ="):
                        session_token = line.split("=")[1].strip()
                return access_key_id, secret_access_key, session_token
        except Exception as e:
            print(f"Failed loading credentials from {file_path}: {e}")
        return
