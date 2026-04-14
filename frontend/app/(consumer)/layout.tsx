import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';

const CONSUMER_ROLES: Array<'consumer' | 'admin'> = ['consumer', 'admin'];

export default function ConsumerLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={CONSUMER_ROLES}>
      <div className="min-h-screen bg-luxury-radial">
        <Header />
        {children}
      </div>
    </AuthGuard>
  );
}
