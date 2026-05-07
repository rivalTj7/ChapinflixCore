# azure_movies_blob.py
from __future__ import annotations

import os
from typing import BinaryIO

from azure.storage.blob import BlobServiceClient, ContentSettings
from pydantic_settings import BaseSettings, SettingsConfigDict


class AzureBlobSettings(BaseSettings):
    # Use the same var name you already export:
    #   $env:CONNECTION_STRING="DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
    connection_string: str = os.getenv("CONNECTION_STRING", "")
    # Container already created and named "movies"
    container_name: str = os.getenv("AZURE_MOVIES_CONTAINER", "movies")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


_settings = AzureBlobSettings()

_blob_svc: BlobServiceClient | None = None


def _svc() -> BlobServiceClient:
    global _blob_svc
    if _blob_svc is None:
        if not _settings.connection_string:
            raise RuntimeError("Missing CONNECTION_STRING for Azure Blob Storage.")
        _blob_svc = BlobServiceClient.from_connection_string(_settings.connection_string)
    return _blob_svc


def _container_client():
    return _svc().get_container_client(_settings.container_name)


def upload_movie_stream(blob_name: str, fileobj: BinaryIO, overwrite: bool = True) -> str:
    """
    Direct upload (no chunking) of an MP4 stream to the 'movies' container.
    Returns the public blob URL (no SAS).
    """
    if not blob_name.lower().endswith(".mp4"):
        raise ValueError("Blob name must end with .mp4")

    cc = _container_client()
    bc = cc.get_blob_client(blob_name)

    # Make sure stream is at position 0 (FastAPI's UploadFile.file supports seek)
    try:
        fileobj.seek(0)
    except Exception:
        pass

    bc.upload_blob(
        fileobj,
        overwrite=overwrite,
        content_settings=ContentSettings(content_type="video/mp4"),
    )

    # Return the regular blob URL; if your container is private, you’ll need SAS to stream.
    return f"https://{_svc().account_name}.blob.core.windows.net/{_settings.container_name}/{blob_name}"
