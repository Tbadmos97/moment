import AuthGuard from '@/components/auth/AuthGuard';
import CreatorLayout from '@/components/creator/CreatorLayout';

const CREATOR_ROLES: Array<'creator' | 'admin'> = ['creator', 'admin'];

export default function CreatorRouteLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={CREATOR_ROLES}>
      <CreatorLayout>{children}</CreatorLayout>
    </AuthGuard>
  );
}
