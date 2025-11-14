'use client'

import React from 'react'
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useParams } from 'next/navigation';
import { useChatRuntime } from '@/lib/integration/client/chat/chat-runtime';

function ChatPage() {
  const params = useParams()
  const conversationId = params.conversationId as string
  const {runtime, status} = useChatRuntime(conversationId)

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className='h-screen pt-16 md:pt-0'>
        {typeof(status) == 'string' ? (
          // Show error state if conversation failed to load
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-red-500 text-2xl">😕</div>
              <h2 className="text-xl font-semibold text-gray-800">Oops!</h2>
              <p className="text-gray-600">{status}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary/85 hover:bg-primary text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          // Show main chat interface with loading skeleton when needed
          <Thread isLoading={typeof(status) == 'undefined'} />
        )}
      </div>
    </AssistantRuntimeProvider>
  )
}

export default ChatPage