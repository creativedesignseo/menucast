export type Organization = {
  id: string
  name: string
  owner_id: string
  plan: 'free' | 'pro'
  created_at: string
}

export type Screen = {
  id: string
  org_id: string
  name: string
  status: 'online' | 'offline'
  last_seen_at: string | null
  current_playlist_id: string | null
  pairing_code: string | null
}

export type ContentItem = {
  id: string
  org_id: string
  name: string
  type: 'image' | 'video'
  storage_url: string
  duration_seconds: number
}

export type Playlist = {
  id: string
  org_id: string
  name: string
}

export type PlaylistItem = {
  id: string
  playlist_id: string
  content_item_id: string
  position: number
  duration_seconds: number
  content_item?: ContentItem
}
