'use client'
import { useCallback, useEffect, useState } from 'react'
import apiService from '@/app/services/apiService'
import { useIsAdmin } from '@/app/lib/useAuth'

interface AdminUser {
  id: number
  username?: string
  email?: string
  full_name?: string
  first_name?: string
  last_name?: string
  phone?: string | null
  is_active: boolean
  is_staff: boolean
  date_joined?: string
}

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  is_active: true,
  is_staff: false,
}

export default function AdminUsersPage() {
  const { isAdmin, checked } = useIsAdmin()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiService.get('/user/')
      setUsers(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (checked && isAdmin) fetchUsers()
  }, [checked, isAdmin, fetchUsers])

  if (checked && !isAdmin) {
    return (
      <div className='mt-3'>
        <div className='bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 py-16 text-center'>
          <p className='text-lg font-semibold text-navy-700 dark:text-white mb-1'>Access restricted</p>
          <p className='text-sm text-gray-400'>Only admins can view and manage users.</p>
        </div>
      </div>
    )
  }

  const openEdit = (u: AdminUser) => {
    setError(null)
    setEditing(u)
    setForm({
      full_name: u.full_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      email: u.email || '',
      phone: u.phone || '',
      is_active: u.is_active,
      is_staff: u.is_staff,
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await apiService.patch(`/user/${editing.id}/`, form)
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...updated } : u)))
      setEditing(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to update user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (u: AdminUser) => {
    setActionLoading(true)
    try {
      await apiService.delete(`/user/${u.id}/`)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className='mt-3'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-navy-700 dark:text-white'>Users</h1>
        <span className='text-sm text-gray-500'>{users.length} total</span>
      </div>

      <div className='bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 overflow-hidden'>
        {loading ? (
          <div className='py-12 text-center text-gray-400'>Loading...</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 dark:bg-navy-700 text-gray-500 text-xs uppercase'>
                <tr>
                  <th className='px-4 py-3 text-left'>ID</th>
                  <th className='px-4 py-3 text-left'>Name</th>
                  <th className='px-4 py-3 text-left'>Email</th>
                  <th className='px-4 py-3 text-left'>Joined</th>
                  <th className='px-4 py-3 text-left'>Status</th>
                  <th className='px-4 py-3 text-left'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50 dark:divide-navy-700'>
                {users.map((u) => (
                  <tr key={u.id} className='hover:bg-gray-50 dark:hover:bg-navy-700 transition'>
                    <td className='px-4 py-3 text-gray-400 font-mono'>#{u.id}</td>
                    <td className='px-4 py-3 font-medium text-navy-700 dark:text-white'>
                      {u.full_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username}
                    </td>
                    <td className='px-4 py-3 text-gray-500'>{u.email}</td>
                    <td className='px-4 py-3 text-gray-400 text-xs'>
                      {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <button onClick={() => openEdit(u)} className='text-xs text-blue-600 hover:underline'>
                          Edit
                        </button>
                        <span className='text-gray-300'>|</span>
                        <button onClick={() => setDeleteConfirm(u)} className='text-xs text-red-400 hover:underline'>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6} className='px-4 py-10 text-center text-gray-400'>No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-navy-800 rounded-2xl w-full max-w-md shadow-2xl p-6'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>Edit User #{editing.id}</h2>

            {error && (
              <div className='mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2'>{error}</div>
            )}

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Full Name</label>
                <input
                  type='text'
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Email</label>
                <input
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Phone</label>
                <input
                  type='text'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex items-center gap-6 pt-1'>
                <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
                  <input
                    type='checkbox'
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
                  <input
                    type='checkbox'
                    checked={form.is_staff}
                    onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
                  />
                  Staff
                </label>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setEditing(null)}
                className='flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className='flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60'
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-navy-800 rounded-2xl w-full max-w-sm shadow-2xl p-6'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>Delete User</h2>
            <p className='text-sm text-gray-500 mb-6'>
              Are you sure you want to delete{' '}
              <span className='font-semibold'>{deleteConfirm.full_name || deleteConfirm.email}</span>?
              This action cannot be undone.
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setDeleteConfirm(null)}
                className='flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition'
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className='flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60'
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
