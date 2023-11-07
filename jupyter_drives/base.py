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
        "",
        config=True,
        help="A session access token to authenticate.",
    )

    access_key_id = Unicode(
        "",
        config=True,
        help="The id of the access key for the bucket.",
    )

    secret_access_key= Unicode(
        "",
        config=True,
        help="The secret access key for the bucket.",
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
        MANAGERS.keys(),
        default_value="s3",
        config=True,
        help="The source control provider.",
    )