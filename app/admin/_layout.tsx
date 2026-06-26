import { AdminSessionProvider } from '@/src/admin/AdminSessionContext';
import { AdminAuthGate } from './_components/AdminAuthGate';
import { AdminShell } from './_components/AdminShell';

export default function AdminLayout() {
  return (
    <AdminSessionProvider>
      <AdminAuthGate>
        <AdminShell />
      </AdminAuthGate>
    </AdminSessionProvider>
  );
}
