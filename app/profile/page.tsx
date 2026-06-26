"use client"

import { useState } from "react"
import { ProfileForm } from "@/components/profile-form"
import { AuditLogs, AuditLog } from "@/components/audit-logs"
import { people, type Person } from "@/lib/people"

export default function ProfilePage() {
  // Current user is Lucy Pearl (people_11)
  const [person, setPerson] = useState<Person>(people.find(p => p.id === "people_11") || people[11])
  const [logs, setLogs] = useState<AuditLog[]>([])
  
  const handleSave = (updatedPerson: Person, newLogs: AuditLog[]) => {
    setPerson(updatedPerson)
    setLogs([...logs, ...newLogs])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage your personal information</p>
      </div>

      <ProfileForm 
        person={person} 
        currentUser={person} 
        onSave={handleSave} 
      />
      
      <AuditLogs logs={logs} />
    </div>
  )
}
