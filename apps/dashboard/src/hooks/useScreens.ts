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
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    const fetchScreens = async () => {
      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
      
      if (error) setError(error.message)
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
    try {
      setError(null)
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      let pairingCode = array[0].toString(36).substring(0, 6).toUpperCase()
      pairingCode = pairingCode.padStart(6, '0') // Asegurar 6 chars

      const { data, error } = await supabase
        .from('screens')
        .insert({ org_id: orgId, name, pairing_code: pairingCode })
        .select()
        .single()
      
      if (error) throw new Error(error.message)
      if (data) setScreens(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const deleteScreen = async (screenId: string) => {
    try {
      setError(null)
      const { error } = await supabase.from('screens').delete().eq('id', screenId)
      if (error) throw new Error(error.message)
      setScreens(prev => prev.filter(s => s.id !== screenId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  return { screens, loading, error, addScreen, deleteScreen }
}
