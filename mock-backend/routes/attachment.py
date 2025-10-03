"""Attachment routes for multimodal chat input."""
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header, status
from pydantic import BaseModel

from lib.database import db_manager
from lib.blob import upload_file_to_blob, get_file_temporary_link, delete_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

attachment_routes = APIRouter()


# Pydantic models for request/response
class AttachmentUploadResponse(BaseModel):
    """Response model for attachment upload."""
    url: str  # file://{id}
    filename: str
    message: str


class AttachmentDetailResponse(BaseModel):
    """Response model for attachment details."""
    id: str
    filename: str
    blob_url: str
    conversation_id: str


@attachment_routes.post("/", response_model=AttachmentUploadResponse)
async def upload_attachment(
    file: UploadFile = File(...),
    conversation_id: str = Header(...),
    userid: str | None = Header(None)
):
    """
    Upload an attachment for a conversation.
    
    Args:
        file: The file to upload
        conversation_id: The conversation ID from header
        userid: User ID from header
        
    Returns:
        AttachmentUploadResponse with file://{id} URL
    """
    if not userid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="userid header is required"
        )
    
    try:
        # Generate unique IDs
        attachment_id = str(uuid.uuid4())
        blob_name = f"attachments/{userid}/{conversation_id}/{attachment_id}_{file.filename}"
        
        logger.info(f"Uploading attachment: {file.filename} for conversation {conversation_id}")
        
        # Upload to Azure Blob Storage
        file_content = await file.read()
        upload_file_to_blob(file_content, blob_name)
        
        # Add to attachment database record
        db_manager.create_attachment(
            attachment_id=attachment_id,
            conversation_id=conversation_id,
            filename=file.filename or "unknown",
            blob_name=blob_name
        )
        
        logger.info(f"Attachment uploaded successfully: {attachment_id}")
        
        # Return only the file ID in file:// format
        return AttachmentUploadResponse(
            url=f"file://{attachment_id}",
            filename=file.filename or "unknown",
            message="Attachment uploaded successfully"
        )
        
    except Exception as e:
        logger.error(f"Error uploading attachment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload attachment: {str(e)}"
        )


@attachment_routes.get("/{attachment_id}", response_model=AttachmentDetailResponse)
async def get_attachment_by_id(
    attachment_id: str,
    userid: str | None = Header(None)
):
    """
    Get attachment details by ID and return a temporary URL with SAS token.
    
    Args:
        attachment_id: The attachment ID
        userid: User ID from header
        
    Returns:
        AttachmentDetailResponse with blob URL (with SAS token)
    """
    if not userid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="userid header is required"
        )
    
    try:
        # Get from database
        attachment = db_manager.get_attachment(attachment_id)
        
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attachment not found: {attachment_id}"
            )
        
        # Get the blob with SAS token (valid for 1 hour)
        blob_url = get_file_temporary_link(attachment.blob_name, expiry=3600)
        
        return AttachmentDetailResponse(
            id=attachment.id,
            filename=attachment.filename,
            blob_url=blob_url,
            conversation_id=attachment.conversation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attachment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve attachment: {str(e)}"
        )


@attachment_routes.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    userid: str | None = Header(None)
):
    """
    Delete an attachment by ID.
    
    Args:
        attachment_id: The attachment ID
        userid: User ID from header
        
    Returns:
        Success message
    """
    if not userid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="userid header is required"
        )
    
    try:
        # Get from database
        attachment = db_manager.get_attachment(attachment_id)
        
        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attachment not found: {attachment_id}"
            )
        
        # Delete from blob storage
        delete_file(attachment.blob_name)
        
        # Delete from database
        db_manager.delete_attachment(attachment_id)
        
        logger.info(f"Attachment deleted successfully: {attachment_id}")
        
        return {
            "message": "Attachment deleted successfully",
            "attachment_id": attachment_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting attachment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete attachment: {str(e)}"
        )


@attachment_routes.get("/conversation/{conversation_id}")
async def get_conversation_attachments(
    conversation_id: str,
    userid: str | None = Header(None)
):
    """
    Get all attachments for a conversation.
    
    Args:
        conversation_id: The conversation ID
        userid: User ID from header
        
    Returns:
        List of attachments
    """
    if not userid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="userid header is required"
        )
    
    try:
        attachments = db_manager.get_conversation_attachments(conversation_id)
        
        return {
            "conversation_id": conversation_id,
            "attachments": [
                {
                    "id": att.id,
                    "filename": att.filename,
                    "created_at": att.created_at,
                    "url": f"file://{att.id}"
                }
                for att in attachments
            ]
        }
        
    except Exception as e:
        logger.error(f"Error retrieving conversation attachments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve attachments: {str(e)}"
        )