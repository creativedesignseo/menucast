import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native'
import { supabase } from '../../lib/supabase'

type Playlist = { id: string; name: string; created_at: string }
type Screen = { id: string; name: string; current_playlist_id: string | null }
type ContentItem = { id: string; name: string; type: 'image' | 'video' }
type PlaylistItem = { id: string; content_item_id: string; position: number; duration_seconds: number; content_item: ContentItem }

async function getOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('organizations').select('id').eq('owner_id', user.id).single()
  return data?.id ?? null
}

export function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [plItems, setPlItems] = useState<PlaylistItem[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const orgIdRef = useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const orgId = await getOrgId()
      orgIdRef.current = orgId
      if (!orgId) { setLoading(false); return }

      const [{ data: pls }, { data: cnt }, { data: scr }] = await Promise.all([
        supabase.from('playlists').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
        supabase.from('content_items').select('id, name, type').eq('org_id', orgId),
        supabase.from('screens').select('id, name, current_playlist_id').eq('org_id', orgId),
      ])
      setPlaylists(pls ?? [])
      setContent(cnt ?? [])
      setScreens(scr ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const openPlaylist = async (pl: Playlist) => {
    setSelected(pl)
    const { data } = await supabase
      .from('playlist_items')
      .select('*, content_item:content_items(id, name, type)')
      .eq('playlist_id', pl.id)
      .order('position')
    setPlItems((data as PlaylistItem[]) ?? [])
  }

  const createPlaylist = async () => {
    if (!newName.trim() || !orgIdRef.current) return
    setCreating(true)
    const { data } = await supabase
      .from('playlists')
      .insert({ org_id: orgIdRef.current, name: newName.trim() })
      .select()
      .single()
    if (data) setPlaylists(prev => [data, ...prev])
    setNewName('')
    setCreating(false)
  }

  const deletePlaylist = (pl: Playlist) => {
    Alert.alert('Eliminar', `¿Eliminar "${pl.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('playlists').delete().eq('id', pl.id)
          setPlaylists(prev => prev.filter(p => p.id !== pl.id))
        }
      },
    ])
  }

  const addItem = async (contentItem: ContentItem) => {
    if (!selected) return
    const { data } = await supabase
      .from('playlist_items')
      .insert({ playlist_id: selected.id, content_item_id: contentItem.id, position: plItems.length, duration_seconds: 10 })
      .select('*, content_item:content_items(id, name, type)')
      .single()
    if (data) setPlItems(prev => [...prev, data as PlaylistItem])
  }

  const removeItem = async (itemId: string) => {
    await supabase.from('playlist_items').delete().eq('id', itemId)
    setPlItems(prev => prev.filter(i => i.id !== itemId))
  }

  const assignScreen = async (screen: Screen) => {
    const newPlaylistId = screen.current_playlist_id === selected?.id ? null : selected?.id ?? null
    await supabase.from('screens').update({ current_playlist_id: newPlaylistId }).eq('id', screen.id)
    setScreens(prev => prev.map(s => s.id === screen.id ? { ...s, current_playlist_id: newPlaylistId } : s))
  }

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>

  const unusedContent = content.filter(c => !plItems.some(i => i.content_item_id === c.id))

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Playlists</Text>

      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Nueva playlist..."
          returnKeyType="done"
          onSubmitEditing={createPlaylist}
        />
        <TouchableOpacity style={styles.createBtn} onPress={createPlaylist} disabled={creating}>
          <Text style={styles.createBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={styles.empty}>Sin playlists. Crea una arriba.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openPlaylist(item)} onLongPress={() => deletePlaylist(item)} delayLongPress={600}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>Mantén presionado para eliminar · Toca para editar</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.close}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.section}>Items</Text>
            {plItems.length === 0
              ? <Text style={styles.empty}>Sin items</Text>
              : plItems.map((item, idx) => (
                <View key={item.id} style={styles.plItem}>
                  <Text style={styles.plItemIdx}>{idx + 1}</Text>
                  <Text style={styles.plItemName} numberOfLines={1}>{item.content_item.name}</Text>
                  <Text style={styles.plItemMeta}>{item.duration_seconds}s</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Text style={styles.remove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            }

            {unusedContent.length > 0 && (
              <>
                <Text style={[styles.section, { marginTop: 20 }]}>Agregar contenido</Text>
                {unusedContent.map(c => (
                  <TouchableOpacity key={c.id} style={styles.addItem} onPress={() => addItem(c)}>
                    <Text style={styles.addItemText}>+ {c.name}</Text>
                    <Text style={styles.plItemMeta}>{c.type === 'image' ? 'Imagen' : 'Video'}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={[styles.section, { marginTop: 20 }]}>Asignar a pantalla</Text>
            {screens.length === 0
              ? <Text style={styles.empty}>Sin pantallas registradas</Text>
              : screens.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.screenItem, s.current_playlist_id === selected?.id && styles.screenItemActive]}
                  onPress={() => assignScreen(s)}
                >
                  <Text style={styles.screenItemName}>{s.name}</Text>
                  {s.current_playlist_id === selected?.id && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))
            }
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', padding: 20, paddingBottom: 12 },
  createRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#e5e5e5',
  },
  createBtn: { backgroundColor: '#111', width: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardMeta: { fontSize: 12, color: '#bbb', marginTop: 4 },
  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 40 },
  modal: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  close: { color: '#007AFF', fontSize: 16 },
  modalBody: { padding: 16 },
  section: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  plItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 6, gap: 10,
  },
  plItemIdx: { color: '#ccc', fontSize: 13, width: 20, textAlign: 'center' },
  plItemName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111' },
  plItemMeta: { fontSize: 12, color: '#bbb' },
  remove: { color: '#ff3b30', fontSize: 20, paddingHorizontal: 4 },
  addItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6,
  },
  addItemText: { fontSize: 14, color: '#007AFF' },
  screenItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 6, borderWidth: 2, borderColor: 'transparent',
  },
  screenItemActive: { borderColor: '#34c759' },
  screenItemName: { fontSize: 15, fontWeight: '500', color: '#111' },
  check: { color: '#34c759', fontSize: 18, fontWeight: '700' },
})
