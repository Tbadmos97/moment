import AuthGuard from '@/components/auth/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';

const ADMIN_ROLES: Array<'admin'> = ['admin'];

export default function AdminRouteLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={ADMIN_ROLES}>
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
