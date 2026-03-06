import { useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const SCREEN_ID_KEY = 'menucast_screen_id'

export async function getStoredScreenId(): Promise<string | null> {
  return AsyncStorage.getItem(SCREEN_ID_KEY)
}

export async function clearStoredScreenId(): Promise<void> {
  return AsyncStorage.removeItem(SCREEN_ID_KEY)
}

export function usePairing(onPaired: (screenId: string) => void) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pair = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('Ingresa el codigo de vinculacion')
      return
    }

    setLoading(true)
    setError('')

    const { data: screen, error: dbError } = await supabase
      .from('screens')
      .select('id, name')
      .eq('pairing_code', trimmed)
      .single()

    setLoading(false)

    if (dbError || !screen) {
      setError('Codigo invalido. Verificalo en el dashboard.')
      return
    }

    await AsyncStorage.setItem(SCREEN_ID_KEY, screen.id)
    onPaired(screen.id)
  }

  return { code, setCode, loading, error, pair }
}
