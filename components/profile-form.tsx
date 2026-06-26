"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Person, teams } from "@/lib/people"
import { toast } from "sonner"
import { Check, Edit2, X, Shield, User } from "lucide-react"

interface ProfileFormProps {
  person: Person
  currentUser: Person
  onSave: (updatedPerson: Person, changes: any[]) => void
}

export function ProfileForm({ person, currentUser, onSave }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Person>(person)
  
  const isAdmin = currentUser.role === "admin"
  const isOwnProfile = currentUser.id === person.id
  
  // Fields that only admin can edit
  const adminOnlyFields = ["department", "subDepartment", "role", "team"]
  
  const handleSave = () => {
    const changes: any[] = []
    
    // Compare and track changes
    Object.keys(formData).forEach((key) => {
      const field = key as keyof Person
      if (formData[field] !== person[field]) {
        changes.push({
          field: key,
          oldValue: person[field],
          newValue: formData[field],
          editor: currentUser.name,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    if (changes.length > 0) {
      onSave(formData, changes)
      toast.success("Profile updated successfully!")
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData(person)
    setIsEditing(false)
  }

  const canEditField = (fieldName: string) => {
    if (isAdmin) return true
    if (isOwnProfile && !adminOnlyFields.includes(fieldName)) return true
    return false
  }

  return (
    <Card className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center">
          {isOwnProfile ? "My Profile" : "User Profile"}
          {person.role === "admin" && (
            <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Shield className="w-3 h-3 mr-1" /> Admin
            </Badge>
          )}
        </CardTitle>
        {!isEditing ? (
          (isOwnProfile || isAdmin) && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          )
        ) : (
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Personal Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing || !canEditField("name")}
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing || !canEditField("email")}
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing || !canEditField("phone")}
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Organizational Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Organization</h3>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={!isEditing || !canEditField("department")}
                  className="bg-gray-50 dark:bg-gray-900"
                />
                {!canEditField("department") && (
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" title="Admin only" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subDepartment">Sub-department</Label>
              <div className="relative">
                <Input
                  id="subDepartment"
                  value={formData.subDepartment}
                  onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                  disabled={!isEditing || !canEditField("subDepartment")}
                  className="bg-gray-50 dark:bg-gray-900"
                />
                {!canEditField("subDepartment") && (
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" title="Admin only" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team Tag</Label>
              <Select
                disabled={!isEditing || !canEditField("team")}
                value={formData.team}
                onValueChange={(val) => setFormData({ ...formData, team: val })}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-900">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="role">Global Role</Label>
                <Select
                  disabled={!isEditing}
                  value={formData.role}
                  onValueChange={(val: "admin" | "member") => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-900 font-medium text-purple-600 dark:text-purple-400">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        {isEditing && !isAdmin && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center mt-4">
            <Shield className="w-3 h-3 mr-1" /> Some fields are restricted to administrator editing only.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
