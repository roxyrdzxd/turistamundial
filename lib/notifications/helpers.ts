// Funciones helper para enviar notificaciones desde diferentes partes de la aplicación

interface NotificationOptions {
  title: string
  body: string
  url?: string
  tag?: string
  requireInteraction?: boolean
}

/**
 * Envía una notificación push a un usuario
 * Esta función se llama desde el servidor (API routes)
 */
export async function sendPushNotification(
  userId: string,
  options: NotificationOptions
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: options.title,
        body: options.body,
        url: options.url || '/dashboard',
        tag: options.tag || 'turix-notification',
        requireInteraction: options.requireInteraction || false,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[sendPushNotification] Error:', error)
    }
  } catch (error) {
    console.error('[sendPushNotification] Error:', error)
  }
}

/**
 * Envía notificación cuando es el turno de un jugador
 */
export async function notifyPlayerTurn(
  userId: string,
  sessionId: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: '🎲 ¡Es tu turno!',
    body: 'Es tu momento de jugar. Tira los dados y avanza.',
    url: `/game/${sessionId}`,
    tag: `turn-${sessionId}`,
    requireInteraction: true,
  })
}

/**
 * Envía notificación cuando un amigo invita a una partida
 */
export async function notifyGameInvitation(
  userId: string,
  sessionId: string,
  inviterUsername: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: '🎮 Invitación a partida',
    body: `${inviterUsername} te ha invitado a una partida. ¡Únete ahora!`,
    url: `/lobby/${sessionId}`,
    tag: `invitation-${sessionId}`,
    requireInteraction: true,
  })
}

/**
 * Envía notificación cuando una partida está lista para iniciar
 */
export async function notifyGameReady(
  userId: string,
  sessionId: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: '✅ Partida lista',
    body: 'La partida está lista para comenzar. ¡Únete ahora!',
    url: `/lobby/${sessionId}`,
    tag: `game-ready-${sessionId}`,
    requireInteraction: true,
  })
}

/**
 * Envía notificación cuando se recibe una solicitud de amistad
 */
export async function notifyFriendRequest(
  userId: string,
  requesterUsername: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: '👥 Solicitud de amistad',
    body: `${requesterUsername} quiere ser tu amigo.`,
    url: '/dashboard',
    tag: 'friend-request',
    requireInteraction: false,
  })
}

/**
 * Envía notificación cuando se acepta una solicitud de amistad
 */
export async function notifyFriendAccepted(
  userId: string,
  friendUsername: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: '✅ Amistad aceptada',
    body: `${friendUsername} aceptó tu solicitud de amistad.`,
    url: '/dashboard',
    tag: 'friend-accepted',
    requireInteraction: false,
  })
}

