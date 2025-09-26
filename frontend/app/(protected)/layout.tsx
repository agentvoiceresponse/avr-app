import { AuthGuard } from '@/components/auth-guard';
import { AppShell } from '@/components/layout/app-shell';

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
