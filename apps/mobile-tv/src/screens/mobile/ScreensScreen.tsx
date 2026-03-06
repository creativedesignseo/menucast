import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Screen = {
  id: string
  name: string
  status: 'online' | 'offline'
  last_seen_at: string | null
  current_playlist_id: string | null
}

export function ScreensScreen() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadScreens = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!org) return

    const { data } = await supabase
      .from('screens')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at')

    setScreens(data ?? [])
  }

  useEffect(() => {
    loadScreens()

    const channel = supabase
      .channel('screens-mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screens' },
        () => loadScreens())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadScreens()
    setRefreshing(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis pantallas</Text>
      <FlatList
        data={screens}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay pantallas registradas.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.screenName}>{item.name}</Text>
              <View style={[styles.statusBadge,
                item.status === 'online' ? styles.online : styles.offline]}>
                <Text style={styles.statusText}>
                  {item.status === 'online' ? 'En linea' : 'Desconectada'}
                </Text>
              </View>
            </View>
            {item.last_seen_at && (
              <Text style={styles.lastSeen}>
                Ultima vez: {new Date(item.last_seen_at).toLocaleString()}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 20, paddingBottom: 12, color: '#111' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenName: { fontSize: 16, fontWeight: '600', color: '#111' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  online: { backgroundColor: '#dcfce7' },
  offline: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  lastSeen: { fontSize: 12, color: '#888', marginTop: 6 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 16 },
})
