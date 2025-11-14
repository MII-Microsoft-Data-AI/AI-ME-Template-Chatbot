'use client'

import { User } from "next-auth"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useChat } from "@/contexts/ChatContext"
import { useModal } from "@/contexts/ModalContext"
import MenuButton from "./MenuButton"
import Logo from "./Logo"
import ChatSearch from "./ChatSearch"
import ChatSkeleton from "./ChatSkeleton"
import { getSiteConfig, getPageTitle } from "@/lib/site-config"
import { SquarePen, PanelRightClose, PanelRightOpen } from "lucide-react"

interface GlobalNavbarProps {
  user: User
}

// Helper component to render chat group sections
interface ChatGroupProps {
  title: string
  chats: { id: string; title: string; date: string; createdAt: number; isPinned: boolean }[]
  onChatClick: (chatId: string) => void
  onTogglePin?: (chatId: string) => Promise<void>
  onDeleteChat?: (chatId: string) => Promise<void>
  onRenameChat?: (chatId: string, newTitle: string) => Promise<void>
  isCollapsed?: boolean
  isMobile?: boolean
}

function ChatGroup({ title, chats, onChatClick, onTogglePin, onDeleteChat, onRenameChat, isCollapsed = false, isMobile = false }: ChatGroupProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleRenameClick = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation()
    setEditingChatId(chatId)
    setEditingTitle(currentTitle)
  }

  const handleRenameSubmit = async (chatId: string) => {
    if (editingTitle.trim() && editingTitle !== chats.find(c => c.id === chatId)?.title && onRenameChat) {
      await onRenameChat(chatId, editingTitle.trim())
    }
    setEditingChatId(null)
    setEditingTitle('')
  }

  const handleRenameCancel = () => {
    setEditingChatId(null)
    setEditingTitle('')
  }

  if (chats.length === 0) return null

  if (isCollapsed) {
    // For collapsed desktop view, just show icons without grouping
    return (
      <>
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onChatClick(chat.id)}
            className="w-full p-2 rounded-lg hover:bg-gray-200 transition-colors flex justify-center relative"
            title={chat.title}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9.883 8a9.864 9.864 0 01-4.601-1.139L3 21l2.139-3.516C4.381 16.275 4 14.193 4 12c0-4.418 4.477-8 10-8s10 3.582 10 8z" />
            </svg>
            {chat.isPinned && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full transform translate-x-1 -translate-y-1"></div>
            )}
          </button>
        ))}
      </>
    )
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[var(--primary)] mb-2 px-2 flex items-center">
        {title}
        {title === "Pinned" && (
          <svg className="w-4 h-4 ml-1 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
          </svg>
        )}
      </h3>
      <div className="space-y-1">
        {chats.map((chat) => (
          <div key={chat.id} className={isMobile ? "group" : ""}>
            {editingChatId === chat.id ? (
              <div className="flex items-center space-x-2 p-3">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameSubmit(chat.id)
                    } else if (e.key === 'Escape') {
                      handleRenameCancel()
                    }
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ color: 'var(--foreground)' }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameSubmit(chat.id)
                  }}
                  className="text-gray-500 hover:text-green-600 p-1 transition-all"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameCancel()
                  }}
                  className="text-gray-500 hover:text-red-600 p-1 transition-all"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center justify-between p-3 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors ${isMobile ? "" : "group"}`}
                onClick={() => onChatClick(chat.id)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {isMobile && (
                    <div className="relative">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9.883 8a9.864 9.864 0 01-4.601-1.139L3 21l2.139-3.516C4.381 16.275 4 14.193 4 12c0-4.418 4.477-8 10-8s10 3.582 10 8z" />
                      </svg>
                      {chat.isPinned && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {!isMobile && chat.isPinned && (
                      <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                      </svg>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{chat.title}</p>
                      {isMobile && <p className="text-xs text-gray-500">{chat.date}</p>}
                      {!isMobile && <p className="text-xs text-gray-500 mt-1">{chat.date}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {onRenameChat && (
                    <button
                      onClick={(e) => handleRenameClick(e, chat.id, chat.title)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-500 p-1 transition-all"
                      title="Rename chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {onTogglePin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await onTogglePin(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-yellow-500 p-1 transition-all"
                      title={chat.isPinned ? "Unpin chat" : "Pin chat"}
                    >
                      <svg className="w-4 h-4" fill={chat.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  )}
                  {
                    onDeleteChat &&
                    <button
                      onClick={async (e) => {e.stopPropagation(); await onDeleteChat(chat.id)}}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-700 p-1 transition-all"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  }
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GlobalNavbar({ user }: GlobalNavbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { getGroupedChatHistory, togglePinChat, deleteChat, renameChat, isInitialLoading } = useChat()
  const { showConfirmation } = useModal()
  const router = useRouter()
  const pathname = usePathname()
  const siteConfig = getSiteConfig()

  // Load isPinned state from localStorage on component mount
  useEffect(() => {
    const savedPinnedState = localStorage.getItem('sidebarPinned')
    if (savedPinnedState) {
      setIsPinned(JSON.parse(savedPinnedState))
    }
  }, [])

  // Save isPinned state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned))
  }, [isPinned])

  // Custom signOut function that clears localStorage and redirects to signout page
  const handleSignOut = () => {
    localStorage.removeItem('sidebarPinned')
    router.push('/auth/signout')
  }

  // Get grouped chat history
  const groupedChats = getGroupedChatHistory()

  // Handle delete with confirmation popup
  const handleDeleteChat = async (chatId: string) => {
    const allChats = [
      ...groupedChats.pinned,
      ...groupedChats.today,
      ...groupedChats.yesterday,
      ...groupedChats.previous7Days,
      ...groupedChats.previous30Days,
      ...groupedChats.older
    ]
    const chat = allChats.find(c => c.id === chatId)
    if (chat) {
      showConfirmation({
        chatId,
        chatTitle: chat.title,
        message: `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
        onConfirm: () => deleteChat(chatId)
      })
    }
  }

  // Get mobile title based on current page - use centralized function
  const getMobileTitle = () => {
    if (pathname.startsWith('/chat')) {
      // For chat pages, find current chat title or use "New Chat"
      const chatId = pathname.split('/chat/')[1]
      if (chatId) {
        const allChats = [
          ...groupedChats.pinned,
          ...groupedChats.today,
          ...groupedChats.yesterday,
          ...groupedChats.previous7Days,
          ...groupedChats.previous30Days,
          ...groupedChats.older
        ]
        const currentChat = allChats.find(chat => chat.id === chatId)

        if (currentChat) {
          // Truncate long titles for mobile view
          return currentChat.title.length > 20 ? currentChat.title.slice(0, 25) + '...' : currentChat.title
        }

        return "Chat"
      }
      return 'New Chat'
    }
    
    // Use centralized page title function for other pages
    return getPageTitle(pathname)
  }

  // Handle chat item click
  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`)
    setIsMobileSidebarOpen(false)
  }

  // Handle new chat
  const handleNewChat = () => {
    router.push('/chat')
    setIsMobileSidebarOpen(false)
  }

  // Close mobile sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-white/30 px-4 py-3 flex items-center justify-between shadow-sm w-screen" style={{ backgroundColor: 'var(--header-bg)' }}>
        {/* Burger Menu Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors border border-white/30"
          title="Open menu"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1 flex justify-center items-center">
          <h1 className="text-lg font-semibold text-white text-ellipsis">
            {getMobileTitle()}
          </h1>
        </div>

        {/* Spacer for balance */}
        <div className="w-10"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black transition-opacity duration-300 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Mobile Sidebar */}
          <div className="fixed inset-0 w-full text-white flex flex-col z-50 md:hidden transform transition-transform duration-300 ease-in-out translate-x-0 max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
            {/* Header with Close Button */}
            <div className="flex-shrink-0 p-4  flex items-center justify-between">
              <Logo showText={true} />
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Close menu"
                style={{ color: 'var(--foreground)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New Chat Button */}
            <div className="flex-shrink-0 p-4 pt-0">
              <button
                onClick={handleNewChat}
                className="w-full border border-gray-300 py-2.5 px-4 rounded-full flex items-center justify-center space-x-2 transition-colors hover:bg-gray-200"
                style={{ color: 'var(--foreground)' }}
              >
                <SquarePen className={`w-4 h-4 ${ isCollapsed ? "text-gray-400" : "text-gray-400"}`} />
                <span className="text-gray-500">New Chat</span>
              </button>
            </div>

            {/* Search Field */}
            <ChatSearch isMobile={true} onChatSelect={() => setIsMobileSidebarOpen(false)} />

            {/* Chat History - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-4">
                {isInitialLoading ? (
                  <>
                    <ChatSkeleton isMobile={true} count={4} />
                  </>
                ) : (
                  <>
                    <ChatGroup title="Pinned" chats={groupedChats.pinned} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                    <ChatGroup title="Today" chats={groupedChats.today} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                    <ChatGroup title="Yesterday" chats={groupedChats.yesterday} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                    <ChatGroup title="Previous 7 Days" chats={groupedChats.previous7Days} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                    <ChatGroup title="Previous 30 Days" chats={groupedChats.previous30Days} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                    <ChatGroup title="Older" chats={groupedChats.older} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} isMobile={true} />
                  </>
                )}
              </div>
            </div>

            {/* Menu Button */}
            <div className="flex-shrink-0 px-4 pb-4">
              <MenuButton isCollapsed={false} />
            </div>

            {/* User Profile Section */}
            <div className="flex-shrink-0 p-4 border-t border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex md:border-r border-gray-300 h-screen text-white flex-col transition-all duration-300 ease-in-out overflow-scroll overflow-x-clip no-scrollbar ${isCollapsed ? 'w-16' : 'w-80'
          }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--foreground)' }}
        onMouseEnter={() => !isPinned && setIsCollapsed(false)}
        onMouseLeave={() => !isPinned && setTimeout( () => {setIsCollapsed(true)}, 500) }
      >
        {/* Logo Section */}
        <div className="flex-shrink-0 p-4 space-y-5">
          <Logo showText={!isCollapsed} />
          {
            isCollapsed ? null :
              <div className="flex items-center justify-between">
                <h1 className="font-bold text-left text-[var(--primary)]">{siteConfig.name}</h1>
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                  style={{ color: 'var(--foreground)' }}
                >
                  {isPinned ? (
                    <PanelRightOpen className="w-4 h-4 text-gray-400" />
                  ) : (
                    <PanelRightClose className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
          }
        </div>

        {/* New Chat Button */}
        <div className="flex-shrink-0 p-4">
          <button
            onClick={handleNewChat}
            className={`w-full ${!isCollapsed && "border border-gray-300"}  ${isCollapsed ? "py-2" : "py-2 px-3"} rounded-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'} transition-colors hover:bg-gray-200`}
            style={{ color: 'var(--foreground)' }}
            title={isCollapsed ? 'New Chat' : ''}
            type="button"
          >
            <SquarePen className={`${isCollapsed ? "w-4 h-4" : "w-4 h-4"} ${ isCollapsed ? "text-gray-500" : "text-gray-400"}`}/>
            {!isCollapsed && <span className="text-gray-500">New Chat</span>}
          </button>
        </div>

        {/* Search Field */}
        <ChatSearch isCollapsed={isCollapsed} />

        {/* Chat History - Scrollable */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto min-h-0 px-4 modern-scrollbar">
            {isInitialLoading ? (
              <>
                <ChatSkeleton count={4} />
              </>
            ) : (
              <>
                <ChatGroup title="Pinned" chats={groupedChats.pinned} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
                <ChatGroup title="Today" chats={groupedChats.today} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
                <ChatGroup title="Yesterday" chats={groupedChats.yesterday} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
                <ChatGroup title="Previous 7 Days" chats={groupedChats.previous7Days} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
                <ChatGroup title="Previous 30 Days" chats={groupedChats.previous30Days} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
                <ChatGroup title="Older" chats={groupedChats.older} onChatClick={handleChatClick} onTogglePin={togglePinChat} onDeleteChat={handleDeleteChat} onRenameChat={renameChat} />
              </>
            )}
          </div>
        )}

        {/* Collapsed Chat History - Show only icons */}
        {isCollapsed && (
          <div className="flex-1 overflow-y-auto min-h-0 px-2 py-4 my-2 no-scrollbar">
            <div className="space-y-2">
              {isInitialLoading ? (
                <ChatSkeleton isCollapsed={true} count={8} />
              ) : (
                <>
                  <ChatGroup title="" chats={groupedChats.pinned} onChatClick={handleChatClick} isCollapsed={true} />
                  <ChatGroup title="" chats={groupedChats.today} onChatClick={handleChatClick} isCollapsed={true} />
                  <ChatGroup title="" chats={groupedChats.yesterday} onChatClick={handleChatClick} isCollapsed={true} />
                  <ChatGroup title="" chats={groupedChats.previous7Days} onChatClick={handleChatClick} isCollapsed={true} />
                  <ChatGroup title="" chats={groupedChats.previous30Days} onChatClick={handleChatClick} isCollapsed={true} />
                  <ChatGroup title="" chats={groupedChats.older} onChatClick={handleChatClick} isCollapsed={true} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Menu Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-300 sticky bottom-0" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <div className="flex-shrink-0 pb-4">
            <MenuButton isCollapsed={isCollapsed} />
          </div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-3">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}