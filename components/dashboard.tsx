'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Globe, ListChecks, MessageSquare, FileText,
  Settings, HelpCircle, Search, Bell, Plus, Download, Tag, Clock,
  BarChart3, ChevronDown, Check, X, AlertCircle, FolderOpen,
  User, LogOut,
} from 'lucide-react';
import type { Deliverable, StatItem, ChartBar, PerformanceCycle, User } from './types';

const NAV_ITEMS = [
  { label: 'LC Dashboard',   Icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Rating Submission', Icon: ListChecks,   href: '/performance' },
  { label: 'EXPA Leads',     Icon: Globe,           href: '/expa-leads' },
  { label: 'My Deliverables',Icon: ListChecks,      href: '/my-task' },
  { label: 'EB Updates',     Icon: MessageSquare,   href: '/chats' },
  { label: 'Toolkits & Hub', Icon: FileText,        href: '/documents' },
];

const BOTTOM_NAV = [
  { label: 'Settings',       Icon: Settings,    href: '/profile', badge: 0 },
  { label: 'Global Support', Icon: HelpCircle,  href: '/support', badge: 2 },
];

const STATUS_STYLES: Record<Deliverable['status'], string> = {
  overdue:          'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  'action-required':'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  completed:        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

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
        }`}>
          {item.title}
        </h4>
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
            }`}>
              {bar.month}
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface DashboardProps {
  user: User;
  cycle: PerformanceCycle;
  stats: StatItem[];
  chartBars: ChartBar[];
  initialDeliverables: Deliverable[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, cycle, stats, chartBars, initialDeliverables }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState('/dashboard');
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const initials = session?.user
    ? `${session.user.firstName?.[0] ?? ''}${session.user.lastName?.[0] ?? ''}`.toUpperCase() || user.name[0]
    : user.name[0];

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

  const pendingCount = deliverables.filter((d) => !d.completed).length;

  const handleNav = (href: string) => {
    setActiveNav(href);
    router.push(href);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

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
              {href === '/my-task' && pendingCount > 0 && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeNav === href
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Portfolios */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">
            My Portfolios
            <button onClick={() => handleNav('/projects')} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => handleNav('/projects')} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
            oGV Summer Peak
          </button>
          <button onClick={() => handleNav('/projects')} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            Talent Management
          </button>
        </div>

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
              {badge > 0 && (
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
              placeholder="Search deliverables, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 w-full"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs border border-gray-300 dark:border-gray-600 text-gray-400 px-1.5 py-0.5 rounded">⌘F</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNav('/my-task')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log EP Contact
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
            <button
              onClick={() => handleNav('/chats')}
              className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 transition-all"
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {session?.user?.name ?? user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {session?.user?.email ?? ''}
                    </p>
                    {(session?.user?.role ?? user.role) && (
                      <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {session?.user?.role ?? user.role}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); handleNav('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User className="w-4 h-4" /> View Profile
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
                      onClick={() => signOut({ callbackUrl: '/' })}
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

            {/* Welcome */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{cycle.name}</p>
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {getGreeting()}, {user.name}!
                </h1>
              </div>
              <button
                onClick={() => alert('Export — wire to your export API')}
                className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Export MoS Report
              </button>
            </div>

            {/* Performance submission CTA */}
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-0.5">
                    Performance Rating Submission
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Submit your goals and self-ratings for the current cycle, and review
                    your assigned deliverables &amp; meetings.
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

            {/* Alert banner */}
            {!alertDismissed && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                      Action Required: Initial LDA Submission
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Your Leadership Development Assessment is pending. Deadline:{' '}
                      {new Date(cycle.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleNav('/my-task')}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    Take LDA Now
                  </button>
                  <button
                    onClick={() => setAlertDismissed(true)}
                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <i className={`${stat.icon} text-lg`} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  MoS Achievement Trend (oGV Approvals)
                </h3>
                <button className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-sm px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  2026 <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <MoSChart bars={chartBars} />
            </div>

            {/* Deliverables card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  Pending Deliverables &amp; LC Tracking
                </h3>
                {searchQuery && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {filteredDeliverables.length} result{filteredDeliverables.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              {filteredDeliverables.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    {searchQuery ? 'No matching deliverables' : 'All caught up!'}
                  </h4>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {searchQuery ? `No results for "${searchQuery}"` : 'No pending deliverables for this cycle.'}
                  </p>
                  {searchQuery && (
                    <button
                      className="mt-4 text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  )}
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
