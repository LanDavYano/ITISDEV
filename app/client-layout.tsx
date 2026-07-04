"use client"

import type React from "react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"

interface Project {
  id: string
  name: string
  color: string
}

// Pages that render without the dashboard chrome (sidebar/header) — they
// bring their own layout. Matched exactly, or by prefix for nested routes.
const PUBLIC_ROUTES = ["/", "/login", "/register", "/register/admin", "/forgot-password", "/dashboard", "/admin", "/admin/deadline"]
const PUBLIC_PREFIXES = ["/admin/submissions", "/performance", "/team"]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Event Planning", color: "bg-pink-200" },
    { id: "2", name: "Breakfast Plan", color: "bg-green-200" },
  ])

  const handleAddProject = (project: Omit<Project, "id">) => {
    const newProject = {
      ...project,
      id: Date.now().toString(),
    }
    setProjects([...projects, newProject])
  }

  // Landing / auth / feature pages stand on their own — no sidebar or top header.
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return <>{children}</>
  }

  return (
    <DashboardLayout projects={projects} onAddProject={handleAddProject}>
      {children}
    </DashboardLayout>
  )
}
