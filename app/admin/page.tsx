import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminOverview } from '@/lib/db';
import { AdminDashboard } from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect('/admin/login');
  }

  const overview = await getAdminOverview();
  return <AdminDashboard initialOverview={overview} />;
}
