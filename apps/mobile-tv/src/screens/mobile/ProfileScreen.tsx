import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native'
import { supabase } from '../../lib/supabase'

type OrgInfo = { name: string; plan: 'free' | 'pro' }

export function ProfileScreen() {
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('organizations')
        .select('name, plan')
        .eq('owner_id', user.id)
        .single()

      setOrg(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = () => {
    Alert.alert('Cerrar sesion', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          setLoggingOut(true)
          await supabase.auth.signOut()
        }
      },
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi cuenta</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
        </View>

        {org && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Restaurante</Text>
              <Text style={styles.value}>{org.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Plan</Text>
              <View style={[styles.badge, org.plan === 'pro' ? styles.proBadge : styles.freeBadge]}>
                <Text style={[styles.badgeText, org.plan === 'pro' ? styles.proText : styles.freeText]}>
                  {org.plan === 'pro' ? 'Pro' : 'Gratis'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut
            ? <ActivityIndicator color="#ff3b30" />
            : <Text style={styles.logoutText}>Cerrar sesion</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>MenuCast v1.0</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', padding: 20, paddingBottom: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 },
  label: { fontSize: 15, color: '#111' },
  value: { fontSize: 15, color: '#888' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  freeBadge: { backgroundColor: '#f0f0f0' },
  proBadge: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  freeText: { color: '#666' },
  proText: { color: '#92400e' },
  logoutBtn: {
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 8 },
})
