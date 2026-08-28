'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import apiService from '@/app/services/apiService'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────── */
interface CarLocation {
  car_id: number
  car_name: string
  plate_number: string
  car_image: string
  status: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  heading: number | null
  last_seen: string | null
  device_active: boolean
}

interface HistoryPoint {
  latitude: number
  longitude: number
  speed: number
  heading: number
  timestamp: string
}

/* ── Helpers ─────────────────────────────────────────── */
const isOnline = (last_seen: string | null) => {
  if (!last_seen) return false
  return Date.now() - new Date(last_seen).getTime() < 2 * 60 * 1000 // 2 min
}

const formatSpeed = (s: number | null) =>
  s !== null ? `${Math.round(s)} km/h` : '—'

const formatTime = (ts: string | null) => {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const headingToArrow = (h: number | null) => {
  if (h === null) return '●'
  const dirs = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  return dirs[Math.round(h / 45) % 8]
}

/* ── Map Component (Leaflet loaded client-side) ──────── */
function GPSMap({
  cars,
  selectedCar,
  history,
  onSelectCar,
}: {
  cars: CarLocation[]
  selectedCar: number | null
  history: HistoryPoint[]
  onSelectCar: (id: number) => void
}) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Record<number, any>>({})
  const polylineRef = useRef<any>(null)

  // Initialize map
useEffect(() => {
  if (!mapRef.current) return
  if (mapInstanceRef.current) return  // ← already initialized, skip

  const initMap = async () => {
    const L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')

    // Check again after async imports in case of race condition
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current!, {
      preferCanvas: true,  // better performance
    }).setView([17.015385, 54.090359], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    mapInstanceRef.current = map
  }

  initMap()

  // Cleanup on unmount
  return () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
  }
}, [])

  // useEffect(() => {
  //   if (mapInstanceRef.current || !mapRef.current) return

  //   const initMap = async () => {
  //     const L = (await import('leaflet')).default
  //     await import('leaflet/dist/leaflet.css')

  //     const map = L.map(mapRef.current!).setView([17.015385, 54.090359], 12)

  //     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  //       attribution: '© OpenStreetMap contributors',
  //     }).addTo(map)

  //     mapInstanceRef.current = map
  //   }

  //   initMap()
  // }, [])

  // Update markers when cars change
  useEffect(() => {
    const updateMarkers = async () => {
      const L = (await import('leaflet')).default
      if (!mapInstanceRef.current) return

      cars.forEach((car) => {
        if (car.latitude === null || car.longitude === null) return

        const online = isOnline(car.last_seen)
        const color = online ? '#22c55e' : '#ef4444'
        const isSelected = car.car_id === selectedCar

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              position:relative;
              width:${isSelected ? 44 : 36}px;
              height:${isSelected ? 44 : 36}px;
            ">
              <div style="
                width:100%;height:100%;
                background:${color};
                border-radius:50%;
                border:3px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
                font-size:18px;color:white;font-weight:bold;
              ">${headingToArrow(car.heading)}</div>
              ${isSelected ? `<div style="
                position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;
                border-radius:50%;border:2px solid ${color};
                animation:pulse 1.5s infinite;opacity:0.6;
              "></div>` : ''}
            </div>
          `,
          iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
        })

        if (markersRef.current[car.car_id]) {
          markersRef.current[car.car_id]
            .setLatLng([car.latitude, car.longitude])
            .setIcon(icon)
        } else {
          const marker = L.marker([car.latitude, car.longitude], { icon })
            .addTo(mapInstanceRef.current)
            .on('click', () => onSelectCar(car.car_id))

          marker.bindTooltip(
            `<b>${car.car_name}</b><br/>${car.plate_number}<br/>${formatSpeed(car.speed)}`,
            { permanent: false, direction: 'top' }
          )
          markersRef.current[car.car_id] = marker
        }
      })
    }

    updateMarkers()
  }, [cars, selectedCar, onSelectCar])

  // Draw history polyline for selected car
  useEffect(() => {
    const drawHistory = async () => {
      const L = (await import('leaflet')).default
      if (!mapInstanceRef.current) return

      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }

      if (history.length > 1) {
        const points = history.map((p) => [p.latitude, p.longitude] as [number, number])
        polylineRef.current = L.polyline(points, {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '6, 4',
        }).addTo(mapInstanceRef.current)

        mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), {
          padding: [40, 40],
        })
      }
    }

    drawHistory()
  }, [history])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </>
  )
}

// Add this helper at the top of GPSTrackingDashboard.tsx
const getToken = (): string | null => {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('session_access_token='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const gpsGet = async (url: string) => {
  const token = getToken()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${url}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/* ── Main Dashboard ──────────────────────────────────── */
export default function GPSTrackingDashboard() {
  const [cars, setCars] = useState<CarLocation[]>([])
  const [selectedCar, setSelectedCar] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [search, setSearch] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch all live locations
  const fetchLive = useCallback(async () => {
  // Debug: check token
  const cookie = document.cookie
  console.log('ALL COOKIES:', cookie)
  
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('session_access_token='))
  const token = match ? match.split('=')[1] : null
  console.log('TOKEN FOUND:', token)

  try {
    const data = await gpsGet('/gps/live/')
    console.log('GPS DATA:', data)
    setCars(Array.isArray(data) ? data : [])
    setLastRefresh(new Date())
  } catch (err: any) {
    console.error('GPS ERROR:', err?.message ?? err)
  }
}, [])
  // const fetchLive = useCallback(async () => {
  //   try {
  //     const data = await apiService.get('/gps/live/')
  //     console.log('GPS DATA:', data)        // ← add
  //     console.log('GPS COUNT:', data?.length) // ← add
  //     setCars(data)
  //     setLastRefresh(new Date())
  //   } catch (err) {
  //     console.error('Failed to fetch GPS data', err)
  //     console.error('GPS fetch error:', err)
  //   }
  // }, [])

  // Fetch history for selected car
  const fetchHistory = useCallback(async (carId: number) => {
    setLoadingHistory(true)
    try {
      const data = await gpsGet(`/gps/history/${carId}/`)
      setHistory(data.history ?? [])
    } catch (err) {
      console.error('Failed to fetch GPS history', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // Select a car
  const handleSelectCar = useCallback((carId: number) => {
    setSelectedCar((prev) => {
      if (prev === carId) {
        setHistory([])
        return null
      }
      fetchHistory(carId)
      return carId
    })
  }, [fetchHistory])

  // Poll every 10 seconds
  useEffect(() => {
    fetchLive()
    intervalRef.current = setInterval(fetchLive, 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchLive])

  const filteredCars = cars.filter(
    (c) =>
      c.car_name.toLowerCase().includes(search.toLowerCase()) ||
      c.plate_number.toLowerCase().includes(search.toLowerCase())
  )

  const onlineCount = cars.filter((c) => isOnline(c.last_seen)).length
  const selectedCarData = cars.find((c) => c.car_id === selectedCar)

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-xl">📡</span>
            <h1 className="text-lg font-bold text-white">GPS Tracking</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {onlineCount} online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {cars.length - onlineCount} offline
            </span>
            <span className="ml-auto">
              ↻ {formatTime(lastRefresh.toISOString())}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-800">
          <input
            type="text"
            placeholder="Search cars..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Car List */}
        <div className="flex-1 overflow-y-auto">
          {filteredCars.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No cars found
            </div>
          ) : (
            filteredCars.map((car) => {
              const online = isOnline(car.last_seen)
              const isSelected = car.car_id === selectedCar

              return (
                <button
                  key={car.car_id}
                  onClick={() => handleSelectCar(car.car_id)}
                  className={`w-full text-left p-3 border-b border-gray-800 transition-colors hover:bg-gray-800 ${
                    isSelected ? 'bg-blue-950 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className="mt-1 flex-shrink-0">
                      <span
                        className={`block w-2.5 h-2.5 rounded-full ${
                          online ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-red-500'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {car.car_name}
                      </p>
                      <p className="text-xs text-gray-400">{car.plate_number}</p>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span>{headingToArrow(car.heading)} {formatSpeed(car.speed)}</span>
                        {car.latitude && (
                          <span className="truncate">
                            {Number(car.latitude).toFixed(4)}, {Number(car.longitude).toFixed(4)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mt-0.5">
                        Last seen: {formatTime(car.last_seen)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 flex-shrink-0">
          {selectedCarData ? (
            <>
              <div>
                <span className="font-semibold text-white">{selectedCarData.car_name}</span>
                <span className="text-gray-400 text-sm ml-2">{selectedCarData.plate_number}</span>
              </div>
              <div className="flex items-center gap-4 ml-auto text-sm">
                <span className={`flex items-center gap-1 ${isOnline(selectedCarData.last_seen) ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-current inline-block" />
                  {isOnline(selectedCarData.last_seen) ? 'Online' : 'Offline'}
                </span>
                <span className="text-gray-400">
                  Speed: <span className="text-white">{formatSpeed(selectedCarData.speed)}</span>
                </span>
                {loadingHistory && (
                  <span className="text-blue-400 text-xs">Loading history...</span>
                )}
                {history.length > 0 && (
                  <span className="text-blue-400 text-xs">
                    {history.length} points (24hr)
                  </span>
                )}
                <button
                  onClick={() => { setSelectedCar(null); setHistory([]) }}
                  className="text-gray-500 hover:text-white text-xs border border-gray-700 rounded px-2 py-1"
                >
                  Clear
                </button>
           <Link
            href='/admin/default'
            className='flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 hover:bg-blue-100 transition text-gray-700 hover:text-black text-xs'
          >
            Admin Dashboard
          </Link>
              </div>
            </>
          ) : (
           <div className="flex items-center gap-3 text-gray-400 text-sm">
          <span>
            Select a car from the sidebar to view its location and history
          </span>

          <Link
            href='/admin/default'
            className='inline-flex items-center rounded-xl bg-green-200 border border-blue-200 px-4 py-2 hover:bg-blue-100 transition text-black-700 hover:text-black text-xs'
          >
            Admin Dashboard
          </Link>
        </div>
            
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <GPSMap
            cars={cars.filter((c) => c.latitude !== null)}
            selectedCar={selectedCar}
            history={history}
            onSelectCar={handleSelectCar}
          />

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-xs text-gray-300 space-y-1 border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
              Online (seen &lt; 2 min ago)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Offline
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 border-t-2 border-dashed border-blue-400" />
              24hr route history
            </div>
          </div>

          {/* Refresh indicator */}
          <div className="absolute top-3 right-3 bg-gray-900/80 rounded-full px-3 py-1 text-xs text-gray-400 border border-gray-700">
            Auto-refresh: 10s
          </div>
        </div>
      </main>
    </div>
  )
}