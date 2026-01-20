'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para iconos de Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface TreasureMapEditorProps {
  initialLat?: number
  initialLng?: number
  onLocationSelect: (lat: number, lng: number) => void
  height?: string
}

function MapContent({
  initialLat,
  initialLng,
  onLocationSelect,
}: {
  initialLat?: number
  initialLng?: number
  onLocationSelect: (lat: number, lng: number) => void
}) {
  const { MapContainer, TileLayer, Marker, useMapEvents } = typeof window !== 'undefined'
    ? require('react-leaflet')
    : { MapContainer: () => null, TileLayer: () => null, Marker: () => null, useMapEvents: () => null }

  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  )

  // Componente para escuchar clics en el mapa
  function MapClickHandler() {
    useMapEvents({
      click: (e: any) => {
        const { lat, lng } = e.latlng
        setSelectedLocation([lat, lng])
        onLocationSelect(lat, lng)
      },
    })
    return null
  }

  const defaultCenter: [number, number] = initialLat && initialLng
    ? [initialLat, initialLng]
    : [25.6866, -100.3161] // Monterrey por defecto

  return (
    <MapContainer
      center={defaultCenter}
      zoom={selectedLocation ? 15 : 13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler />
      {selectedLocation && (
        <Marker position={selectedLocation} />
      )}
    </MapContainer>
  )
}

export default function TreasureMapEditor({
  initialLat,
  initialLng,
  onLocationSelect,
  height = '400px',
}: TreasureMapEditorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300" style={{ height }}>
      <MapContent
        initialLat={initialLat}
        initialLng={initialLng}
        onLocationSelect={onLocationSelect}
      />
    </div>
  )
}
