import os
from sys import platform
import entrypoints
from traitlets import Enum, Unicode, default
from traitlets.config import Configurable
import boto3
from tornado.ioloop import PeriodicCallback

# Supported third-party services
MANAGERS = {}

# 15 minutes
CREDENTIALS_REFRESH = 15 * 60 * 1000

# Moved to the architecture of having one provider independent manager.
# Keeping the loop in case of future developments that need this feature.
for entry in entrypoints.get_group_all("jupyter_drives.manager_v1"):
    MANAGERS[entry.name] = entry

# Supported providers
PROVIDERS = ['s3', 'gcs', 'http']

class DrivesConfig(Configurable):
    """
    Allows configuration of supported drives via jupyter_notebook_config.py
    Implements singleton pattern
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
        None,
        config = True,
        allow_none=True,
        help = "Region name.",
    )

    api_base_url = Unicode(
        config=True,
        help="Base URL of the provider service REST API.",
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
        PROVIDERS,
        default_value="s3",
        config=True,
        help="The source control provider.",
    )

    _instance = None

    def __new__(cls, **kwargs):
        if cls._instance is None:
            cls._instance = super(DrivesConfig, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, **kwargs):
        if self._initialized:
            return

        super().__init__(**kwargs)
        self._initialize_credentials_refresh()
        self._initialized = True

    def _initialize_credentials_refresh(self):
        # check if credentials were already set in jupyter_notebook_config.py
        if self.access_key_id is not None and self.secret_access_key is not None:
            return

        self._load_credentials()
        self._credential_refresh = PeriodicCallback(
            self._load_credentials, CREDENTIALS_REFRESH
        )
        self._credential_refresh.start()

    def _load_credentials(self):
        # automatically extract credentials for S3 drives
        try:
            s = boto3.Session()
            c = s.get_credentials()
            if c is not None:
                self.access_key_id = c.access_key
                self.secret_access_key = c.secret_key
                self.region_name = s.region_name
                self.session_token = c.token
                self.provider = 's3'
            return
        except:
            # S3 credentials couldn't automatically be extracted through boto
            pass

        # use environment variables
        if "JP_DRIVES_ACCESS_KEY_ID" in os.environ and "JP_DRIVES_SECRET_ACCESS_KEY" in os.environ:
            self.access_key_id = os.environ["JP_DRIVES_ACCESS_KEY_ID"]
            self.secret_access_key = os.environ["JP_DRIVES_SECRET_ACCESS_KEY"]
            if "JP_DRIVES_SESSION_TOKEN" in os.environ:
                self.session_token = os.environ["JP_DRIVES_SESSION_TOKEN"]
            if "JP_DRIVES_PROVIDER" in os.environ:
                self.provider = os.environ["JP_DRIVES_PROVIDER"]
            return

        s = boto3.Session()
        c = s.get_credentials()
        self.access_key_id = c.access_key
        self.secret_access_key = c.secret_key
        self.region_name = s.region_name
        self.session_token = c.token
