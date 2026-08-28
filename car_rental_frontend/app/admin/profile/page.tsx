'use client'
import { useState } from 'react'
import apiService from '@/app/services/apiService'

export default function AdminProfilePage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChangePassword = async () => {
    setMessage(null)
    setError(null)

    if (newPassword !== newPassword2) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await apiService.post('/user/password/change/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      })
      setMessage(res?.detail || 'Password updated successfully.')
      setOldPassword('')
      setNewPassword('')
      setNewPassword2('')
    } catch (err: any) {
      setError(err?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='mt-3'>
      <h1 className='text-2xl font-bold text-navy-700 dark:text-white mb-6'>
        Settings
      </h1>

      <div className='bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 p-8 max-w-lg'>
        <h2 className='text-lg font-semibold text-navy-700 dark:text-white mb-1'>Change Password</h2>
        <p className='text-sm text-gray-400 mb-6'>Update the password for your account.</p>

        {message && (
          <div className='mb-4 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2'>{message}</div>
        )}
        {error && (
          <div className='mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2'>{error}</div>
        )}

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Current Password
            </label>
            <input
              type='password'
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              New Password
            </label>
            <input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Confirm New Password
            </label>
            <input
              type='password'
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading || !oldPassword || !newPassword || !newPassword2}
          className='mt-6 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60'
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
