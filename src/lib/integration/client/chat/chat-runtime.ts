'use client'

import { AttachmentAdapter, CompleteAttachment, CompositeAttachmentAdapter, PendingAttachment, ThreadHistoryAdapter } from "@assistant-ui/react";
import { useCustomDataStreamRuntime } from "@/utils/custom-data-stream-runtime";
import { useState } from "react";
import { LoadConversationHistory } from "./chat-conversation";

const BaseAPIPath = "/api/be"

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
      formData.append('type', 'image')
      
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

class DocumentAdapter implements AttachmentAdapter {
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
      type: "document",
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
      formData.append('type', 'document')

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
        type: "document",
        name: attachment.name,
        contentType: attachment.contentType || "image/jpeg",
        content: [
          {
            type: "file",
            data: 'file://' + data.id, // file://{id} format from backend,
            mimeType: attachment.contentType,
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

// Chat API Runtime with Conversation ID parameters
// You need to provide the conversationId and historyAdapter
// The conversationId is obtained from the URL parameters
// The historyAdapter is used to load and append messages to the thread
type ErrorMessage = string
export const useChatRuntime = (conversationId?: string) => {
  console.log("Initializing chat runtime for conversation ID:", conversationId)
  const [status, setStatus] = useState<undefined | true | ErrorMessage>(true)

  let historyAdapter: ThreadHistoryAdapter | undefined = undefined
  if (typeof conversationId == 'string') {
    historyAdapter = {
      async load() {
        setStatus(undefined)
        try {
          const historyData = await LoadConversationHistory(conversationId);

          if (historyData === null) {
            setStatus('Failed to load conversation history')
            return { messages: [] };
          }

          if (historyData.length === 0) {
            setStatus(true)
            return { messages: [] };
          }
          setStatus(true)
          return { messages: historyData };
        } catch (error) {
          console.error('Failed to load conversation history:', error);
          setStatus('Failed to load conversation history')
          return { messages: [] };
        }
      },
      async append() {
        // The message will be saved automatically by your backend when streaming completes
        // You might want to implement this if you need to save messages immediately
      },
    }
  }

  const apiPath = conversationId ?
    `${BaseAPIPath}/conversations/${conversationId}/chat` :
    `${BaseAPIPath}/chat`

  const attachmentAdapter = new CompositeAttachmentAdapter([
    new VisionImageAdapter()
  ])

  const runtime = useCustomDataStreamRuntime({
    api: apiPath,
    adapters: {
      history: historyAdapter,
      attachments: attachmentAdapter,
    },
  })

  return {
    status,
    runtime
  }
}