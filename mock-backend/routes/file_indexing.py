import os
import uuid
import logging
from typing import List, Annotated
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from lib.database import db_manager, FileMetadata
from orchestration import get_orchestrator

from lib.blob import get_blob_service_client
from lib.search import get_search_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

file_indexing_route = APIRouter()
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

@file_indexing_route.post("/", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    userid:  Annotated[str | None, Header()] = None,
    credentials: HTTPBasicCredentials = Depends(security)
):
    """Upload file to blob storage and start indexing workflow."""
    try:
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Generate unique file ID and blob name
        file_id = str(uuid.uuid4())
        blob_name = f"{userid}/{file_id}_{file.filename}"
        
        # Upload to Azure Blob Storage
        blob_service = get_blob_service_client()
        container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
        
        # Create container if it doesn't exist
        try:
            blob_service.create_container(container_name)
        except Exception:
            pass  # Container might already exist
        
        # Upload file
        blob_client = blob_service.get_blob_client(
            container=container_name, 
            blob=blob_name
        )
        
        file_content = await file.read()

        blob_client.upload_blob(file_content, overwrite=True)
        
        # Create file metadata in database
        file_metadata = db_manager.create_file(
            file_id=file_id,
            userid=userid,
            filename=file.filename,
            blob_name=blob_name
        )
        
        # Start orchestration workflow to index the file
        try:
            orchestrator = get_orchestrator()
            workflow_id = orchestrator.invoke_workflow(
                name="index_file_v1",
                file_id=file_id
            )
            
            # Update file metadata with workflow ID
            db_manager.update_file_workflow_id(file_id, workflow_id)
            logger.info(f"Started indexing workflow for file {file_id}, workflow_id: {workflow_id}")
        except Exception as e:
            logger.error(f"Failed to start indexing workflow: {str(e)}")
            # Update status to failed
            db_manager.update_file_status(file_id, "failed", f"Failed to start indexing: {str(e)}")
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            status="pending",
            message="File uploaded successfully and indexing started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@file_indexing_route.get("/", response_model=FileListResponse)
def list_files(credentials: HTTPBasicCredentials = Depends(security), userid:  Annotated[str | None, Header()] = None,):
    """List all files for the authenticated user with real-time workflow status."""
    try:
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        
        # Get user files from database
        files = db_manager.get_user_files(userid)
        
        # Update status for files with workflow IDs
        updated_files = []
        for file_metadata in files:
            if file_metadata.workflow_id:
                try:
                    orchestrator = get_orchestrator()
                    workflow_status = orchestrator.get_workflow_status(workflow_id=file_metadata.workflow_id)
                    
                    # Map workflow status to file status
                    new_status = file_metadata.status
                    new_error = file_metadata.error_message
                    
                    if workflow_status.get('status') == 'running':
                        new_status = 'in_progress'
                    elif workflow_status.get('status') == 'completed':
                        new_status = 'completed'
                    elif workflow_status.get('status') == 'failed':
                        new_status = 'failed'
                        new_error = workflow_status.get('error', 'Workflow failed')
                    
                    # Update database if status changed
                    if new_status != file_metadata.status:
                        db_manager.update_file_status(file_metadata.file_id, new_status, new_error)
                        file_metadata.status = new_status
                        file_metadata.error_message = new_error
                        
                except Exception as e:
                    logger.warning(f"Failed to get workflow status for {file_metadata.file_id}: {str(e)}")
                    # Continue with database status if workflow status check fails
            
            updated_files.append(file_metadata)
        
        return FileListResponse(files=updated_files)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@file_indexing_route.get("/{file_id}", response_model=FileMetadata)
