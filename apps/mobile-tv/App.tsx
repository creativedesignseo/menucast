import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import { isTV } from './src/lib/platform'
import { LoginScreen } from './src/screens/LoginScreen'
import { PlayerScreen } from './src/screens/tv/PlayerScreen'
import { ScreensScreen } from './src/screens/mobile/ScreensScreen'

// En produccion, el screenId se obtiene del pairing code almacenado
// Por ahora lo dejamos como variable de entorno o hardcoded para pruebas
const TV_SCREEN_ID = process.env.EXPO_PUBLIC_SCREEN_ID ?? ''

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLogin={() => {}} />
      </>
    )
  }

  return (
    <>
      <StatusBar style={isTV ? 'light' : 'dark'} />
      {isTV
        ? <PlayerScreen screenId={TV_SCREEN_ID} />
        : <ScreensScreen />
      }
    </>
  )
}
