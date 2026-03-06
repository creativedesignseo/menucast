'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Playlist = {
  id: string
  org_id: string
  name: string
  created_at: string
}

export type PlaylistItem = {
  id: string
  playlist_id: string
  content_item_id: string
  position: number
  duration_seconds: number
}

export function usePlaylists(orgId: string | undefined) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    supabase
      .from('playlists')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPlaylists(data ?? [])
        setLoading(false)
      })
  }, [orgId])

  const createPlaylist = async (name: string): Promise<Playlist | null> => {
    if (!orgId) return null
    const { data } = await supabase
      .from('playlists')
      .insert({ org_id: orgId, name })
      .select()
      .single()
    if (data) setPlaylists(prev => [data, ...prev])
    return data
  }

  const deletePlaylist = async (id: string) => {
    await supabase.from('playlists').delete().eq('id', id)
    setPlaylists(prev => prev.filter(p => p.id !== id))
  }

  const addItem = async (playlistId: string, contentItemId: string, position: number, durationSeconds = 10) => {
    const { data } = await supabase
      .from('playlist_items')
      .insert({ playlist_id: playlistId, content_item_id: contentItemId, position, duration_seconds: durationSeconds })
      .select()
      .single()
    return data
  }

  const removeItem = async (itemId: string) => {
    await supabase.from('playlist_items').delete().eq('id', itemId)
  }

  const assignToScreen = async (screenId: string, playlistId: string | null) => {
    await supabase
      .from('screens')
      .update({ current_playlist_id: playlistId })
      .eq('id', screenId)
  }

  return { playlists, loading, createPlaylist, deletePlaylist, addItem, removeItem, assignToScreen }
}
