'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'

export default function SettingsPage() {
  const supabase = createClient()
  const { org, loading: orgLoading } = useOrganization()

  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  useEffect(() => {
    if (org) setOrgName(org.name)
  }, [org])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setError('')
    setTimeout(() => setMessage(''), 3000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setMessage('')
    setTimeout(() => setError(''), 5000)
  }

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org || !orgName.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim() })
      .eq('id', org.id)
    setSaving(false)
    if (error) return showError(error.message)
    showMessage('Nombre actualizado')
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) return showError('La contraseña debe tener al menos 6 caracteres')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) return showError(error.message)
    setCurrentPassword('')
    setNewPassword('')
    showMessage('Contraseña actualizada')
  }

  if (orgLoading) {
    return (
      <div className="max-w-lg mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Configuracion</h1>
      <p className="text-gray-500 text-sm mb-8">Administra tu cuenta y negocio</p>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Info de cuenta */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Cuenta</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-900">{email}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plan</label>
            <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
              {org?.plan === 'pro' ? 'Pro' : 'Gratis'}
            </span>
          </div>
        </div>
      </div>

      {/* Nombre del negocio */}
      <form onSubmit={handleUpdateOrg} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Negocio</h2>
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Nombre del negocio</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving || orgName === org?.name}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Guardar
        </button>
      </form>

      {/* Cambiar contraseña */}
      <form onSubmit={handleUpdatePassword} className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Cambiar contraseña</h2>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || newPassword.length < 6}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Cambiar contraseña
        </button>
      </form>
    </div>
  )
}
