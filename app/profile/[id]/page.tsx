"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProfileForm } from "@/components/profile-form"
import { AuditLogs, AuditLog } from "@/components/audit-logs"
import { people, type Person } from "@/lib/people"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [person, setPerson] = useState<Person | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])

  // Mocking the current user as Lucy Pearl (people_11)
  const currentUser = people.find(p => p.id === "people_11") || people[11]

  useEffect(() => {
    const id = params.id as string
    const foundPerson = people.find(p => p.id === id)
    if (foundPerson) {
      setPerson(foundPerson)
    }
  }, [params.id])

  const handleSave = (updatedPerson: Person, newLogs: AuditLog[]) => {
    setPerson(updatedPerson)
    setLogs([...logs, ...newLogs])
  }

  if (!person) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{person.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {person.department} • {person.subDepartment}
          </p>
        </div>
      </div>

      <ProfileForm
        person={person}
        currentUser={currentUser}
        onSave={handleSave}
      />

      <AuditLogs logs={logs} />
    </div>
  )
}
