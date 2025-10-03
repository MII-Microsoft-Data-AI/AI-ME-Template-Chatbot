import os
import uuid
import logging
from typing import List, Annotated
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from lib.database import db_manager, FileMetadata
from datetime import datetime, timedelta

from lib.search import get_search_client
from lib.blob import get_blob_service_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

chunk_route = APIRouter()
security = HTTPBasic()

# Pydantic models for request/response
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str

class FileListResponse(BaseModel):
    files: List[FileMetadata]

class FileDeleteResponse(BaseModel):
    file_id: str
    message: str
    success: bool

class ChunkDetailResponse(BaseModel):
    content: str
    metadata: dict
    file_url: str



@chunk_route.get("/chunk/{chunk_id}", response_model=ChunkDetailResponse)
def get_chunk_detail(
    chunk_id: str,
    credentials: HTTPBasicCredentials = Depends(security),
    userid: Annotated[str | None, Header()] = None,
):
    """
    Use Azure AI Search to get the chunk detail by chunk_id.
    and then return the chunk content and metadata.
    Also add a temporary Blob link using SAS Token to the original file if possible. Using the file_id field in the chunk metadata.
    """
    try:
        # Verify authentication
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        user_id = userid
        
        # Get chunk from Azure AI Search
        search_client = get_search_client()
        results = list(search_client.search(
            search_text="*",
            filter=f"id eq '{chunk_id}'",
            top=1
        ))
        
        if not results:
            raise HTTPException(status_code=404, detail="Chunk not found")
        
        chunk = results[0]
        content = chunk['content']
        metadata = dict(chunk)  # Convert to dict for response
        
        # Extract file_id from metadata
        file_id = metadata.get('file_id')
        if not file_id:
            raise HTTPException(status_code=404, detail="File ID not found in chunk metadata")
        
        # Get file metadata from database
        file_metadata = db_manager.get_file(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user owns the file
        if file_metadata.userid != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate SAS token for the blob
        blob_service = get_blob_service_client()
        container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
        blob_client = blob_service.get_blob_client(
            container=container_name,
            blob=file_metadata.blob_name
        )
        
        # Generate SAS URL with read permission, expires in 1 hour
        sas_token = generate_blob_sas(
            account_name=blob_service.account_name,
            container_name=container_name,
            blob_name=file_metadata.blob_name,
            account_key=blob_service.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        
        file_url = f"https://{blob_service.account_name}.blob.core.windows.net/{container_name}/{file_metadata.blob_name}?{sas_token}"
        
        return ChunkDetailResponse(
            content=content,
            metadata=metadata,
            file_url=file_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chunk detail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get chunk detail: {str(e)}")