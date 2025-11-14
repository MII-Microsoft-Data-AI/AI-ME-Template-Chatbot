'use client'

const BaseAPIPath = "/api/be/"

export interface Attachment {
  id: string
  filename: string
  created_at: number
  url: string
}

export interface AttachmentsResponse {
  userid: string
  count: number
  attachments: Attachment[]
}

/**
 * Attachment API client for managing attachments
 */
export const AttachmentAPI = {
  /**
   * Get all attachments for the current user
   */
  async getAllAttachments(): Promise<AttachmentsResponse> {
    const response = await fetch(`${BaseAPIPath}api/v1/attachments/`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch attachments: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Get attachment details including temporary blob URL with SAS token
   * 
   * @param attachmentId - The attachment ID (from file://{id} URL)
   */
  async getAttachment(attachmentId: string): Promise<{
    id: string
    filename: string
    blob_url: string
    userid: string
  }> {
    // Remove 'file://' prefix if present
    const cleanId = attachmentId.replace('file://', '').trim()

    const response = await fetch(`${BaseAPIPath}api/v1/attachments/${cleanId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to get attachment: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * Get just the blob URL for an attachment
   * 
   * @param attachmentId - The attachment ID (from file://{id} URL)
   */
  async getAttachmentBlobUrl(attachmentId: string): Promise<string> {
    const attachment = await this.getAttachment(attachmentId)
    return attachment.blob_url
  },

  /**
   * Delete an attachment
   * 
   * @param attachmentId - The attachment ID to delete
   */
  async deleteAttachment(attachmentId: string): Promise<{
    message: string
    attachment_id: string
  }> {
    const response = await fetch(`${BaseAPIPath}api/v1/attachments/${attachmentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete attachment: ${response.statusText}`)
    }

    return response.json()
  },
}

/**
 * Get attachment details including a temporary blob URL with SAS token.
 * 
 * @param attachmentId - The attachment ID (from file://{id} URL)
 * @returns Promise with attachment details including blob_url
 */
export async function getAttachment(attachmentId: string): Promise<{
  id: string;
  filename: string;
  blob_url: string;
  userid: string;
}> {
  return AttachmentAPI.getAttachment(attachmentId)
}

/**
 * Get just the blob URL for an attachment.
 * 
 * @param attachmentId - The attachment ID (from file://{id} URL)
 * @returns Promise with the temporary blob URL
 */
export async function getAttachmentBlobUrl(attachmentId: string): Promise<string> {
  return AttachmentAPI.getAttachmentBlobUrl(attachmentId)
}
