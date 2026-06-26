"use client"

import { DatabaseProfileForm } from "@/components/database-profile-form"

export default function ProfilePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage your personal information</p>
      </div>

      <DatabaseProfileForm />
    </div>
  )
}
