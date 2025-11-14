// Site configuration settings
export interface SiteConfig {
  name: string
  title: string
  description: string
  url: string
  keywords: string[]
  favicon: string
  logo: {
    src: string // Image path or URL
    alt: string
    width?: number
    height?: number
  }
  social: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  navigation: {
    sidebar: NavigationItem[]
    menu: NavigationItem[]
  }
  chat: {
    greeting: {
      morning: string
      afternoon: string
      evening: string
    }
    welcomeMessage: string
    recommendationQuestions: string[]
    messageLimit: number // Number of messages to fetch per request
  }
}

export interface NavigationItem {
  id: string
  label: string
  path: string
  icon: {
    name: string
    svg: string
  }
  description?: string
  isExternal?: boolean
  showInSidebar?: boolean
  showInMenu?: boolean
  order?: number
}

// Default configuration - Customize these values to change your site branding
export const siteConfig: SiteConfig = {
  name: "MII Chat",
  title: "MII Chat - Your AI Assistant",
  description: "A ChatGPT-like AI assistant built with Next.js, React, and Assistant-UI. Supported by Mitra Integrasi Infromatika.",
  url: "https://chatgpt-clone.com", // Update with your actual domain
  keywords: ["chatgpt", "ai", "artificial intelligence", "chat", "assistant", "nextjs", "react"],
  favicon: "https://www.mii.co.id/cfind/source/images/logo.png",
  logo: {
    src: "https://www.mii.co.id/cfind/source/images/logo.png", // Change this to your logo path
    alt: "ChatGPT Clone Logo",
    width: 118,
    height: 24
  },
  social: {
    twitter: "@chatgptclone",
    github: "https://github.com/your-username/chatgpt-clone",
    // linkedin: "https://linkedin.com/company/your-company"
  },
  navigation: {
    sidebar: [
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: {
          name: 'chat',
          svg: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9.883 8a9.864 9.864 0 01-4.601-1.139L3 21l2.139-3.516C4.381 16.275 4 14.193 4 12c0-4.418 4.477-8 10-8s10 3.582 10 8z'
        },
        description: 'Start a new conversation',
        showInSidebar: true,
        showInMenu: true,
        order: 1
      },
      {
        id: 'resource-management',
        label: 'Resource Management',
        path: '/resource-management',
        icon: {
          name: 'folder',
          svg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        },
        description: 'Manage your resources and files',
        showInSidebar: false,
        showInMenu: true,
        order: 2
      },
      {
        id: 'attachments',
        label: 'My Attachments',
        path: '/attachments',
        icon: {
          name: 'attachment',
          svg: 'M15.172 7.172a4 4 0 11-5.656 0m0 0a4 4 0 015.656 0m0 0l2.828-2.828a2 2 0 11-2.828 2.828L9.172 9.172m0 0l-2.828 2.828'
        },
        description: 'View and manage your attachments',
        showInSidebar: false,
        showInMenu: true,
        order: 2.5
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: {
          name: 'settings',
          svg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
        },
        description: 'Configure your preferences',
        showInSidebar: false,
        showInMenu: true,
        order: 3
      }
    ],
    menu: [
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: {
          name: 'chat',
          svg: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.418 8-9.883 8a9.864 9.864 0 01-4.601-1.139L3 21l2.139-3.516C4.381 16.275 4 14.193 4 12c0-4.418 4.477-8 10-8s10 3.582 10 8z'
        },
        description: 'Start a new conversation',
        showInSidebar: true,
        showInMenu: true,
        order: 1
      },
      {
        id: 'resource-management',
        label: 'Resource Management',
        path: '/resource-management',
        icon: {
          name: 'folder',
          svg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        },
        description: 'Manage your resources and files',
        showInSidebar: false,
        showInMenu: true,
        order: 2
      },
      {
        id: 'attachments',
        label: 'My Attachments',
        path: '/attachments',
        icon: {
          name: 'attachment',
          svg: 'M15.172 7.172a4 4 0 11-5.656 0m0 0a4 4 0 015.656 0m0 0l2.828-2.828a2 2 0 11-2.828 2.828L9.172 9.172m0 0l-2.828 2.828'
        },
        description: 'View and manage your attachments',
        showInSidebar: false,
        showInMenu: true,
        order: 2.5
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: {
          name: 'settings',
          svg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
        },
        description: 'Configure your preferences',
        showInSidebar: false,
        showInMenu: true,
        order: 3
      }
    ]
  },
  chat: {
    greeting: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening"
    },
    welcomeMessage: "I'm your AI assistant. Start a conversation by typing a message below or try one of these suggestions",
    messageLimit: 4, // Number of messages to fetch per request, must even number
    recommendationQuestions: [
      "What are the latest trends in web development?",
      "Help me write a professional email",
      "Explain quantum computing in simple terms",
      "Give me a recipe for chocolate chip cookies",
      "How do I improve my productivity?",
      "What's the difference between React and Vue?",
      "Help me plan a weekend trip",
      "Explain machine learning basics"
    ]
  }
}

// Function to get the site configuration
export function getSiteConfig(): SiteConfig {
  return siteConfig
}

// Helper functions for navigation
export function getNavigationItems(type: 'sidebar' | 'menu'): NavigationItem[] {
  const items = siteConfig.navigation[type]
  return items
    .filter(item => type === 'sidebar' ? item.showInSidebar : item.showInMenu)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function getNavigationItem(id: string): NavigationItem | undefined {
  const allItems = [...siteConfig.navigation.sidebar, ...siteConfig.navigation.menu]
  return allItems.find(item => item.id === id)
}

export function getPageTitle(pathname: string): string {
  // Handle chat pages specially
  if (pathname === '/chat' || pathname === '/') {
    return 'New Chat'
  }
  
  if (pathname.startsWith('/chat/')) {
    return 'Chat'
  }
  
  // Find matching navigation item
  const allItems = [...siteConfig.navigation.sidebar, ...siteConfig.navigation.menu]
  const matchingItem = allItems.find(item => pathname.startsWith(item.path))
  
  return matchingItem?.label || 'Dashboard'
}