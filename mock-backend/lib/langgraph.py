"""LangGraph utility functions for message processing."""
import re
from typing import List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from lib.database import db_manager
from lib.blob import get_file_temporary_link


def change_file_to_url(messages: List[BaseMessage]) -> List[BaseMessage]:
    """
    Convert file://{id} URLs to temporary blob URLs with SAS tokens in all messages.
    
    This function inspects all messages and looks for image_url content with file:// URLs,
    then replaces them with temporary blob URLs (valid for 1 hour) before sending to AI.
    
    Args:
        messages: List of BaseMessage objects that may contain file:// URLs
        
    Returns:
        List[BaseMessage]: Messages with file:// URLs replaced by blob URLs with SAS tokens
    """
    processed_messages = []
    
    for message in messages:
        # Create a copy of the message to avoid modifying the original
        if isinstance(message, HumanMessage):
            processed_message = process_human_message(message)
        elif isinstance(message, AIMessage):
            processed_message = process_ai_message(message)
        elif isinstance(message, SystemMessage):
            # System messages typically don't have images
            processed_message = message
        else:
            # For other message types, keep as is
            processed_message = message
            
        processed_messages.append(processed_message)
    
    return processed_messages


def process_human_message(message: HumanMessage) -> HumanMessage:
    """
    Process HumanMessage to convert file:// URLs to blob URLs.
    
    Args:
        message: HumanMessage that may contain file:// URLs
        
    Returns:
        HumanMessage: Message with converted URLs
    """
    # Check if message has content attribute
    if not hasattr(message, 'content'):
        return message
    
    content = message.content
    
    # If content is a string, no images to process
    if isinstance(content, str):
        return message
    
    # If content is a list (multimodal content)
    if isinstance(content, list):
        new_content = []
        
        for item in content:
            if isinstance(item, dict):
                # Check if this is an image_url type
                if item.get('type') == 'image_url':
                    new_item = process_image_url_item(item)
                    new_content.append(new_item)
                else:
                    # Keep other content types as is (text, etc.)
                    new_content.append(item)
            else:
                new_content.append(item)
        
        # Create new HumanMessage with updated content
        return HumanMessage(
            content=new_content,
            additional_kwargs=message.additional_kwargs if hasattr(message, 'additional_kwargs') else {},
            id=message.id if hasattr(message, 'id') else None
        )
    
    return message


def process_ai_message(message: AIMessage) -> AIMessage:
    """
    Process AIMessage to convert file:// URLs to blob URLs.
    
    Note: AI messages typically don't have file:// URLs, but we process them
    for completeness in case they're present in the content.
    
    Args:
        message: AIMessage that may contain file:// URLs
        
    Returns:
        AIMessage: Message with converted URLs
    """
    # Check if message has content attribute
    if not hasattr(message, 'content'):
        return message
    
    content = message.content
    
    # If content is a string, no images to process
    if isinstance(content, str):
        return message
    
    # If content is a list (multimodal content)
    if isinstance(content, list):
        new_content = []
        
        for item in content:
            if isinstance(item, dict):
                # Check if this is an image_url type
                if item.get('type') == 'image_url':
                    new_item = process_image_url_item(item)
                    new_content.append(new_item)
                else:
                    new_content.append(item)
            else:
                new_content.append(item)
        
        # Create new AIMessage with updated content
        return AIMessage(
            content=new_content,
            additional_kwargs=message.additional_kwargs if hasattr(message, 'additional_kwargs') else {},
            id=message.id if hasattr(message, 'id') else None
        )
    
    return message


def process_image_url_item(item: dict) -> dict:
    """
    Process a single image_url content item to convert file:// URL to blob URL.
    
    Expected input format:
    {
        "type": "image_url",
        "image_url": {
            "url": "file://{attachment_id}"
        }
    }
    
    Output format:
    {
        "type": "image_url",
        "image_url": {
            "url": "https://storage.blob.core.windows.net/...?sas_token"
        }
    }
    
    Args:
        item: Dictionary containing image_url content
        
    Returns:
        dict: Updated item with blob URL
    """
    try:
        # Get the URL from the nested structure
        image_url_obj = item.get('image_url', {})
        url = image_url_obj.get('url', '')
        
        # Check if it's a file:// URL
        if url.startswith('file://'):
            # Extract attachment ID and sanitize it
            attachment_id = url.replace('file://', '')
            # Remove trailing slashes and whitespace
            attachment_id = attachment_id.rstrip('/').strip()
            
            if not attachment_id:
                # Empty ID after sanitization
                print(f"Warning: Empty attachment ID after sanitization from URL: {url}")
                return item

            # Get attachment from database
            attachment = db_manager.get_attachment(attachment_id)
            
            if attachment:
                # Get temporary blob URL with SAS token (valid for 1 hour)
                blob_url = get_file_temporary_link(attachment.blob_name, expiry=3600)
                
                # Return updated item with blob URL
                return {
                    'type': 'image_url',
                    'image_url': {
                        'url': blob_url,
                        # Preserve any additional fields
                        **{k: v for k, v in image_url_obj.items() if k != 'url'}
                    }
                }
            else:
                # Attachment not found, log warning and return original
                print(f"Warning: Attachment not found for ID: {attachment_id}")
                return item
        else:
            # Not a file:// URL, return as is (might be http/https URL)
            return item
            
    except Exception as e:
        # If any error occurs, log it and return original item
        print(f"Error processing image_url item: {e}")
        return item


def extract_file_ids_from_messages(messages: List[BaseMessage]) -> List[str]:
    """
    Extract all file:// IDs from messages.
    
    Useful for debugging or tracking which files are being used.
    
    Args:
        messages: List of BaseMessage objects
        
    Returns:
        List[str]: List of attachment IDs found in messages
    """
    file_ids = []
    
    for message in messages:
        if not hasattr(message, 'content'):
            continue
            
        content = message.content
        
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'image_url':
                    url = item.get('image_url', {}).get('url', '')
                    if url.startswith('file://'):
                        file_id = url.replace('file://', '')
                        file_ids.append(file_id)
    
    return file_ids
