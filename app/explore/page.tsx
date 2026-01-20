'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TreasureMap from '@/components/explore/TreasureMap'
import Link from 'next/link'

export default function ExplorePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router, supabase])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <TreasureMap />
      
      {/* Botón para volver al dashboard */}
      <Link
        href="/dashboard"
        className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg hover:bg-white transition flex items-center gap-2 text-gray-800 font-semibold"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Volver
      </Link>
    </div>
  )
}
