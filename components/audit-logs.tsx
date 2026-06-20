"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, ArrowRight, User, Calendar } from "lucide-react"
import { format } from "date-fns"

export interface AuditLog {
  field: string
  oldValue: any
  newValue: any
  editor: string
  timestamp: string
}

interface AuditLogsProps {
  logs: AuditLog[]
}

export function AuditLogs({ logs }: AuditLogsProps) {
  if (logs.length === 0) return null

  return (
    <Card className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center">
          <History className="w-5 h-5 mr-2" /> Change History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {logs.slice().reverse().map((log, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                    Field: {log.field}
                  </span>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(log.timestamp), "MMM d, yyyy • HH:mm")}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-sm mb-3">
                  <span className="text-gray-500 dark:text-gray-400 line-through truncate max-w-[150px]">
                    {String(log.oldValue)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {String(log.newValue)}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                  <User className="w-3 h-3 mr-1" />
                  Edited by <span className="font-semibold ml-1 text-gray-700 dark:text-gray-300">{log.editor}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
