"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle2, Info, AlertCircle, MailOpen, Trash2, GraduationCap, Clock, Check, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc, writeBatch } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NotificationsPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  // 1. Fetch Student Profile
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email))
  }, [firestore, user])
  const { data: studentsData, isLoading: loadingStudent } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // 2. Fetch Notifications
  const notifsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "notifications"), where("studentId", "==", student.id))
  }, [firestore, student?.id])
  const { data: notifications, isLoading: loadingNotifs } = useCollection(notifsQuery)

  const unreadCount = useMemo(() => {
    return (notifications || []).filter(n => !n.read).length
  }, [notifications])

  // Handlers
  const handleMarkAsRead = async (notifId: string) => {
    if (!firestore) return
    const docRef = doc(firestore, "notifications", notifId)
    await updateDocumentNonBlocking(docRef, { read: true })
  }

  const handleMarkAllRead = async () => {
    if (!firestore || !notifications) return
    const unread = notifications.filter(n => !n.read)
    if (unread.length === 0) return

    const batch = writeBatch(firestore)
    unread.forEach(n => {
      batch.update(doc(firestore, "notifications", n.id), { read: true })
    })
    await batch.commit()
    toast({ title: "Marked All Read", description: "All notifications have been marked as read." })
  }

  const handleDelete = async (notifId: string) => {
    if (!firestore) return
    try {
      const batch = writeBatch(firestore)
      batch.delete(doc(firestore, "notifications", notifId))
      await batch.commit()
      toast({ title: "Deleted", description: "Notification removed." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete notification.", variant: "destructive" })
    }
  }

  const handleClearAll = async () => {
    if (!firestore || !notifications || notifications.length === 0) return
    if (!confirm("Are you sure you want to permanently delete all your notification history?")) return

    const batch = writeBatch(firestore)
    const toDelete = notifications.slice(0, 450)
    toDelete.forEach(n => {
      batch.delete(doc(firestore, "notifications", n.id))
    })
    
    try {
      await batch.commit()
      toast({ title: "History Cleared", description: "Your entire notification history has been deleted." })
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" })
    }
  }

  // Sort local memory so newest is at top (since we avoid ordering in query due to index issues sometimes)
  const sortedNotifications = useMemo(() => {
    if (!notifications) return []
    return [...notifications].sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0
      const timeB = b.createdAt?.seconds || 0
      return timeB - timeA
    })
  }, [notifications])

  if (loadingStudent || loadingNotifs) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-500">Loading your notifications...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Communications</p>
          <h1 className="text-2xl font-bold text-slate-900">Notification History</h1>
          <p className="text-sm text-slate-500 mt-0.5">Stay updated on your academic progress and institutional announcements.</p>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 ? (
            <Button 
              className="h-10 px-4 rounded-lg text-sm font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
              onClick={handleMarkAllRead}
            >
              <Check className="mr-2 h-4 w-4" /> Mark {unreadCount} Read
            </Button>
          ) : sortedNotifications.length > 0 ? (
            <Button 
              variant="outline"
              className="h-10 px-4 rounded-lg text-sm font-medium shadow-sm border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
              onClick={handleClearAll}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear History
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <div className="divide-y divide-slate-100">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-5 transition-all relative group flex flex-col sm:flex-row sm:items-start gap-4 ${!n.read ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}
              >
                <div className={`mt-1 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  n.type === 'Academic' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {n.type === 'Academic' ? <GraduationCap className="h-6 w-6" /> : <Info className="h-6 w-6" />}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <h3 className={`text-base font-bold leading-none tracking-tight ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : "Just now"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 shadow-none font-bold text-[10px]">
                          NEW
                        </Badge>
                      )}
                      {n.link && (
                        <Link href={n.link}>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold hidden sm:flex">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 leading-relaxed font-medium max-w-2xl pt-2">
                    {n.message}
                  </p>
                </div>

                <div className="absolute top-4 right-4 sm:static sm:mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.read && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleMarkAsRead(n.id)}
                      title="Mark as read"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(n.id)}
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center px-10">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-5 border border-slate-100">
                <Bell className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">You're all caught up!</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium max-w-md">
                There are currently no announcements or notifications in your history. When important updates happen, they will appear here.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
