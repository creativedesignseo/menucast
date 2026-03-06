'use client'
import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { usePlaylists } from '@/hooks/usePlaylists'
import { useContent, type ContentItem } from '@/hooks/useContent'
import { useScreens } from '@/hooks/useScreens'
import { createClient } from '@/lib/supabase'

type PlaylistItemWithContent = {
  id: string
  playlist_id: string
  content_item_id: string
  position: number
  duration_seconds: number
  content_item: ContentItem
}

function PlaylistDetail({
  playlistId,
  allContent,
  onAddItem,
  onRemoveItem,
}: {
  playlistId: string
  allContent: ContentItem[]
  onAddItem: (contentItemId: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  const [items, setItems] = useState<PlaylistItemWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    setLoading(true)
    supabase
      .from('playlist_items')
      .select('*, content_item:content_items(*)')
      .eq('playlist_id', playlistId)
      .order('position')
      .then(({ data }) => {
        setItems((data as PlaylistItemWithContent[]) ?? [])
        setLoading(false)
      })
  }, [playlistId])

  const handleAdd = async (contentItemId: string) => {
    await onAddItem(contentItemId)
    // Recargar items
    const { data } = await supabase
      .from('playlist_items')
      .select('*, content_item:content_items(*)')
      .eq('playlist_id', playlistId)
      .order('position')
    setItems((data as PlaylistItemWithContent[]) ?? [])
  }

  const handleRemove = async (itemId: string) => {
    await onRemoveItem(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const unusedContent = allContent.filter(
    c => !items.some(i => i.content_item_id === c.id)
  )

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>

  return (
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Sin items. Agrega contenido abajo.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
              <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
              {item.content_item.type === 'image' ? (
                <img src={item.content_item.storage_url} alt={item.content_item.name} className="w-12 h-8 object-cover rounded" />
              ) : (
                <video src={item.content_item.storage_url} className="w-12 h-8 object-cover rounded" muted />
              )}
              <span className="text-sm flex-1 truncate">{item.content_item.name}</span>
              <span className="text-xs text-gray-400">{item.duration_seconds}s</span>
              <button
                onClick={() => handleRemove(item.id)}
                className="text-red-400 hover:text-red-600 text-xs px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {unusedContent.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Agregar contenido:</p>
          <div className="flex flex-wrap gap-2">
            {unusedContent.map(c => (
              <button
                key={c.id}
                onClick={() => handleAdd(c.id)}
                className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 truncate max-w-32"
              >
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlaylistsPage() {
  const { org } = useOrganization()
  const { playlists, loading, createPlaylist, deletePlaylist, addItem, removeItem, assignToScreen } = usePlaylists(org?.id)
  const { items: content } = useContent(org?.id)
  const { screens } = useScreens(org?.id)
  const [newName, setNewName] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const pl = await createPlaylist(newName.trim())
    setNewName('')
    if (pl) setExpanded(pl.id)
  }

  const handleAssign = async (screenId: string, playlistId: string) => {
    await assignToScreen(screenId, playlistId)
    setAssigning(null)
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
        <p className="text-gray-500 text-sm mt-1">
          Organiza tu contenido y asignalo a pantallas
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre de la playlist"
          className="border border-gray-300 rounded-lg px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + Crear
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : playlists.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Sin playlists</p>
          <p className="text-sm">Crea una playlist y agrega imagenes o videos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map(pl => (
            <div key={pl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => setExpanded(expanded === pl.id ? null : pl.id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  <span className="text-sm font-medium text-gray-900">{pl.name}</span>
                  <span className="text-gray-400 text-xs">{expanded === pl.id ? '▲' : '▼'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssigning(assigning === pl.id ? null : pl.id)}
                    className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-full font-medium"
                  >
                    Asignar pantalla
                  </button>
                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {assigning === pl.id && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Selecciona una pantalla:</p>
                  {screens.length === 0 ? (
                    <p className="text-xs text-gray-400">No hay pantallas registradas.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {screens.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleAssign(s.id, pl.id)}
                          className={`text-xs px-3 py-1 rounded-full border ${
                            s.current_playlist_id === pl.id
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {s.name} {s.current_playlist_id === pl.id ? '✓' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {expanded === pl.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <PlaylistDetail
                    playlistId={pl.id}
                    allContent={content}
                    onAddItem={(contentItemId) =>
                      addItem(pl.id, contentItemId, 999)
                    }
                    onRemoveItem={removeItem}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
