'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { voluntaryLogout } from '@/lib/logout';
import NotificationBell from '@/components/notification-bell';
import {
  LayoutDashboard, Globe, ListChecks, MessageSquare, FileText,
  Settings, HelpCircle, Search, Plus, Tag, Clock,
  BarChart3, ChevronDown, Check, X, AlertCircle,
  User as UserIcon, LogOut, Users, CheckCircle2, Timer, CalendarClock,
} from 'lucide-react';
import type { Deliverable, ChartBar } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

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

interface DashboardProps {
  dashData: DashData | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'LC Dashboard',      Icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Rating Submission', Icon: ListChecks,      href: '/performance' },
  { label: 'EXPA Leads',        Icon: Globe,           href: '/expa-leads' },
  { label: 'My Deliverables',   Icon: ListChecks,      href: '/my-task' },
  { label: 'EB Updates',        Icon: MessageSquare,   href: '/chats' },
  { label: 'Toolkits & Hub',    Icon: FileText,        href: '/documents' },
];

const BOTTOM_NAV = [
  { label: 'Settings',       Icon: Settings,   href: '/profile' },
  { label: 'Global Support', Icon: HelpCircle, href: '/support', badge: 2 },
];

const STATUS_STYLES: Record<Deliverable['status'], string> = {
  overdue:           'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  'action-required': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  completed:         'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function fmtDeadline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const DeliverableItem: React.FC<{ item: Deliverable; onToggle: (id: string) => void }> = ({ item, onToggle }) => (
  <div className={`flex gap-4 p-4 rounded-2xl border transition-colors ${
    item.completed
      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  }`}>
    <button
      onClick={() => onToggle(item.id)}
      role="checkbox"
      aria-checked={item.completed}
      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        item.completed
          ? 'bg-violet-400 border-violet-400 text-white'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
      }`}
    >
      {item.completed && <Check className="w-3 h-3" />}
    </button>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h4 className={`text-sm font-semibold ${
          item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
        }`}>{item.title}</h4>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[item.status]}`}>
          {item.statusLabel}
        </span>
      </div>
      {item.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{item.description}</p>
      )}
      {(item.dueLabel || item.tag) && (
        <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
          {item.dueLabel && (
            <span className={`flex items-center gap-1 ${item.isUrgent ? 'text-rose-500 font-semibold' : ''}`}>
              <Clock className="w-3 h-3" /> {item.dueLabel}
            </span>
          )}
          {item.tag && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" /> {item.tag}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

const MoSChart: React.FC<{ bars: ChartBar[] }> = ({ bars }) => {
  const max = Math.max(...bars.map((b) => b.max));
  return (
    <div className="flex items-end gap-3 h-44 pt-6">
      {bars.map((bar) => {
        const isEmpty = bar.value === null;
        const heightPct = isEmpty ? 8 : Math.round(((bar.value ?? 0) / max) * 100);
        return (
          <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {bar.value ?? '--'}
            </span>
            <div
              className={`w-full max-w-[40px] rounded-t-xl transition-colors ${
                bar.isCurrent
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : isEmpty
                  ? 'bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600'
                  : 'bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-600 dark:group-hover:bg-blue-500'
              }`}
              style={{ height: `${heightPct}%` }}
            />
            <span className={`text-xs font-medium ${
              bar.isCurrent ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400 dark:text-gray-500'
            }`}>{bar.month}</span>
          </div>
        );
      })}
    </div>
  );
};

// Placeholder chart bars until historical data is wired up
const PLACEHOLDER_BARS: ChartBar[] = (() => {
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((month, i) => ({
    month,
    value: i < now.getMonth() ? Math.floor(Math.random() * 8) + 2 : null,
    max: 10,
    isCurrent: i === now.getMonth(),
  }));
})();

// ── Main Component ────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({ dashData }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('/dashboard');
  const [deadlineDismissed, setDeadlineDismissed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Derived display values
  const firstName = dashData?.user.firstName ?? session?.user?.firstName ?? '';
  const lastName  = dashData?.user.lastName  ?? session?.user?.lastName  ?? '';
  const email     = dashData?.user.email     ?? session?.user?.email     ?? '';
  const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
  const profilePic = dashData?.user.profilePicture;
  const showPic   = !!(profilePic && profilePic !== '/images/default-avatar.png' && !imgError);

  const cycle     = dashData?.cycle ?? null;
  const myRecord  = dashData?.myRecord ?? null;
  const hasSubmitted = !!(myRecord?.submittedAt);
  // A closed cycle nobody submitted to (e.g. a test cycle) isn't actionable —
  // treat it the same as having no active cycle rather than showing it as pending.
  const cycleIsActive = !!cycle && (cycle.isOpen || hasSubmitted);
  const daysLeft  = cycle ? daysUntil(cycle.submissionDeadline) : null;
  const isUrgent  = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  const subDeptMembers = dashData?.subDeptMembers ?? [];
  const submittedCount = subDeptMembers.filter((m) => m.hasSubmitted).length;

  // Stats derived from real data
  const stats = [
    {
      icon: <CalendarClock className="w-5 h-5" />,
      color: isUrgent ? '#ef4444' : '#3b82f6',
      value: cycle
        ? daysLeft !== null && daysLeft < 0
          ? 'Closed'
          : daysLeft === 0
          ? 'Today'
          : `${daysLeft}d`
        : '—',
      label: 'Days Until Deadline',
    },
    {
      icon: <ListChecks className="w-5 h-5" />,
      color: '#10b981',
      value: myRecord
        ? `${myRecord.deliverablesAnswered}/${myRecord.deliverablesAssigned}`
        : '—',
      label: 'Deliverables',
    },
    {
      icon: <Users className="w-5 h-5" />,
      color: '#8b5cf6',
      value: myRecord
        ? `${myRecord.meetingsAttended}/${myRecord.meetingsTotal}`
        : '—',
      label: 'Meetings Attended',
    },
  ];

  const toggleDeliverable = useCallback((id: string) => {
    setDeliverables((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              completed: !d.completed,
              status: (!d.completed ? 'completed' : 'action-required') as Deliverable['status'],
              statusLabel: !d.completed ? 'Completed' : 'Requires Action',
            }
          : d
      )
    );
  }, []);

  const filteredDeliverables = searchQuery.trim()
    ? deliverables.filter((d) => {
        const q = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.tag?.toLowerCase().includes(q)
        );
      })
    : deliverables;

  const handleNav = (href: string) => {
    setActiveNav(href);
    router.push(href);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-6 py-5 cursor-pointer"
          onClick={() => handleNav('/dashboard')}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            A
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            AIESEC
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ label, Icon, href }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === href
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
          {BOTTOM_NAV.map(({ label, Icon, href, badge }) => (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {badge && badge > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 w-72">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 transition-all overflow-hidden"
              >
                {showPic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePic!}
                    alt={initials}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    {/* Mini profile picture */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                        {showPic ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profilePic!} alt={initials} className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {firstName} {lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
                      </div>
                    </div>
                    {dashData?.user.role && (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {dashData.user.role}
                      </span>
                    )}
                    {dashData?.user.department && (
                      <span className="inline-block ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {dashData.user.department}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); handleNav('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" /> View Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); handleNav('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={() => voluntaryLogout('/')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

            {/* ── Welcome ── */}
            <div className="flex items-start justify-between">
              <div>
                {cycleIsActive && cycle ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {cycle.periodMonth} {cycle.periodYear} Evaluation Cycle
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">No active cycle</p>
                )}
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {getGreeting()}{firstName ? `, ${firstName}` : ''}!
                </h1>
                {dashData?.user.subDepartment && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {dashData.user.department}
                    {dashData.user.subDepartment ? ` · ${dashData.user.subDepartment}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* ── Deadline Alert Banner ── */}
            {cycleIsActive && cycle && !deadlineDismissed && (
              <div className={`flex items-center justify-between rounded-2xl p-5 border ${
                hasSubmitted
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                  : isUrgent
                  ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    hasSubmitted
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : isUrgent
                      ? 'bg-rose-100 dark:bg-rose-900/40'
                      : 'bg-amber-100 dark:bg-amber-900/40'
                  }`}>
                    {hasSubmitted
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <AlertCircle className={`w-5 h-5 ${isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
                    }
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold mb-0.5 ${
                      hasSubmitted
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : isUrgent
                        ? 'text-rose-900 dark:text-rose-200'
                        : 'text-amber-900 dark:text-amber-200'
                    }`}>
                      {hasSubmitted
                        ? `Rating Submitted — ${cycle.periodMonth} ${cycle.periodYear}`
                        : isUrgent && daysLeft === 0
                        ? 'Rating Due Today!'
                        : isUrgent
                        ? `Rating Due in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}!`
                        : 'Performance Rating Due'
                      }
                    </h4>
                    <p className={`text-xs ${
                      hasSubmitted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isUrgent
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {hasSubmitted
                        ? 'You\'ve submitted your self-rating for this cycle.'
                        : `Deadline: ${fmtDeadline(cycle.submissionDeadline)}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {!hasSubmitted && cycle.isOpen && (
                    <button
                      onClick={() => handleNav('/performance')}
                      className={`text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                        isUrgent
                          ? 'bg-rose-500 hover:bg-rose-600'
                          : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      Submit Now
                    </button>
                  )}
                  <button
                    onClick={() => setDeadlineDismissed(true)}
                    className={`transition-colors p-1 ${
                      hasSubmitted
                        ? 'text-emerald-500 hover:text-emerald-700'
                        : isUrgent
                        ? 'text-rose-500 hover:text-rose-700'
                        : 'text-amber-500 hover:text-amber-700'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Rating Submission CTA (shown only when not yet submitted + cycle open) ── */}
            {cycle?.isOpen && !hasSubmitted && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-0.5">
                      Performance Rating Submission Open
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Submit your self-rating for {cycle.periodMonth} {cycle.periodYear}. Your team leader has assigned your deliverables &amp; meetings.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNav('/performance')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0 ml-4"
                >
                  Open Submission Form
                </button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0" style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${dashData ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 animate-pulse'}`}>
                      {dashData ? stat.value : '—'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Sub-Department Member Status ── */}
            {subDeptMembers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {dashData?.user.subDepartment || 'My Sub-Department'} — Submission Status
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {submittedCount}/{subDeptMembers.length} submitted
                  </span>
                </div>
                <div className="space-y-1">
                  {subDeptMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                            {member._id === dashData?.user.id && (
                              <span className="ml-2 text-xs text-blue-500 font-normal">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        member.hasSubmitted
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {member.hasSubmitted
                          ? <><CheckCircle2 className="w-3 h-3" /> Submitted</>
                          : <><Timer className="w-3 h-3" /> Pending</>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MoS Chart (placeholder until historical data is wired) ── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  MoS Achievement Trend
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg">
                  {new Date().getFullYear()}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Historical chart coming soon</p>
              <MoSChart bars={PLACEHOLDER_BARS} />
            </div>

            {/* ── Deliverables (empty state until /my-task is the source) ── */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-gray-400" />
                  My Deliverables
                </h3>
                <button
                  onClick={() => handleNav('/my-task')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View all →
                </button>
              </div>

              {filteredDeliverables.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-1">All caught up!</h4>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Your deliverables will appear here once your team leader assigns them.
                  </p>
                  <button
                    onClick={() => handleNav('/my-task')}
                    className="mt-4 text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Go to My Tasks
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeliverables.map((item) => (
                    <DeliverableItem key={item.id} item={item} onToggle={toggleDeliverable} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
