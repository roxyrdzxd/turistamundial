'use client'

import Link from 'next/link'

export default function FloatingCreateButton() {
  return (
    <Link
      href="/lobby/create"
      className="fixed bottom-20 right-4 z-40 md:hidden"
    >
      <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-4 border-white">
        <span className="text-3xl">➕</span>
      </button>
      <p className="text-center text-xs font-semibold text-white mt-2 bg-black/50 rounded-full px-3 py-1">
        Crear Partida
      </p>
    </Link>
  )
}

