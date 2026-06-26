'use client';

import type { User, PerformanceCycle, StatItem, ChartBar, Deliverable } from './types';

export const mockUser: User = { id: 'member-001', name: 'Gabriel', role: 'member', department: 'oGV' };
export const mockCycle: PerformanceCycle = { id: 'cycle-2627-q1', name: 'Term 26.27 | Quarter 1', startDate: '2026-01-01', endDate: '2026-06-25' };
export const mockStats: StatItem[] = [
  { icon: 'fa-solid fa-bullseye', color: '#f59e0b', value: '85%', label: 'MoS Achieved' },
  { icon: 'fa-solid fa-plane-departure', color: '#10b981', value: 14, label: 'oGV Approvals' },
  { icon: 'fa-solid fa-user-clock', color: '#ec4899', value: 3, label: 'EPs to Contact' },
];
export const mockChartBars: ChartBar[] = [
  { month: 'Jan', value: 4, max: 10 },
  { month: 'Feb', value: 6, max: 10 },
  { month: 'Mar', value: 8, max: 10 },
  { month: 'Apr', value: 5, max: 10 },
  { month: 'May', value: 10, max: 10, isCurrent: true },
  { month: 'Jun', value: null, max: 10 },
];
export const mockDeliverables: Deliverable[] = [
  { id: 'd-001', title: 'EP Consultation Call: Sarah Jenkins', description: 'Conduct an initial consultation to align expectations for the Global Volunteer project in Brazil.', status: 'overdue', statusLabel: 'Overdue', dueLabel: 'SLA: Breached by 24hrs', isUrgent: true, tag: 'Operations', completed: false },
  { id: 'd-002', title: 'Submit Monthly Functional Review', description: 'Update your goal tracking sheet for the upcoming EB & Member sync.', status: 'action-required', statusLabel: 'Requires Action', dueLabel: 'Due: June 25, 2026', tag: 'Talent Management', completed: false },
  { id: 'd-003', title: 'Attend Local Committee Meeting (LCM)', description: 'Attended the monthly all-hands sync and onboarding refresh.', status: 'completed', statusLabel: 'Completed', completed: true },
];