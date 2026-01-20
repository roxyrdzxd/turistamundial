'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import ShareBadgeModal from '@/components/badge/ShareBadgeModal'

interface PurchasedAvatar {
  id: string
  item_id: string
  is_equipped: boolean
  purchased_at: string
  item: {
    id: string
    name: string
    description: string
    image_url: string | null
    category: string
    data: any
  }
}

interface PurchasedColor {
  id: string
  item_id: string
  is_equipped: boolean
  purchased_at: string
  item: {
    id: string
    name: string
    description: string
    image_url: string | null
    category: string
    data: any
  }
}

export default function ProfilePage() {
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [purchasedAvatars, setPurchasedAvatars] = useState<PurchasedAvatar[]>([])
  const [purchasedColors, setPurchasedColors] = useState<PurchasedColor[]>([])
  const [equipping, setEquipping] = useState<string | null>(null)
  const [preferredColor, setPreferredColor] = useState<string | null>(null)
  const [collectedBadges, setCollectedBadges] = useState<any[]>([])
  const [loadingBadges, setLoadingBadges] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [sharingBadge, setSharingBadge] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    fetchProfile()
    fetchPurchasedAvatars()
    fetchReferralCode()
  }, [])

  const fetchReferralCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code)
      }
    } catch (error) {
      console.error('Error obteniendo código de referido:', error)
    }
  }

  // Ejecutar fetchBadges cuando user esté disponible
  useEffect(() => {
    if (user) {
      fetchBadges()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, preferred_color')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        toast.showToast('Error al cargar el perfil', 'error')
        return
      }

      // Si el perfil no existe, intentar crearlo
      if (!profile) {
        console.log('Profile does not exist, creating it for user:', currentUser.id)
        
        // Intentar usar la función ensure_user_profile
        const { error: createError } = await supabase.rpc('ensure_user_profile', {
          p_user_id: currentUser.id
        })

        if (createError) {
          console.error('Error creating profile with RPC:', createError)
          // Fallback: crear manualmente
          const defaultUsername = currentUser.user_metadata?.username || `Usuario${currentUser.id.substring(0, 8)}`
          const { error: manualCreateError } = await supabase
            .from('profiles')
            .insert({
              id: currentUser.id,
              username: defaultUsername,
            })

          if (manualCreateError) {
            console.error('Error creating profile manually:', manualCreateError)
            toast.showToast('Error al crear el perfil. Por favor recarga la página.', 'error')
            return
          }
        }

        // Intentar obtener el perfil nuevamente después de crearlo
        const { data: newProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', currentUser.id)
          .single()

        if (newProfile) {
          setUsername(newProfile.username || '')
          setAvatarUrl(newProfile.avatar_url)
          setPreferredColor(newProfile.preferred_color)
        } else if (fetchError) {
          console.error('Error fetching newly created profile:', fetchError)
          toast.showToast('Error al cargar el perfil', 'error')
        }
      } else {
        setUsername(profile.username || '')
        setAvatarUrl(profile.avatar_url)
        setPreferredColor(profile.preferred_color)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.showToast('Error al cargar el perfil', 'error')
    }
  }

  const fetchPurchasedAvatars = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Primero obtener todos los items de inventario del usuario
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('user_inventory')
        .select(`
          id,
          item_id,
          is_equipped,
          purchased_at,
          item:shop_items(
            id,
            name,
            description,
            image_url,
            category,
            data
          )
        `)
        .eq('user_id', currentUser.id)
        .order('purchased_at', { ascending: false })

      if (inventoryError) {
        console.error('Error obteniendo inventario:', inventoryError)
        return
      }

      // Filtrar items de categoría avatar
      const avatarItems = (inventoryItems || []).filter((item: any) => {
        return item.item && item.item.category === 'avatar'
      })

      // Filtrar items de categoría color
      const colorItems = (inventoryItems || []).filter((item: any) => {
        return item.item && item.item.category === 'color'
      })

      setPurchasedAvatars(avatarItems as PurchasedAvatar[])
      setPurchasedColors(colorItems as PurchasedColor[])
    } catch (error) {
      console.error('Error obteniendo avatares comprados:', error)
    }
  }

  const fetchBadges = async () => {
    if (!user) {
      return
    }
    setLoadingBadges(true)
    try {
      // Obtener las medallas del usuario
      const { data: badgesData, error: badgesError } = await supabase
        .from('user_treasure_badges')
        .select('id, collected_at, treasure_id')
        .eq('user_id', user.id)
        .order('collected_at', { ascending: false })

      if (badgesError) {
        console.error('Error obteniendo medallas:', badgesError)
        return
      }

      if (!badgesData || badgesData.length === 0) {
        setCollectedBadges([])
        return
      }

      // Obtener los IDs de los tesoros
      const treasureIds = badgesData.map((b: any) => b.treasure_id)

      // Obtener los tesoros con sus datos
      const { data: treasuresData, error: treasuresError } = await supabase
        .from('treasures')
        .select('id, name, badge_url, rarity')
        .in('id', treasureIds)

      if (treasuresError) {
        console.error('Error obteniendo tesoros:', treasuresError)
        return
      }

      // Combinar los datos
      const combinedData = badgesData.map((badge: any) => {
        const treasure = treasuresData?.find((t: any) => t.id === badge.treasure_id)
        return {
          id: badge.id,
          collected_at: badge.collected_at,
          treasure: treasure || null
        }
      })

      // Filtrar solo los que tienen badge_url
      const filteredData = combinedData.filter((item: any) => {
        return item.treasure && item.treasure.badge_url
      })

      setCollectedBadges(filteredData)
    } catch (error) {
      console.error('Error obteniendo medallas:', error)
    } finally {
      setLoadingBadges(false)
    }
  }

  const handleEquipAvatar = async (itemId: string) => {
    if (!user) return

    setEquipping(itemId)
    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al equipar avatar')
      }

      if (data.preferred_color) {
        toast.showToast('Color equipado correctamente', 'success')
        setPreferredColor(data.preferred_color)
      } else {
        toast.showToast('Avatar equipado correctamente', 'success')
      }
      
      // Actualizar estado local
      await fetchPurchasedAvatars()
      await fetchProfile()
    } catch (error: any) {
      console.error('Error equipando avatar:', error)
      toast.showToast(error.message || 'Error al equipar avatar', 'error')
    } finally {
      setEquipping(null)
    }
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el nombre de usuario')
      }

      toast.showToast('Nombre de usuario actualizado correctamente', 'success')
    } catch (error: any) {
      console.error('Error updating username:', error)
      toast.showToast(error.message || 'Error al actualizar el nombre de usuario', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.showToast('Por favor, selecciona una imagen válida', 'error')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.showToast('La imagen debe ser menor a 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      // Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Actualizar perfil con nueva URL
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el avatar')
      }

      setAvatarUrl(publicUrl)
      toast.showToast('Avatar actualizado correctamente', 'success')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.showToast(error.message || 'Error al subir el avatar', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition"
            >
              <span>←</span>
              <span>Volver al Dashboard</span>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 text-white">
              Mi Perfil
            </h1>
            <p className="text-white/80">Gestiona tu información personal y avatar</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Avatar Section */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-white">Avatar</h2>
                
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {uploading ? (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : (
                      <AvatarDisplay 
                        avatarUrl={avatarUrl} 
                        username={username}
                        size="md"
                      />
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  <button
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {uploading ? 'Subiendo...' : 'Cambiar Avatar'}
                  </button>

                  <p className="mt-4 text-xs text-white/60 text-center">
                    Formatos: JPG, PNG, GIF<br />
                    Tamaño máximo: 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Info Section */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-white">Información Personal</h2>

                <form onSubmit={handleUpdateUsername} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-white/20 rounded-xl bg-white/5 text-white/50 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-white/60">El email no se puede cambiar</p>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-white mb-2">
                      Nombre de Usuario
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={20}
                      className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-300 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50"
                      placeholder="Tu nombre de usuario"
                    />
                    <p className="mt-1 text-xs text-white/60">
                      {username.length}/20 caracteres
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !username.trim()}
                    className="group relative w-full bg-gradient-to-r from-cyan-500 to-pink-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>Guardar Cambios</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </form>

                {/* Account Info */}
                <div className="mt-8 pt-8 border-t border-white/20">
                  <h3 className="text-lg font-semibold mb-4 text-white">Información de la Cuenta</h3>
                  <div className="space-y-2 text-sm text-white/80">
                    <p>
                      <span className="font-semibold">ID de Usuario:</span>{' '}
                      <span className="font-mono text-xs">{user?.id}</span>
                    </p>
                    <p>
                      <span className="font-semibold">Miembro desde:</span>{' '}
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchased Avatars Section */}
          {purchasedAvatars.length > 0 && (
            <div className="mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Avatares Comprados</h2>
                  <Link
                    href="/shop"
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Ver Tienda →
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {purchasedAvatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 ${
                        avatar.is_equipped
                          ? 'border-green-400 shadow-lg bg-green-500/10'
                          : 'border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <AvatarDisplay
                          avatarUrl={avatar.item.image_url}
                          username={avatar.item.name}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-sm">{avatar.item.name}</h3>
                          {avatar.is_equipped && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-300 text-xs font-semibold rounded border border-green-400/30">
                              Equipado
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-white/70 mb-3 line-clamp-2">
                        {avatar.item.description}
                      </p>
                      
                      <button
                        onClick={() => handleEquipAvatar(avatar.item.id)}
                        disabled={avatar.is_equipped || equipping === avatar.item.id}
                        className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition ${
                          avatar.is_equipped
                            ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
                            : equipping === avatar.item.id
                            ? 'bg-cyan-500/20 text-cyan-300 cursor-wait border border-cyan-400/30'
                            : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-md'
                        }`}
                      >
                        {equipping === avatar.item.id
                          ? 'Equipando...'
                          : avatar.is_equipped
                          ? '✓ Equipado'
                          : 'Equipar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Purchased Colors Section */}
          {purchasedColors.length > 0 && (
            <div className="mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Colores Comprados</h2>
                  <Link
                    href="/shop"
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Ver Tienda →
                  </Link>
                </div>
                
                {preferredColor && (
                  <div className="mb-4 p-3 bg-cyan-500/20 border border-cyan-400/30 rounded-lg">
                    <p className="text-sm text-cyan-200">
                      <span className="font-semibold">Color actual:</span>{' '}
                      <span className="inline-flex items-center gap-2">
                        <span 
                          className="w-4 h-4 rounded-full border-2 border-white/30"
                          style={{
                            backgroundColor: preferredColor === 'red' ? '#ef4444' :
                                            preferredColor === 'blue' ? '#3b82f6' :
                                            preferredColor === 'green' ? '#10b981' :
                                            preferredColor === 'yellow' ? '#eab308' :
                                            preferredColor === 'purple' ? '#a855f7' :
                                            preferredColor === 'orange' ? '#f97316' :
                                            preferredColor === 'pink' ? '#ec4899' :
                                            preferredColor === 'cyan' ? '#06b6d4' : '#3b82f6'
                          }}
                        />
                        {preferredColor.charAt(0).toUpperCase() + preferredColor.slice(1)}
                      </span>
                    </p>
                    <p className="text-xs text-cyan-300/80 mt-1">
                      Este color se usará en tus próximas partidas
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {purchasedColors.map((color) => {
                    const colorData = color.item.data?.color || 'blue'
                    const isEquipped = color.is_equipped
                    const colorHex = colorData === 'rainbow' ? '#ec4899' : // pink para rainbow
                                     colorData === 'neon' ? '#06b6d4' : // cyan para neon
                                     colorData === 'red' ? '#ef4444' :
                                     colorData === 'blue' ? '#3b82f6' :
                                     colorData === 'green' ? '#10b981' :
                                     colorData === 'yellow' ? '#eab308' :
                                     colorData === 'purple' ? '#a855f7' :
                                     colorData === 'orange' ? '#f97316' :
                                     colorData === 'pink' ? '#ec4899' :
                                     colorData === 'cyan' ? '#06b6d4' : '#3b82f6'
                    
                    return (
                      <div
                        key={color.id}
                        className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 ${
                          isEquipped
                            ? 'border-green-400 shadow-lg bg-green-500/10'
                            : 'border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-12 h-12 rounded-full border-2 border-white/30 flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: colorHex }}
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-sm">{color.item.name}</h3>
                            {isEquipped && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-300 text-xs font-semibold rounded border border-green-400/30">
                                Equipado
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-white/70 mb-3 line-clamp-2">
                          {color.item.description}
                        </p>
                        
                        <button
                          onClick={() => handleEquipAvatar(color.item.id)}
                          disabled={isEquipped || equipping === color.item.id}
                          className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition ${
                            isEquipped
                              ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
                              : equipping === color.item.id
                              ? 'bg-cyan-500/20 text-cyan-300 cursor-wait border border-cyan-400/30'
                              : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-md'
                          }`}
                        >
                          {equipping === color.item.id
                            ? 'Equipando...'
                            : isEquipped
                            ? '✓ Equipado'
                            : 'Equipar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Medallas Recolectadas Section */}
          <div className="lg:col-span-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <h2 className="text-xl font-bold mb-6 text-white">Medallas Recolectadas</h2>
              
              {loadingBadges ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent"></div>
                </div>
              ) : collectedBadges.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60 mb-4">Aún no has recolectado ninguna medalla</p>
                  <p className="text-sm text-white/40">
                    Explora el mapa y recolecta tesoros para obtener medallas
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                  {collectedBadges.map((badge) => {
                    const treasure = badge.treasure
                    if (!treasure || !treasure.badge_url) return null
                    
                    const rarityColors = {
                      common: 'border-gray-400',
                      rare: 'border-blue-400',
                      epic: 'border-purple-400',
                      legendary: 'border-yellow-400'
                    }
                    
                    return (
                      <div
                        key={badge.id}
                        className="relative group"
                        title={treasure.name}
                      >
                        <div className={`w-16 h-16 rounded-full border-2 ${rarityColors[treasure.rarity as keyof typeof rarityColors] || 'border-white/20'} bg-white/10 p-1 hover:scale-110 transition-transform cursor-pointer`}>
                          <img 
                            src={treasure.badge_url} 
                            alt={treasure.name}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              // Si la imagen falla, mostrar placeholder
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Ccircle cx="32" cy="32" r="30" fill="%23ccc"/%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                        {/* Botón de compartir */}
                        <button
                          onClick={() => setSharingBadge(badge)}
                          className="absolute top-0 right-0 w-6 h-6 bg-cyan-500 hover:bg-cyan-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
                          title="Compartir medalla"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="font-semibold">{treasure.name}</div>
                          <div className="text-xs text-white/70 capitalize">{treasure.rarity}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {collectedBadges.length > 0 && (
                <p className="text-sm text-white/60 mt-4 text-center">
                  {collectedBadges.length} {collectedBadges.length === 1 ? 'medalla recolectada' : 'medallas recolectadas'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de compartir medalla */}
      {sharingBadge && referralCode && (
        <ShareBadgeModal
          badge={sharingBadge}
          userReferralCode={referralCode}
          username={username}
          onClose={() => setSharingBadge(null)}
        />
      )}
    </div>
  )
}

