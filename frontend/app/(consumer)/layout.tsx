import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';

const CONSUMER_ROLES: Array<'consumer' | 'admin'> = ['consumer', 'admin'];

export default function ConsumerLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={CONSUMER_ROLES}>
      <div className="min-h-screen app-shell-bg bg-luxury-radial page-enter">
        <Header />
        {children}
      </div>
    </AuthGuard>
  );
}
