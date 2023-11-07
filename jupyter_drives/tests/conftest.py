import pytest
from traitlets.config import Config


pytest_plugins = ["jupyter_server.pytest_plugin"]


@pytest.fixture
def jp_server_config(jp_server_config):
    return {
        "ServerApp": {"jpserver_extensions": {"jupyter_drives": True}},
        "DrivesConfig": {"api_base_url": "https://s3.amazonaws.com/", "session_token": "valid", "access_key_id": "valid", "secret_access_key": "valid"},
    }


@pytest.fixture
def drives_base_config():
    return Config()


@pytest.fixture
def drives_s3_config(drives_base_config):
    return drives_base_config()


@pytest.fixture
def drives_s3_manager(drives_base_config):
    from ..managers.s3 import S3Manager

    return S3Manager(drives_base_config)


@pytest.fixture
def drives_valid_s3_manager(drives_s3_manager):
    drives_s3_manager._config.session_token = "valid"
    drives_s3_manager._config.access_key_id = "valid"
    drives_s3_manager._config.secret_access_key = "valid"
    return drives_s3_manager
