import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';

export default function ConsumerLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <AuthGuard allowRoles={['consumer', 'admin']}>
      <div className="min-h-screen bg-luxury-radial">
        <Header />
        {children}
      </div>
    </AuthGuard>
  );
}
