'use client'
import { useRef, useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useContent } from '@/hooks/useContent'
import type { ContentItem } from '@/hooks/useContent'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/mov'
const MAX_SIZE_MB = 50

function ContentCard({ item, onDelete }: { item: ContentItem; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
      <div className="aspect-video bg-gray-100 relative">
        {item.type === 'image' ? (
          <img
            src={item.storage_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={item.storage_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            item.type === 'image'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {item.type === 'image' ? '🖼 Imagen' : '🎬 Video'}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hidden group-hover:flex items-center justify-center hover:bg-red-600"
        >
          ×
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.duration_seconds}s por pantalla</p>
      </div>
    </div>
  )
}

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo excede el límite de ${MAX_SIZE_MB}MB`)
      return
    }
    onUpload(file)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragging ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <p className="text-2xl mb-2">📁</p>
      <p className="text-sm font-medium text-gray-700">
        Arrastra tu archivo aquí o haz clic para seleccionar
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Imágenes (JPG, PNG, GIF, WebP) o videos (MP4, WebM) · Máx {MAX_SIZE_MB}MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default function ContentPage() {
  const { org } = useOrganization()
  const { items, loading, uploadContent, deleteContent } = useContent(org?.id)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      await uploadContent(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Contenido</h1>
        <p className="text-gray-500 text-sm mt-1">
          {items.length} archivo{items.length !== 1 ? 's' : ''} subido{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-8">
        {uploading ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">Subiendo archivo...</p>
          </div>
        ) : (
          <UploadZone onUpload={handleUpload} />
        )}
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Sin contenido</p>
          <p className="text-sm">Sube tu primera imagen o video arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onDelete={() => deleteContent(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
