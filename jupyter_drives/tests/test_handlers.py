import json
from unittest.mock import patch

import pytest
import tornado
import os


from moto import mock_aws
from moto.moto_server.threaded_moto_server import ThreadedMotoServer
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver

@pytest.fixture(scope="module")
def s3_base():
    # AWS credentials for testing purposes
    os.environ["access_key_id"] = 'access_key'
    os.environ["secret_access_key"] = 'secret_key'

    with mock_aws():
        S3Drive = get_driver(Provider.S3)
        drive = S3Drive('access_key', 'secret_key')

        yield drive

@pytest.mark.skip(reason="FIX")
async def test_ListJupyterDrives_s3_success(jp_fetch, s3_base):
    with mock_aws(): 
        # extract S3 drive
        drive = s3_base

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
        assert "jupyter-drives-test-bucket-1" in payload["data"]
        assert "jupyter-drives-test-bucket-2" in payload["data"]

async def test_ListJupyterDrives_s3_empty_list(jp_fetch, s3_base):
    with mock_aws(): 
        # extract S3 drive
        drive = s3_base

        # When
        response = await jp_fetch("jupyter-drives", "drives")

        # Then
        assert response.code == 200
        payload = json.loads(response.body)
        assert len(payload) == 0 

@pytest.mark.skip(reason="FIX")
async def test_ListJupyterDrives_s3_missing_credentials(jp_fetch, s3_base):
    with mock_aws(): 
        # When
        with pytest.raises(tornado.web.HTTPError) as exc_info:
            response = await jp_fetch("jupyter-drives", "drives")

        # Then
        assert exc_info.value.reason == "No AWS credentials specified. Please set them in your user jupyter_server_config file."

@pytest.mark.skip(reason="FIX")
async def test_MountJupyterDriveHandler(jp_fetch, s3_base):
    with mock_aws():
        drive = s3_base

        # Create test container to mount
        test_bucket_name_1 = "jupyter-drives-test-bucket-1"
        drive.create_container(test_bucket_name_1)

        # When
        body = {"drive_name": test_bucket_name_1}
        response = await jp_fetch("jupyter-drives", "drives", body = json.dumps(body), method = "POST")

        assert response["code"] == 201

@pytest.mark.skip(reason="ToBeImplemented")
async def test_UnmountJupyterDriveHandler(jp_fetch, s3_base):
    with mock_aws():
        # extract S3 drive
        drive = s3_base

        # Create test container to mount
        test_bucket_name_1 = "jupyter-drives-test-bucket-1"
        drive.create_container(test_bucket_name_1)

        # When
        body = {"drive_name": "jupyter-drives-test-bucket-1", "mount_drive": "false" }
        response = await jp_fetch("jupyter-drives", "drives", body = json.dumps(body), method = "POST")

        assert response["code"] == 204
