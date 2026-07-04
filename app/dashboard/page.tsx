
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dashboard from '@/components/dashboard';
import { roleHomePath } from '@/lib/roles';
import { mockUser, mockCycle, mockStats, mockChartBars, mockDeliverables } from '@/components/mockData';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const roleLevel = session?.user?.roleLevel ?? 1;

  // Team leaders and department leaders belong on /admin — send them to
  // their own landing page instead of the member dashboard.
  useEffect(() => {
    if (status === 'authenticated' && roleLevel >= 2) {
      router.replace(roleHomePath(roleLevel));
    }
  }, [status, roleLevel, router]);

  if (status === 'loading' || (status === 'authenticated' && roleLevel >= 2)) {
    return null; // avoid flashing the member dashboard while redirecting
  }

  return (
    <Dashboard
      user={mockUser}
      cycle={mockCycle}
      stats={mockStats}
      chartBars={mockChartBars}
      initialDeliverables={mockDeliverables}
    />
  );
}
