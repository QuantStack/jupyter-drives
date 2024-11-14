import pytest
from traitlets.config import Config

pytest_plugins = ("pytest_jupyter.jupyter_server", )

@pytest.fixture
def jp_server_config(jp_server_config):
    return {
        "ServerApp": {"jpserver_extensions": {"jupyter_drives": True}},
        "DrivesConfig": {"api_base_url": "https://s3.eu-north-1.amazonaws.com/", "access_key_id": "valid", "secret_access_key":"valid"},
    }


@pytest.fixture
def drives_base_config():
    return Config()


@pytest.fixture
def drives_config(drives_base_config):
    return drives_base_config()


@pytest.fixture
def drives_manager(drives_base_config):
    from .jupyter_drives.manager import JupyterDrivesManager

    return JupyterDrivesManager(drives_base_config)


@pytest.fixture
def drives_valid_manager(drives_manager):
    drives_manager._config.access_key_id = "valid"
    drives_manager._config.secret_access = "valid"
    return drives_manager
