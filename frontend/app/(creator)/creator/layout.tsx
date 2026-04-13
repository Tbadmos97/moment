import AuthGuard from '@/components/auth/AuthGuard';
import CreatorLayout from '@/components/creator/CreatorLayout';

export default function CreatorRouteLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={['creator', 'admin']}>
      <CreatorLayout>{children}</CreatorLayout>
    </AuthGuard>
  );
}
