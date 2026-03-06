'use client'
import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useScreens } from '@/hooks/useScreens'
import type { Screen } from '@/hooks/useScreens'

function PairingCodeModal({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold mb-2">Pantalla creada</h2>
        <p className="text-gray-500 text-sm mb-6">
          Ingresa este código en la app MenuCast de tu Android TV
        </p>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-6">
          <p className="text-4xl font-mono font-bold tracking-widest text-gray-900">
            {screen.pairing_code}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-black text-white rounded-lg py-2 font-medium"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

function ScreenCard({ screen, onDelete }: { screen: Screen; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-2.5 h-2.5 rounded-full ${screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div>
          <p className="font-medium text-gray-900">{screen.name}</p>
          <p className="text-sm text-gray-400">
            {screen.status === 'online' ? 'En línea' : 'Desconectada'}
            {screen.last_seen_at && screen.status === 'offline' && (
              <span> · Última vez {new Date(screen.last_seen_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 text-sm transition-colors"
      >
        Eliminar
      </button>
    </div>
  )
}

export default function ScreensPage() {
  const { org } = useOrganization()
  const { screens, loading, addScreen, deleteScreen } = useScreens(org?.id)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [newScreen, setNewScreen] = useState<Screen | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    const screen = await addScreen(name.trim())
    if (screen) setNewScreen(screen)
    setName('')
    setAdding(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pantallas</h1>
        <p className="text-gray-500 text-sm mt-1">
          {screens.length} pantalla{screens.length !== 1 ? 's' : ''} registrada{screens.length !== 1 ? 's' : ''}
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre de la pantalla (ej: Entrada principal)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {adding ? 'Agregando...' : '+ Agregar pantalla'}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : screens.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Sin pantallas</p>
          <p className="text-sm">Agrega tu primera pantalla arriba</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {screens.map(screen => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              onDelete={() => deleteScreen(screen.id)}
            />
          ))}
        </div>
      )}

      {newScreen && (
        <PairingCodeModal
          screen={newScreen}
          onClose={() => setNewScreen(null)}
        />
      )}
    </div>
  )
}
