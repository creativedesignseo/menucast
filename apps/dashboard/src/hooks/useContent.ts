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
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    supabase
      .from('content_items')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setItems(data ?? [])
        setLoading(false)
      })
  }, [orgId, supabase])

  const uploadContent = async (file: File): Promise<ContentItem | null> => {
    if (!orgId) return null
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return null
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      let randomString = array[0].toString(36).substring(0, 6)
      
      const fileName = `${Date.now()}-${randomString}.${ext}`
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
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const deleteContent = async (item: ContentItem) => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Extraer path del storage desde la URL
      const url = new URL(item.storage_url)
      const pathParts = url.pathname.split('/storage/v1/object/public/content/')
      if (pathParts.length === 2) {
        const { error } = await supabase.storage.from('content').remove([pathParts[1]])
        if (error) throw new Error('Failed to delete from storage: ' + error.message)
      }

      const { error } = await supabase.from('content_items').delete().eq('id', item.id)
      if (error) throw new Error('Failed to delete from database: ' + error.message)

      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  return { items, loading, error, uploadContent, deleteContent }
}
