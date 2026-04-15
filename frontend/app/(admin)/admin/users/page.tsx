'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { fetchAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '@/lib/admin-api';

const roleOptions: Array<'all' | 'consumer' | 'creator' | 'admin'> = ['all', 'consumer', 'creator', 'admin'];

export default function AdminUsersPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<'all' | 'consumer' | 'creator' | 'admin'>('all');
  const [search, setSearch] = useState('');

  const usersQuery = useQuery({
    queryKey: ['admin-users', roleFilter, search],
    queryFn: () => fetchAdminUsers({ role: roleFilter, search: search.trim() || undefined }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'consumer' | 'creator' | 'admin' }) =>
      updateAdminUserRole(userId, role),
    onSuccess: () => {
      toast.success('User role updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => {
      toast.error('Unable to update role right now');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateAdminUserStatus(userId, isActive),
    onSuccess: () => {
      toast.success('User status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toast.error('Unable to update status right now');
    },
  });

  return (
    <section>
      <h1 className="font-display text-4xl">User Management</h1>
      <p className="mt-2 text-sm text-text-secondary">Control roles and account activity across the platform.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr]">
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as 'all' | 'consumer' | 'creator' | 'admin')}
          className="rounded-xl border border-border bg-bg-card px-3 py-2 text-sm"
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by username or email"
          className="rounded-xl border border-border bg-bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-bg-card/80 text-text-secondary">
            <tr>
              <th className="px-3 py-3 text-left font-medium">User</th>
              <th className="px-3 py-3 text-left font-medium">Role</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data?.users ?? []).map((user) => (
              <tr key={user._id} className="border-t border-border/80 align-top">
                <td className="px-3 py-3">
                  <p className="font-medium">@{user.username}</p>
                  <p className="text-xs text-text-secondary">{user.email}</p>
                </td>
                <td className="px-3 py-3">
                  <select
                    value={user.role}
                    onChange={(event) => {
                      void roleMutation.mutateAsync({
                        userId: user._id,
                        role: event.target.value as 'consumer' | 'creator' | 'admin',
                      });
                    }}
                    className="rounded-lg border border-border bg-bg-card px-2 py-1 text-xs"
                  >
                    <option value="consumer">consumer</option>
                    <option value="creator">creator</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${
                      user.isActive
                        ? 'border-success/60 bg-success/10 text-success'
                        : 'border-error/60 bg-error/10 text-error'
                    }`}
                  >
                    {user.isActive ? 'active' : 'inactive'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      void statusMutation.mutateAsync({ userId: user._id, isActive: !user.isActive });
                    }}
                    className="rounded-lg border border-border bg-bg-card px-3 py-1 text-xs text-text-secondary hover:border-accent-gold hover:text-accent-gold"
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usersQuery.isPending ? <p className="mt-4 text-sm text-text-secondary">Loading users...</p> : null}
    </section>
  );
}
