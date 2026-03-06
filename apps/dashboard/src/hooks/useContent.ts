'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type ContentItem = {
  id: string
  org_id: string
  name: string
  type: 'image' | 'video'
  storage_url: string
  duration_seconds: number
  created_at: string
}

export function useContent(orgId: string | undefined) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    supabase
      .from('content_items')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [orgId])

  const uploadContent = async (file: File): Promise<ContentItem | null> => {
    if (!orgId) return null

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const path = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(path)

    const type: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image'
    const name = file.name.replace(/\.[^/.]+$/, '') // nombre sin extensión

    const { data, error: dbError } = await supabase
      .from('content_items')
      .insert({
        org_id: orgId,
        name,
        type,
        storage_url: publicUrl,
        duration_seconds: type === 'image' ? 10 : 30,
      })
      .select()
      .single()

    if (dbError) throw new Error(dbError.message)
    if (data) setItems(prev => [data, ...prev])
    return data
  }

  const deleteContent = async (item: ContentItem) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Extraer path del storage desde la URL
    const url = new URL(item.storage_url)
    const pathParts = url.pathname.split('/storage/v1/object/public/content/')
    if (pathParts.length === 2) {
      await supabase.storage.from('content').remove([pathParts[1]])
    }

    await supabase.from('content_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  return { items, loading, uploadContent, deleteContent }
}
