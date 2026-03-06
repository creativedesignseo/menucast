'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Screen = {
  id: string
  org_id: string
  name: string
  status: 'online' | 'offline'
  last_seen_at: string | null
  current_playlist_id: string | null
  pairing_code: string | null
  created_at: string
}

export function useScreens(orgId: string | undefined) {
  const [screens, setScreens] = useState<Screen[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    const fetchScreens = async () => {
      const { data } = await supabase
        .from('screens')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
      setScreens(data ?? [])
      setLoading(false)
    }

    fetchScreens()

    // Realtime: actualizar status en tiempo real
    const channel = supabase
      .channel('screens-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'screens',
        filter: `org_id=eq.${orgId}`
      }, () => fetchScreens())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  const addScreen = async (name: string): Promise<Screen | null> => {
    if (!orgId) return null
    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase
      .from('screens')
      .insert({ org_id: orgId, name, pairing_code: pairingCode })
      .select()
      .single()
    if (data) setScreens(prev => [...prev, data])
    return data
  }

  const deleteScreen = async (screenId: string) => {
    await supabase.from('screens').delete().eq('id', screenId)
    setScreens(prev => prev.filter(s => s.id !== screenId))
  }

  return { screens, loading, addScreen, deleteScreen }
}
