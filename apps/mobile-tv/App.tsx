import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import { isTV } from './src/lib/platform'
import { LoginScreen } from './src/screens/LoginScreen'
import { PairingScreen } from './src/screens/tv/PairingScreen'
import { PlayerScreen } from './src/screens/tv/PlayerScreen'
import { ScreensScreen } from './src/screens/mobile/ScreensScreen'
import { getStoredScreenId } from './src/hooks/usePairing'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [screenId, setScreenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (isTV) {
        const stored = await getStoredScreenId()
        setScreenId(stored)
      }

      setLoading(false)
    }

    init()

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

  if (isTV) {
    if (!screenId) {
      return (
        <>
          <StatusBar style="light" />
          <PairingScreen onPaired={id => setScreenId(id)} />
        </>
      )
    }
    return (
      <>
        <StatusBar style="light" />
        <PlayerScreen screenId={screenId} />
      </>
    )
  }

  return (
    <>
      <StatusBar style="dark" />
      <ScreensScreen />
    </>
  )
}
