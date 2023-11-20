import json
from unittest.mock import patch

import pytest
import tornado
import os

from moto import mock_s3
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver

@pytest.fixture(scope="module")
def aws_credentials():
    """AWS credentials for testing purposes."""
    os.environ["AWS_ACCCESS_KEY_ID"] = "12345"
    os.environ["AWS_SECRET_KEY"] = "123456789"

@pytest.fixture
async def test_ListJupyterDrives(jp_fetch, aws_credentials, caplog):
    with mock_s3(): 
        S3Drive = get_driver(Provider.S3)
        drive = S3Drive('access_key', 'secret_key')

        test_bucket_name_1 = "jupyter-drives-test-bucket-1"
        test_bucket_name_2 = "jupyter-drives-test-bucket-2"

        # Create some test containers
        drive.create_container(test_bucket_name_1)
        drive.create_container(test_bucket_name_2)

        # When
        response = await jp_fetch("jupyter-drives", "get-listDrives")

        # Then
        assert response.code == 200
        payload = json.loads(response.body)
        assert "jupyter-drives-test-bucket-1" in payload
        assert "jupyter-drives-test-bucket-2" in payload
