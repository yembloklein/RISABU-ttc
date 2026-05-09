"use client"

import { useState, useMemo } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle2, Info, AlertCircle, X, MailOpen, Trash2, GraduationCap, ChevronRight } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, limit, doc, writeBatch } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function NotificationBell({ studentId }: { studentId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const firestore = useFirestore()

  const notifsQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null
    // Using a simpler query first to avoid index errors, but trying to order if possible
    return query(
      collection(firestore, "notifications"),
      where("studentId", "==", studentId)
    )

  }, [firestore, studentId])

  const { data: notifications } = useCollection(notifsQuery)

  const unreadCount = useMemo(() => {
    return (notifications || []).filter(n => !n.read).length
  }, [notifications])

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
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-300 group"
        >
          <Bell className="h-5 w-5 text-slate-500 group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white shadow-sm"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 overflow-hidden border-0 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl bg-white/95 backdrop-blur-sm" align="end" sideOffset={8}>
        {/* Header */}
        <div className="bg-white p-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Notifications</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Stay updated with your progress</p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 h-7 rounded-md"
            >
              <MailOpen className="h-3 w-3 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>
        
        {/* List */}
        <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 hover:bg-slate-50/50 transition-all cursor-pointer relative group ${!n.read ? 'bg-emerald-50/20' : ''}`}
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  <div className="flex gap-4">
                    <div className={`mt-1 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      n.type === 'Academic' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {n.type === 'Academic' ? <GraduationCap className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1 pr-4">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold leading-none tracking-tight ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] font-bold text-slate-300 uppercase whitespace-nowrap">
                          {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "now"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pr-2 font-medium">
                        {n.message}
                      </p>
                    </div>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />
                  )}
                  {!n.read && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 h-1.5 w-1.5 bg-emerald-600 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                  )}
                </div>
              ))}
            </div>

          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-900">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">No new notifications to show right now.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs font-bold text-slate-500 hover:text-slate-900 justify-between group"
          >
            <span>VIEW NOTIFICATION HISTORY</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
