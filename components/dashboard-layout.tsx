<<<<<<< HEAD
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LayoutDashboard, Globe, ListChecks, MessageSquare, FileText,
  Settings, HelpCircle, Plus, Bell, Search, ChevronDown,
  User, LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "LC Dashboard",    Icon: LayoutDashboard, href: "/dashboard" },
  { label: "EXPA Leads",      Icon: Globe,           href: "/expa-leads" },
  { label: "My Deliverables", Icon: ListChecks,      href: "/my-task" },
  { label: "EB Updates",      Icon: MessageSquare,   href: "/chats" },
  { label: "Toolkits & Hub",  Icon: FileText,        href: "/documents" },
]

const BOTTOM_NAV = [
  { label: "Settings",       Icon: Settings,   href: "/profile" },
  { label: "Global Support", Icon: HelpCircle, href: "/support", badge: 2 },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  projects?: { id: string; name: string; color: string }[]
  onAddProject?: (project: { name: string; color: string }) => void
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = session?.user
    ? `${session.user.firstName?.[0] ?? ''}${session.user.lastName?.[0] ?? ''}`.toUpperCase() || 'G'
    : 'G'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-6 py-5 cursor-pointer"
          onClick={() => router.push("/dashboard")}
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
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Portfolios */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">
            My Portfolios
            <button className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => router.push("/projects")}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
            oGV Summer Peak
          </button>
          <button
            onClick={() => router.push("/projects")}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            Talent Management
          </button>
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
          {BOTTOM_NAV.map(({ label, Icon, href, badge }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
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
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 w-full"
            />
            <span className="text-xs border border-gray-300 dark:border-gray-600 text-gray-400 px-1.5 py-0.5 rounded">⌘F</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/my-task")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log EP Contact
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => router.push("/chats")}
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
                      {session?.user?.name ?? 'AIESEC Member'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {session?.user?.email ?? ''}
                    </p>
                    {session?.user?.role && (
                      <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {session.user.role}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); router.push('/profile') }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User className="w-4 h-4" /> View Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); router.push('/profile') }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
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

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </div>
    </div>
  )
}
=======
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { people } from "@/lib/people"
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  BarChart3,
  MessageSquare,
  FileText,
  Receipt,
  Settings,
  HelpCircle,
  User,
  LogOut,
  Folder,
  LayoutTemplateIcon as Template,
  Import,
  CheckCircle,
  Users,
} from "lucide-react"

interface Project {
  id: string
  name: string
  color: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  projects: Project[]
  onAddProject: (project: Omit<Project, "id">) => void
}

export default function DashboardLayout({ children, projects, onAddProject }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-200")
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)

  // Get current user (John Doe - people_11)
  const currentUser = people.find((person) => person.id === "people_11") || people[11]

  const sidebarItems = [
    { name: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { name: "Projects", icon: FileText, path: "/projects" },
    { name: "My Task", icon: CheckCircle, path: "/my-task" },
    { name: "People", icon: Users, path: "/people" },
    { name: "Chats", icon: MessageSquare, path: "/chats" },
    { name: "Documents", icon: FileText, path: "/documents" },
    { name: "Receipts", icon: Receipt, path: "/receipts" },
  ]

  const colorOptions = [
    { name: "Blue", value: "bg-blue-200 dark:bg-blue-800" },
    { name: "Pink", value: "bg-pink-200 dark:bg-pink-800" },
    { name: "Green", value: "bg-green-200 dark:bg-green-800" },
    { name: "Yellow", value: "bg-yellow-200 dark:bg-yellow-800" },
    { name: "Purple", value: "bg-purple-200 dark:bg-purple-800" },
    { name: "Red", value: "bg-red-200 dark:bg-red-800" },
  ]

  const notifications = [
    {
      id: 1,
      title: "New task assigned",
      message: `${people[0].name} assigned you to 'Help DStudio get more customers'`,
      time: "2 minutes ago",
      unread: true,
    },
    {
      id: 2,
      title: "Meeting reminder",
      message: "Kickoff Meeting starts in 30 minutes",
      time: "28 minutes ago",
      unread: true,
    },
    {
      id: 3,
      title: "Task completed",
      message: `${people[2].name} completed 'Return a package'`,
      time: "1 hour ago",
      unread: false,
    },
    {
      id: 4,
      title: "Comment added",
      message: `${people[1].name} commented on 'Plan a trip'`,
      time: "2 hours ago",
      unread: false,
    },
  ]

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject({
        name: newProjectName.trim(),
        color: newProjectColor,
      })
      setNewProjectName("")
      setNewProjectColor("bg-blue-200 dark:bg-blue-800")
      setIsProjectDialogOpen(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mondays</h1>
        </div>

        <nav className="flex-1 px-4">
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors ${pathname === item.path
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Projects</span>
              <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">Add New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-name" className="text-gray-700 dark:text-gray-300">
                        Project Name
                      </Label>
                      <Input
                        id="project-name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Project Color</Label>
                      <div className="flex space-x-2 mt-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setNewProjectColor(color.value)}
                            className={`w-8 h-8 rounded-full ${color.value} border-2 ${newProjectColor === color.value
                                ? "border-gray-800 dark:border-gray-200"
                                : "border-gray-300 dark:border-gray-600"
                              }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddProject}>Add Project</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {projects.map((project) => (
              <div key={project.id} className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full ${project.color} mr-2`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{project.name}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>
            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
              <Badge
                variant="secondary"
                className="ml-auto bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
              >
                8
              </Badge>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search or type a command"
                  className="pl-10 w-80 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">⌘ F</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-r-none">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-l-none border-l border-blue-500 dark:border-blue-600 px-2">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Folder className="w-4 h-4 mr-2" />
                      New Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Template className="w-4 h-4 mr-2" />
                      From Template
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Import className="w-4 h-4 mr-2" />
                      Import Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ThemeToggle />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  align="end"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">
                        Mark all as read
                      </Button>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg ${notification.unread ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-700"
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{notification.time}</p>
                            </div>
                            {notification.unread && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  align="end"
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={currentUser.imageURL || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                          {currentUser.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{currentUser.email}</p>
                      </div>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => router.push("/profile")}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Profile Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help & Support
                      </Button>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-700" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">{children}</div>
      </div>
    </div>
  )
}
>>>>>>> a9e1b78 (feat: implement full authentication flow with role-based routing)
