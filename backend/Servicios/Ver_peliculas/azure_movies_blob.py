# azure_movies_blob.py
import os
from datetime import datetime, timedelta
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions

_CONN = os.getenv("CONNECTION_STRING", "")
_CONTAINER = os.getenv("AZURE_MOVIES_CONTAINER", "movies")

if not _CONN:
    raise RuntimeError("CONNECTION_STRING is required")

_bsc = BlobServiceClient.from_connection_string(_CONN)
_container = _bsc.get_container_client(_CONTAINER)

def blob_url(blob_name: str) -> str:
    # non-SAS (private) url
    acct = _bsc.account_name
    return f"https://{acct}.blob.core.windows.net/{_CONTAINER}/{blob_name}"

def generate_read_sas_url(blob_name: str, minutes: int = 30) -> str:
    acct = _bsc.account_name
    sas = generate_blob_sas(
        account_name=acct,
        container_name=_CONTAINER,
        blob_name=blob_name,
        account_key=_bsc.credential.account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.utcnow() + timedelta(minutes=minutes),
    )
    return f"{blob_url(blob_name)}?{sas}"

def download_blob_to_path(blob_name: str, dst_path: str) -> None:
    """
    Server-side download using SDK (we already have account key).
    """
    bc = _container.get_blob_client(blob_name)

    # NEW: ensure the folder for dst_path exists
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)

    with open(dst_path, "wb") as f:
        data = bc.download_blob()
        data.readinto(f)  # streams to file

