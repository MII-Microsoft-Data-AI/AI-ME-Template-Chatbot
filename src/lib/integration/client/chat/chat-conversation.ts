'use client'

import {  ThreadMessage } from "@assistant-ui/react";
import { formatRelativeTime } from "@/utils/date-utils";
import { loadFromLanggraphStateHistoryJSON } from "@/utils/langgraph/to-assistant-ui";

const BaseAPIPath = "/api/be"


// Get Last Conversation ID from A User
// The userid is obtained from the session in the backend
// Being passed on "userid" header to the backend
export async function GetLastConversationId(): Promise<string | null> {
  const response = await fetch(`${BaseAPIPath}/last-conversation-id`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.lastConversationId;
  } else {
    console.error('Failed to fetch last conversation ID');
    return null;
  }
}

type LoadHistoryResponseType = { message: ThreadMessage, parentId: string | null }[] | null

export const LoadConversationHistory = async (conversationId: string): Promise<LoadHistoryResponseType> => {

  console.log("Loading conversation history for ID:", conversationId)

  const response = await fetch(`${BaseAPIPath}/conversations/${conversationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  try {

    if (!response.ok) {
      if (response.status === 404) {
        // Conversation not found, set error and return empty messages
        console.error('Conversation not found')
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resMsg = await response.json();
    const messageData = loadFromLanggraphStateHistoryJSON(resMsg);

    // @ts-expect-error // TypeScript is not able to infer the type correctly here
    return messageData;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return null;
  }
}

type ConversationListItem = {
  id: string;
  title: string;
  date: string;
  createdAt: number;
  isPinned: boolean;
}

export const GetConversationsList = async (): Promise<ConversationListItem[] | null> => {

  interface ConversationApiResponse {
    id: string
    title: string
    last_used_at: number
    is_pinned: boolean
  }


  const response = await fetch(`${BaseAPIPath}/conversations`)

  if (!response.ok) {
    console.error('Failed to fetch conversations list')
    return null
  }

  const data = await response.json() as ConversationApiResponse[]
  const conversations = data.map((conv) => ({
    id: conv.id,
    title: conv.title,
    date: formatRelativeTime(conv.last_used_at * 1000),
    createdAt: conv.last_used_at * 1000,
    isPinned: conv.is_pinned
  }))

  return conversations

}

export const TogglePinConversation = async (conversationId: string) => {
  const response = await fetch(`${BaseAPIPath}/conversations/${conversationId}/pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('Failed to toggle pin status')
    return false
  }
  return true
}

export const DeleteConversation = async (conversationId: string) => {
  const response = await fetch(`${BaseAPIPath}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error('Failed to delete conversation')
    return false
  }
  return true
}

export const RenameConversation = async (conversationId: string, newTitle: string) => {
  const response = await fetch(`${BaseAPIPath}/conversations/${conversationId}/rename`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      new_title: newTitle
    }),
  });
  
  if (!response.ok) {
    console.error('Failed to rename conversation')
    return false
  }
  return true
}