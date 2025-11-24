'use client'

import { useState } from 'react'

interface MobileBottomNavProps {
  onShowBoard: () => void
  onShowProperties: () => void
  onShowHistory: () => void
  onShowChat: () => void
  unreadChatCount?: number
}

export default function MobileBottomNav({
  onShowBoard,
  onShowProperties,
  onShowHistory,
  onShowChat,
  unreadChatCount = 0,
}: MobileBottomNavProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const handleTabClick = (tab: string, callback: () => void) => {
    if (activeTab === tab) {
      setActiveTab(null)
    } else {
      setActiveTab(tab)
      callback()
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Tablero */}
        <button
          onClick={() => handleTabClick('board', onShowBoard)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'board' ? 'text-blue-600' : 'text-gray-600'
          }`}
          title="Vista del Tablero"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-xs font-medium">Tablero</span>
        </button>

        {/* Propiedades */}
        <button
          onClick={() => handleTabClick('properties', onShowProperties)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'properties' ? 'text-green-600' : 'text-gray-600'
          }`}
          title="Mis Propiedades"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Propiedades</span>
        </button>

        {/* Historial */}
        <button
          onClick={() => handleTabClick('history', onShowHistory)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'history' ? 'text-purple-600' : 'text-gray-600'
          }`}
          title="Historial"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium">Historial</span>
        </button>

        {/* Chat */}
        <button
          onClick={() => handleTabClick('chat', onShowChat)}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
            activeTab === 'chat' ? 'text-blue-600' : 'text-gray-600'
          }`}
          title="Chat"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadChatCount > 0 && (
            <span className="absolute top-0 right-1/4 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
          <span className="text-xs font-medium">Chat</span>
        </button>
      </div>
    </nav>
  )
}

