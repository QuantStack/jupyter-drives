import json
from unittest.mock import patch

import pytest
import tornado
import os

from moto import mock_s3
from moto.moto_server.threaded_moto_server import ThreadedMotoServer
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver

@pytest.fixture(scope="module")
def set_s3_base():
    server = ThreadedMotoServer(port = 0)
    server.start()

    # AWS credentials for testing purposes
    os.environ["access_key_id"] = "12345"
    os.environ["secret_access_key"] = "123456789"

    print("Server working")
    yield
    print("Moto done")
    server.stop()

@pytest.fixture
async def test_ListJupyterDrives_s3_success(jp_fetch, set_s3_base):
    with mock_s3(): 
        S3Drive = get_driver(Provider.S3)
        drive = S3Drive('access_key', 'secret_key')

        test_bucket_name_1 = "jupyter-drives-test-bucket-1"
        test_bucket_name_2 = "jupyter-drives-test-bucket-2"

        # Create some test containers
        drive.create_container(test_bucket_name_1)
        drive.create_container(test_bucket_name_2)

        # When
        response = await jp_fetch("jupyter-drives", "drives")

        # Then
        assert response.code == 200
        payload = json.loads(response.body)
        assert "jupyter-drives-test-bucket-1" in payload
        assert "jupyter-drives-test-bucket-2" in payload

@pytest.fixture
async def test_ListJupyterDrives_s3_empty_list(jp_fetch, set_s3_base):
    with mock_s3(): 
        S3Drive = get_driver(Provider.S3)
        drive = S3Drive('access_key', 'secret_key')

        # When
        response = await jp_fetch("jupyter-drives", "drives")

        # Then
        assert response.code == 200
        payload = json.loads(response.body)
        assert payload.len == 0 

@pytest.fixture
async def test_ListJupyterDrives_s3_missing_credentials(jp_fetch, set_s3_base):
    with mock_s3(): 
        S3Drive = get_driver(Provider.S3)
        drive = S3Drive()

        test_bucket_name_1 = "jupyter-drives-test-bucket-1"
        test_bucket_name_2 = "jupyter-drives-test-bucket-2"

        # Create a test container
        drive.create_container(test_bucket_name_1)
        drive.create_container(test_bucket_name_2)

        # When
        response = await jp_fetch("jupyter-drives", "drives")

        # Then
        error = json.loads(response.body)
        assert error == "No AWS credentials provided."
