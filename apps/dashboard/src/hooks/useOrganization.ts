'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Organization = {
  id: string
  name: string
  owner_id: string
  plan: 'free' | 'pro'
  created_at: string
}

export function useOrganization() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setOrg(data)
      setLoading(false)
    }
    fetchOrg()
  }, [])

  return { org, loading }
}
