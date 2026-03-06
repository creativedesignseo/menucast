'use client'
import Link from 'next/link'
import { useOrganization } from '@/hooks/useOrganization'
import { useScreens } from '@/hooks/useScreens'
import { useContent } from '@/hooks/useContent'

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  href: string
}) {
  return (
    <Link href={href} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors group">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Link>
  )
}

export default function DashboardPage() {
  const { org, loading: orgLoading } = useOrganization()
  const { screens, loading: screensLoading } = useScreens(org?.id)
  const { items, loading: contentLoading } = useContent(org?.id)

  const online = screens.filter(s => s.status === 'online').length
  const offline = screens.filter(s => s.status === 'offline').length
  const loading = orgLoading || screensLoading || contentLoading

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? '...' : `Hola, ${org?.name ?? ''}`}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Resumen de tu operacion en tiempo real
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Pantallas en linea"
            value={online}
            sub={offline > 0 ? `${offline} desconectada${offline !== 1 ? 's' : ''}` : 'Todas activas'}
            href="/dashboard/screens"
          />
          <StatCard
            label="Archivos subidos"
            value={items.length}
            sub={`${items.filter(i => i.type === 'image').length} imagenes · ${items.filter(i => i.type === 'video').length} videos`}
            href="/dashboard/content"
          />
          <StatCard
            label="Total pantallas"
            value={screens.length}
            sub={screens.length === 0 ? 'Agrega tu primera pantalla' : `${online} online ahora`}
            href="/dashboard/screens"
          />
        </div>
      )}

      {!loading && screens.length === 0 && (
        <div className="mt-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-gray-500 font-medium mb-1">Empieza aqui</p>
          <p className="text-gray-400 text-sm mb-4">
            Agrega tu primera pantalla, sube contenido y crea una playlist
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/screens" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
              + Agregar pantalla
            </Link>
            <Link href="/dashboard/content" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Subir contenido
            </Link>
          </div>
        </div>
      )}

      {!loading && screens.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Estado de pantallas</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {screens.map((screen, idx) => (
              <div
                key={screen.id}
                className={`flex items-center justify-between px-5 py-4 ${idx < screens.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-900">{screen.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {screen.current_playlist_id ? (
                    <Link href="/dashboard/playlists" className="text-xs text-blue-600 hover:underline">
                      Playlist asignada
                    </Link>
                  ) : (
                    <Link href="/dashboard/playlists" className="text-xs text-gray-400 hover:text-gray-600">
                      Sin playlist
                    </Link>
                  )}
                  <span className={`text-xs font-medium ${screen.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                    {screen.status === 'online' ? 'En linea' : 'Desconectada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
