'use client'

import {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
  CompositeAttachmentAdapter,
} from "@assistant-ui/react";

const BaseAPIPath = "/api/be/"

/**
 * Get attachment details including a temporary blob URL with SAS token.
 * 
 * @param attachmentId - The attachment ID (from file://{id} URL)
 * @returns Promise with attachment details including blob_url
 */
export async function getAttachmentLink(attachmentId: string): Promise<{
  id: string;
  filename: string;
  blob_url: string;
  userid: string;
}> {
  // Remove 'file://' prefix if present
  const cleanId = attachmentId.replace('file://', '').trim();
  
  const response = await fetch(`${BaseAPIPath}/api/v1/attachments/${cleanId}`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get attachment: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Get just the blob URL for an attachment.
 * 
 * @param attachmentId - The attachment ID (from file://{id} URL)
 * @returns Promise with the temporary blob URL
 */
export async function getAttachmentBlobUrl(attachmentId: string): Promise<string> {
  const attachment = await getAttachmentLink(attachmentId);
  return attachment.blob_url;
}

class VisionImageAdapter implements AttachmentAdapter {
  accept = "image/jpeg,image/png,image/webp,image/gif";

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate file size (e.g., 20MB limit for most LLMs)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new Error("Image size exceeds 20MB limit");
    }
    // Return pending attachment while processing
    return {
      id: crypto.randomUUID(),
      type: "image",
      name: file.name,
      contentType: file.type,
      file,
      status: { 
        type: "running",
        reason: "uploading",
        progress: 0
      },
    };
  }
  
  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    try {
      // Upload image to backend
      const formData = new FormData();
      formData.append('file', attachment.file);
      
      const response = await fetch(`${BaseAPIPath}/api/v1/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload attachment: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Return in assistant-ui format with file:// URL
      return {
        id: attachment.id,
        type: "image",
        name: attachment.name,
        contentType: attachment.contentType || "image/jpeg",
        content: [
          {
            type: "image",
            image: data.url, // file://{id} format from backend
          },
        ],
        status: { type: "complete" },
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }
  
  async remove(_attachment: PendingAttachment): Promise<void> {
    // Cleanup if needed (e.g., delete from backend)
    // Could implement DELETE request to backend if needed
  }
}



export const compositeAttachmentAdapter = new CompositeAttachmentAdapter([
  new VisionImageAdapter()
])