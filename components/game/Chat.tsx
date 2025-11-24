'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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
}

export default function Chat({ sessionId, currentUserId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
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
        async (payload) => {
          try {
            // Obtener el perfil del usuario
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', payload.new.user_id)
              .single()

            const newMessage: Message = {
              id: payload.new.id,
              message: payload.new.message,
              created_at: payload.new.created_at,
              profile: profile || { id: payload.new.user_id as string, username: 'Usuario', avatar_url: null },
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
              setUnreadCount((prev) => prev + 1)
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
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón flotante del chat */}
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

      {/* Panel del chat */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
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
                      {msg.profile.avatar_url ? (
                        <img
                          src={msg.profile.avatar_url}
                          alt={msg.profile.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                          {msg.profile.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Mensaje */}
                    <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-gray-500 mb-1 px-1">
                        {msg.profile.username}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          isOwn
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                      >
                        {msg.message}
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
    </div>
  )
}

