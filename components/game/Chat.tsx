'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import ReportUserButton from './ReportUserButton'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'

interface ChatMessageRow {
  id: string
  session_id: string
  user_id: string
  message: string
  created_at: string
}

interface Message {
  id: string
  message: string
  created_at: string
  profile: {
    id: string
    username: string
    avatar_url: string | null
  }
}

interface ChatProps {
  sessionId: string
  currentUserId: string
  onUnreadCountChange?: (count: number) => void
  forceOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export default function Chat({ sessionId, currentUserId, onUnreadCountChange, forceOpen, onOpenChange }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // Sincronizar con forceOpen prop
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen)
    }
  }, [forceOpen])
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Cargar mensajes iniciales
  useEffect(() => {
    fetchMessages()
  }, [sessionId])

  // Suscribirse a nuevos mensajes en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload: RealtimePostgresChangesPayload<ChatMessageRow>) => {
          try {
            // Verificar que payload.new existe y tiene los campos necesarios
            const newRow = payload.new as ChatMessageRow | null
            if (!newRow || !newRow.user_id || !newRow.id) {
              return
            }

            // Obtener el perfil del usuario
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', newRow.user_id)
              .single()

            const newMessage: Message = {
              id: newRow.id,
              message: newRow.message,
              created_at: newRow.created_at,
              profile: profile || { id: newRow.user_id, username: 'Usuario', avatar_url: null },
            }
            
            setMessages((prev) => {
              // Evitar duplicados
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
            
            scrollToBottom()
            
            // Incrementar contador de no leídos si el chat está cerrado
            if (!isOpen) {
              setUnreadCount((prev) => {
                const newCount = prev + 1
                onUnreadCountChange?.(newCount)
                return newCount
              })
            }
          } catch (error) {
            console.error('Error procesando nuevo mensaje:', error)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, isOpen, supabase])

  // Scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages/${sessionId}`)
      const data = await response.json()

      if (response.ok && data.messages) {
        setMessages(data.messages)
        scrollToBottom()
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: newMessage,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewMessage('')
      } else {
        console.error('Error enviando mensaje:', data.error)
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onOpenChange?.(newState)
    if (!isOpen) {
      setUnreadCount(0)
      onUnreadCountChange?.(0)
    }
  }
  
  // Notificar cambios en el contador
  useEffect(() => {
    onUnreadCountChange?.(unreadCount)
  }, [unreadCount, onUnreadCountChange])

  return (
    <>
      {/* Botón flotante del chat - Solo en desktop */}
      <div className="fixed bottom-4 right-4 z-50 hidden md:block">
        <button
          onClick={handleToggle}
          className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
          title="Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel del chat - Desktop */}
      {isOpen && (
        <div className="hidden md:flex fixed bottom-20 right-4 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex-col overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="font-semibold">Chat</h3>
            </div>
            <button
              onClick={handleToggle}
              className="text-white/80 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <p>No hay mensajes aún</p>
                <p className="text-xs mt-1">Sé el primero en escribir</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.profile.id === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <AvatarDisplay
                        avatarUrl={msg.profile.avatar_url}
                        username={msg.profile.username}
                        size="sm"
                      />
                    </div>

                    {/* Mensaje */}
                    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 text-xs mb-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-gray-500">{msg.profile.username}</span>
                        {!isOwn && (
                          <ReportUserButton
                            reportedUserId={msg.profile.id}
                            reportedUsername={msg.profile.username}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          isOwn
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <span className={isOwn ? 'text-white font-medium' : 'text-gray-900'}>
                          {msg.message}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={500}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {newMessage.length}/500
            </p>
          </form>
        </div>
      )}

      {/* Panel del chat - Mobile (pantalla completa) */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="font-semibold text-lg">Chat</h3>
            </div>
            <button
              onClick={handleToggle}
              className="text-white/80 hover:text-white transition p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 pb-20">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <p>No hay mensajes aún</p>
                <p className="text-xs mt-1">Sé el primero en escribir</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.profile.id === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <AvatarDisplay
                        avatarUrl={msg.profile.avatar_url}
                        username={msg.profile.username}
                        size="sm"
                      />
                    </div>

                    {/* Mensaje */}
                    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 text-xs mb-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-gray-500">{msg.profile.username}</span>
                        {!isOwn && (
                          <ReportUserButton
                            reportedUserId={msg.profile.id}
                            reportedUsername={msg.profile.username}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 text-base ${
                          isOwn
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <span className={isOwn ? 'text-white font-medium' : 'text-gray-900'}>
                          {msg.message}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Fixed en la parte inferior */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={500}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {newMessage.length}/500
            </p>
          </div>
        </div>
      )}
    </>
  )
}

