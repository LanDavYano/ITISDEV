'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Dashboard from '@/components/dashboard';
import AnnouncementsModal from '@/components/announcements-modal';
import { roleHomePath } from '@/lib/roles';

interface DashData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string;
    role: string;
    roleLevel: number;
    department: string;
    subDepartment: string;
  };
  cycle: {
    _id: string;
    periodMonth: string;
    periodYear: number;
    submissionDeadline: string;
    isOpen: boolean;
  } | null;
  myRecord: {
    submittedAt: string | null;
    deliverablesAssigned: number;
    deliverablesAnswered: number;
    meetingsTotal: number;
    meetingsAttended: number;
  } | null;
  subDeptMembers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    roleLevel: number;
    hasSubmitted: boolean;
  }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashData, setDashData] = useState<DashData | null>(null);

  const roleLevel = session?.user?.roleLevel ?? 1;

  // Team leaders and department leaders go to their own landing page.
  useEffect(() => {
    if (status === 'authenticated' && roleLevel >= 2) {
      router.replace(roleHomePath(roleLevel));
    }
  }, [status, roleLevel, router]);

  // Fetch dashboard data once the member session is confirmed.
  useEffect(() => {
    if (status === 'authenticated' && roleLevel < 2) {
      fetch('/api/dashboard')
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setDashData(data);
        })
        .catch(console.error);
    }
  }, [status, roleLevel]);

  if (status === 'loading' || (status === 'authenticated' && roleLevel >= 2)) {
    return null;
  }

  return (
    <>
      <AnnouncementsModal />
      <Dashboard dashData={dashData} />
    </>
  );
}
