export type UserRole = 'member' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
}

export interface PerformanceCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface StatItem {
  icon: string;
  color: string;
  value: string | number;
  label: string;
}

export interface ChartBar {
  month: string;
  value: number | null;
  max: number;
  isCurrent?: boolean;
}

export interface Deliverable {
  id: string;
  title: string;
  description?: string;
  status: 'overdue' | 'action-required' | 'completed';
  statusLabel: string;
  dueLabel?: string;
  isUrgent?: boolean;
  tag?: string;
  completed: boolean;
}