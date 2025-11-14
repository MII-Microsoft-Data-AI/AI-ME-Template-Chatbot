'use client'

import React, {useState, useEffect} from 'react'
import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useAssistantState } from '@assistant-ui/react';
import { useRouter } from 'next/navigation';
import { GetLastConversationId } from '@/lib/integration/client/chat/chat-conversation';
import { useChatRuntime } from '@/lib/integration/client/chat/chat-runtime';

const autoRedirect = false

function RedirectWhenDone() {
  const router = useRouter()
  const [FirstRunning, setFirstRunning] = useState(false)
  const isRunning = useAssistantState(({ thread }) => thread.isRunning); // boolean


  async function getLastConversationIdAndRedirect() {
    // Fetch the last conversation and get its ID
    const conversationID = await GetLastConversationId()
    if (conversationID) {
      router.push('/chat/' + conversationID);
    } else {
      console.error('No conversation ID found, cannot redirect.');
    }
  }

  // Handle the redirection when the chat is done
  useEffect(() => {
    if (isRunning) {
      setFirstRunning(true)
    }

    if (!isRunning && FirstRunning && autoRedirect) {
      getLastConversationIdAndRedirect()
    }
  }, [isRunning])
  
  return <></>
}


function ChatPage() {

  const {runtime} = useChatRuntime()

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <RedirectWhenDone />
      <div className='h-screen pt-16 md:pt-0'>
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}

export default ChatPage