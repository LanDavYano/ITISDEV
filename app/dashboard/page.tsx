'use client';

import Dashboard from '@/components/dashboard';
import { mockUser, mockCycle, mockStats, mockChartBars, mockDeliverables } from '@/components/mockData';

export default function DashboardPage() {
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