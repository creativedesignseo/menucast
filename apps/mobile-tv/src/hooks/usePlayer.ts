import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ContentItem = {
  id: string
  name: string
  type: 'image' | 'video'
  storage_url: string
  duration_seconds: number
}

export type PlaylistItem = {
  id: string
  playlist_id: string
  content_item_id: string
  position: number
  duration_seconds: number
  content_item: ContentItem
}

const CACHE_KEY = 'player_playlist_cache'

export function usePlayer(screenId: string) {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Cargar desde cache primero (offline resilience)
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) setItems(JSON.parse(cached))
    })
  }, [])

  // Cargar desde servidor y suscribirse a cambios en tiempo real
  useEffect(() => {
    const loadPlaylist = async () => {
      const { data: screen } = await supabase
        .from('screens')
        .select('current_playlist_id')
        .eq('id', screenId)
        .single()

      if (!screen?.current_playlist_id) return

      const { data: playlistItems } = await supabase
        .from('playlist_items')
        .select('*, content_item:content_items(*)')
        .eq('playlist_id', screen.current_playlist_id)
        .order('position')

      if (playlistItems && playlistItems.length > 0) {
        setItems(playlistItems as PlaylistItem[])
        setCurrentIndex(0)
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(playlistItems))
      }
    }

    loadPlaylist()

    const channel = supabase
      .channel('screen-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'screens',
        filter: `id=eq.${screenId}`,
      }, () => loadPlaylist())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [screenId])

  // Heartbeat: marcar pantalla online cada 30 segundos
  useEffect(() => {
    const updateOnline = () => {
      supabase
        .from('screens')
        .update({ status: 'online', last_seen_at: new Date().toISOString() })
        .eq('id', screenId)
        .then()
    }

    updateOnline()
    const interval = setInterval(updateOnline, 30_000)

    return () => {
      clearInterval(interval)
      supabase.from('screens').update({ status: 'offline' }).eq('id', screenId).then()
    }
  }, [screenId])

  // Avanzar al siguiente item automaticamente
  useEffect(() => {
    if (items.length === 0) return
    const item = items[currentIndex]
    const duration = (item?.duration_seconds ?? 10) * 1000

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, duration)

    return () => clearTimeout(timerRef.current)
  }, [currentIndex, items])

  return {
    currentItem: items[currentIndex] ?? null,
    totalItems: items.length,
    currentIndex,
  }
}