def get_file_status(
    file_id: str,
    credentials: HTTPBasicCredentials = Depends(security),
    userid:  Annotated[str | None, Header()] = None,
):
    """Get the status of a specific file with real-time workflow status."""
    try:
        # Verify authentication
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        
        # Get file metadata
        file_metadata = db_manager.get_file(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user owns the file
        if file_metadata.userid != userid:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # If there's a workflow ID, check the workflow status
        if file_metadata.workflow_id:
            try:
                orchestrator = get_orchestrator()
                workflow_status = orchestrator.get_workflow_status(workflow_id=file_metadata.workflow_id)
                
                # Map workflow status to file status
                if workflow_status.get('status') == 'running':
                    if file_metadata.status != 'in_progress':
                        db_manager.update_file_status(file_id, 'in_progress')
                        file_metadata.status = 'in_progress'
                elif workflow_status.get('status') == 'completed':
                    if file_metadata.status != 'completed':
                        db_manager.update_file_status(file_id, 'completed')
                        file_metadata.status = 'completed'
                elif workflow_status.get('status') == 'failed':
                    error_msg = workflow_status.get('error', 'Workflow failed')
                    if file_metadata.status != 'failed':
                        db_manager.update_file_status(file_id, 'failed', error_msg)
                        file_metadata.status = 'failed'
                        file_metadata.error_message = error_msg
                        
            except Exception as e:
                logger.warning(f"Failed to get workflow status for {file_id}: {str(e)}")
                # Continue with database status if workflow status check fails
        
        return file_metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get file status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get file status: {str(e)}")

@file_indexing_route.delete("/{file_id}", response_model=FileDeleteResponse)
async def delete_file(
    file_id: str,
    credentials: HTTPBasicCredentials = Depends(security),
    userid:  Annotated[str | None, Header()] = None,
):
    """Delete indexed file, its embeddings, and blob storage."""
    try:
        # Verify authentication
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        user_id = userid

        # Get file metadata
        file_metadata = db_manager.get_file(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user owns the file
        if file_metadata.userid != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete from Azure AI Search (all chunks for this file)
        try:
            search_client = get_search_client()
            
            # Search for all documents with this file_id
            results = search_client.search(
                search_text="*",
                filter=f"file_id eq '{file_id}'"
            )
            
            # Delete all chunks
            doc_ids = [doc["id"] for doc in results]
            if doc_ids:
                search_client.delete_documents([{"id": doc_id} for doc_id in doc_ids])
                logger.info(f"Deleted {len(doc_ids)} chunks from search index for file {file_id}")
        except Exception as e:
            logger.warning(f"Failed to delete from search index: {str(e)}")
        
        # Delete from Azure Blob Storage
        try:
            blob_service = get_blob_service_client()
            container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
            blob_client = blob_service.get_blob_client(
                container=container_name,
                blob=file_metadata.blob_name
            )
            blob_client.delete_blob()
            logger.info(f"Deleted blob {file_metadata.blob_name}")
        except Exception as e:
            logger.warning(f"Failed to delete blob: {str(e)}")
        
        # Delete from database
        success = db_manager.delete_file(file_id, user_id)
        
        if success:
            return FileDeleteResponse(
                file_id=file_id,
                message="File and all associated data deleted successfully",
                success=True
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file from database")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@file_indexing_route.post("/{file_id}/reindex")
async def reindex_file(
    file_id: str,
    credentials: HTTPBasicCredentials = Depends(security),
    userid:  Annotated[str | None, Header()] = None,
):
    """Trigger re-indexing of a file."""
    try:
        # Verify authentication
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        user_id = userid
        
        # Get file metadata
        file_metadata = db_manager.get_file(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user owns the file
        if file_metadata.userid != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Reset status to pending
        db_manager.update_file_status(file_id, "pending")
        
        # Start indexing workflow
        orchestrator = get_orchestrator()
        workflow_id = orchestrator.invoke_workflow(
            name="index_file_v1",
            file_id=file_id
        )
        
        # Update file metadata with new workflow ID
        db_manager.update_file_workflow_id(file_id, workflow_id)
        logger.info(f"Started re-indexing workflow for file {file_id}, workflow_id: {workflow_id}")
        
        return {
            "file_id": file_id,
            "workflow_id": workflow_id,
            "message": "Re-indexing started successfully",
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start re-indexing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start re-indexing: {str(e)}")

@file_indexing_route.get("/{file_id}/workflow-status")
def get_workflow_status(
    file_id: str,
    credentials: HTTPBasicCredentials = Depends(security),
    userid:  Annotated[str | None, Header()] = None,
):
    """Get the workflow status for a specific file."""
    try:
        # Verify authentication
        if not userid:
            raise HTTPException(status_code=400, detail="Missing userid header")
        user_id = userid
        
        # Get file metadata
        file_metadata = db_manager.get_file(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user owns the file
        if file_metadata.userid != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if there's a workflow ID
        if not file_metadata.workflow_id:
            return {
                "file_id": file_id,
                "workflow_id": None,
                "status": "no_workflow",
                "message": "No workflow ID found for this file"
            }
        
        # Get workflow status from orchestrator
        try:
            orchestrator = get_orchestrator()
            workflow_status = orchestrator.get_workflow_status(workflow_id=file_metadata.workflow_id)
            return {
                "file_id": file_id,
                "workflow_id": file_metadata.workflow_id,
                "status": workflow_status.get('status', 'unknown'),
                "workflow_details": workflow_status
            }
        except Exception as e:
            return {
                "file_id": file_id,
                "workflow_id": file_metadata.workflow_id,
                "status": "error",
                "error": str(e),
                "message": "Failed to get workflow status"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")
