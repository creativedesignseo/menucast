import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'

type ContentItem = {
  id: string
  name: string
  type: 'image' | 'video'
  storage_url: string
  duration_seconds: number
  created_at: string
}

async function getOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  return data?.id ?? null
}

export function ContentScreen() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const orgIdRef = useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const orgId = await getOrgId()
      orgIdRef.current = orgId
      if (!orgId) { setLoading(false); return }

      const { data } = await supabase
        .from('content_items')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    const orgId = orgIdRef.current
    if (!orgId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUploading(true)
    try {
      const asset = result.assets[0]
      const ext = asset.uri.split('.').pop() ?? 'jpg'
      const fileName = `${Date.now()}.${ext}`
      const path = `${user.id}/${fileName}`

      const response = await fetch(asset.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(path)

      const type = asset.type === 'video' ? 'video' : 'image'
      const name = asset.fileName?.replace(/\.[^/.]+$/, '') ?? fileName

      const { data, error: dbError } = await supabase
        .from('content_items')
        .insert({ org_id: orgId, name, type, storage_url: publicUrl, duration_seconds: type === 'image' ? 10 : 30 })
        .select()
        .single()

      if (dbError) throw dbError
      if (data) setItems(prev => [data, ...prev])
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  const deleteItem = (item: ContentItem) => {
    Alert.alert('Eliminar', `¿Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const url = new URL(item.storage_url)
          const parts = url.pathname.split('/storage/v1/object/public/content/')
          if (parts.length === 2) {
            await supabase.storage.from('content').remove([parts[1]])
          }
          await supabase.from('content_items').delete().eq('id', item.id)
          setItems(prev => prev.filter(i => i.id !== item.id))
        }
      },
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contenido</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.uploadBtnText}>+ Subir</Text>
          }
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Sin contenido. Sube una imagen o video.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => deleteItem(item)}
              delayLongPress={600}
            >
              <Image
                source={{ uri: item.storage_url }}
                style={styles.thumb}
                resizeMode="cover"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.type === 'image' ? 'Imagen' : 'Video'} · {item.duration_seconds}s</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  uploadBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  grid: { padding: 10 },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#eee' },
  cardInfo: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#111' },
  cardMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  empty: { color: '#aaa', fontSize: 15 },
})
