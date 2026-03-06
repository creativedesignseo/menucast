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
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    supabase
      .from('playlists')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setPlaylists(data ?? [])
        setLoading(false)
      })
  }, [orgId, supabase])

  const createPlaylist = async (name: string): Promise<Playlist | null> => {
    if (!orgId) return null
    try {
      setError(null)
      const { data, error } = await supabase
        .from('playlists')
        .insert({ org_id: orgId, name })
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      if (data) setPlaylists(prev => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const deletePlaylist = async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase.from('playlists').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addItem = async (playlistId: string, contentItemId: string, position: number, durationSeconds = 10) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('playlist_items')
        .insert({ playlist_id: playlistId, content_item_id: contentItemId, position, duration_seconds: durationSeconds })
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      return data
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      setError(null)
      const { error } = await supabase.from('playlist_items').delete().eq('id', itemId)
      if (error) throw new Error(error.message)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const assignToScreen = async (screenId: string, playlistId: string | null) => {
    try {
      setError(null)
      const { error } = await supabase
        .from('screens')
        .update({ current_playlist_id: playlistId })
        .eq('id', screenId)
      
      if (error) throw new Error(error.message)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return { playlists, loading, error, createPlaylist, deletePlaylist, addItem, removeItem, assignToScreen }
}
