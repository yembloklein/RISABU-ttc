"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/ui/logo"
import { Search, MessageSquare, CheckCircle2, Loader2, Send, User, Filter, AlertCircle, Clock, Inbox, MailOpen } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

export default function AdminSupportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [replyMessage, setReplyMessage] = useState("")
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  
  const firestore = useFirestore()
  const { user } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Tickets
  const ticketsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "tickets"), orderBy("updatedAt", "desc")) : null, [firestore, user])
  const { data: tickets, isLoading: loadingTickets } = useCollection(ticketsRef)

  // 2. Filtering Logic
  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(ticket => {
      const matchesSearch = 
        ticket.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [tickets, searchTerm, selectedStatus])

  const activeTicket = useMemo(() => {
    return tickets?.find(t => t.id === activeTicketId) || null
  }, [tickets, activeTicketId])

  // Auto-scroll to bottom of chat when active ticket changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeTicket, replyMessage])

  // Set first ticket as active automatically
  useEffect(() => {
    if (!activeTicketId && filteredTickets.length > 0) {
      setActiveTicketId(filteredTickets[0].id)
    }
  }, [filteredTickets, activeTicketId])

  const handleSendReply = async () => {
    if (!firestore || !activeTicket || !replyMessage.trim()) return

    try {
      const ticketRef = doc(firestore, "tickets", activeTicket.id)
      
      const response = {
        message: replyMessage,
        createdAt: new Date(), 
        author: "Admin"
      }

      await updateDocumentNonBlocking(ticketRef, {
        responses: arrayUnion({
          ...response,
          createdAt: new Date() 
        }),
        status: "In Progress",
        updatedAt: serverTimestamp()
      })

      // Create Notification for student
      await addDoc(collection(firestore, "notifications"), {
        studentId: activeTicket.studentId,
        title: "Support Reply Received",
        message: `An administrator has replied to your ticket: "${activeTicket.title}"`,
        type: "Support",
        link: "/portal/support",
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({ title: "Reply Sent", description: "The student has been notified." })
      setReplyMessage("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleCloseTicket = async () => {
    if (!firestore || !activeTicket) return
    try {
      const ticketRef = doc(firestore, "tickets", activeTicket.id)
      await updateDocumentNonBlocking(ticketRef, { 
        status: "Closed",
        updatedAt: serverTimestamp()
      })
      toast({ title: "Ticket Closed", description: "Inquiry has been marked as resolved." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Support Center</h1>
          <p className="text-slate-500 font-medium text-sm">Manage student inquiries and provide assistance</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar - Ticket List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 w-[110px] rounded-xl bg-white border-slate-200 shadow-sm text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">Active</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="flex-1 border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Inbox</span>
              <Badge variant="secondary" className="bg-slate-200/50 text-slate-500 text-[9px] font-bold">
                {filteredTickets.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {loadingTickets ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setActiveTicketId(ticket.id)}
                      className={`w-full text-left p-4 transition-all hover:bg-slate-50 focus:outline-none ${activeTicketId === ticket.id ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-900 text-sm truncate pr-2">{ticket.studentName}</span>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {ticket.updatedAt?.seconds ? formatDistanceToNow(ticket.updatedAt.seconds * 1000, { addSuffix: true }) : 'Now'}
                        </span>
                      </div>
                      <h4 className={`text-xs font-semibold mb-1 truncate ${activeTicketId === ticket.id ? 'text-primary' : 'text-slate-700'}`}>
                        {ticket.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {ticket.message}
                      </p>
                      <div className="flex justify-between items-center">
                        <Badge className={`border-0 font-bold uppercase text-[8px] px-1.5 py-0 shadow-none ${
                          ticket.status === 'Open' ? 'bg-amber-100 text-amber-700' : 
                          ticket.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200 text-slate-400 text-[8px] px-1.5 py-0 uppercase">
                          {ticket.category}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400">
                  <Inbox className="h-10 w-10 mb-3 text-slate-200" />
                  <p className="text-sm font-medium">No tickets found</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Pane - Chat View */}
        <Card className="hidden md:flex flex-1 border border-slate-200 shadow-sm rounded-2xl bg-white flex-col overflow-hidden relative">
          {activeTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`border-0 font-bold uppercase text-[9px] px-2 py-0.5 shadow-none ${
                      activeTicket.status === 'Open' ? 'bg-amber-100 text-amber-700' : 
                      activeTicket.status === 'Closed' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {activeTicket.status}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      REF: #{activeTicket.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{activeTicket.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <User className="h-3 w-3" /> {activeTicket.studentName} 
                    <span className="text-slate-300">•</span> 
                    <MailOpen className="h-3 w-3" /> {activeTicket.studentEmail}
                  </div>
                </div>
                
                {activeTicket.status !== 'Closed' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    onClick={handleCloseTicket}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Resolved
                  </Button>
                )}
              </div>

              {/* Chat Thread */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-6">
                {/* Original Message */}
                <div className="flex gap-4 max-w-[85%]">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-500">{activeTicket.studentName?.[0]}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-900">{activeTicket.studentName}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {activeTicket.createdAt?.seconds ? formatDistanceToNow(activeTicket.createdAt.seconds * 1000, { addSuffix: true }) : 'Recently'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{activeTicket.message}</p>
                    </div>
                  </div>
                </div>

                {/* Responses */}
                {activeTicket.responses?.map((resp: any, idx: number) => (
                  <div key={idx} className="flex gap-4 max-w-[85%] self-end flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                      <Logo size={16} className="text-white brightness-0 invert" />
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <div className="flex items-baseline gap-2 flex-row-reverse">
                        <span className="text-sm font-bold text-slate-900">Support Team</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {resp.createdAt?.seconds ? formatDistanceToNow(resp.createdAt.seconds * 1000, { addSuffix: true }) : 'Recently'}
                        </span>
                      </div>
                      <div className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-sm shadow-md">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{resp.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {activeTicket.status !== 'Closed' ? (
                <div className="p-4 md:p-6 border-t border-slate-100 bg-white shrink-0">
                  <div className="flex gap-3">
                    <Textarea 
                      placeholder="Type your reply to the student..." 
                      className="min-h-[80px] resize-none rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20 text-sm p-3"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendReply()
                        }
                      }}
                    />
                    <Button 
                      className="h-auto w-14 shrink-0 rounded-xl bg-primary hover:bg-primary/90 shadow-md"
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 mt-2 ml-1">Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded">Enter</kbd> to send, <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded">Shift + Enter</kbd> for new line</p>
                </div>
              ) : (
                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-center items-center text-slate-500 text-sm font-medium shrink-0">
                  <AlertCircle className="h-4 w-4 mr-2" /> This ticket is closed and cannot receive new replies.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-slate-50/30">
              <MessageSquare className="h-16 w-16 mb-4 text-slate-200" />
              <p className="text-xl font-bold text-slate-700 tracking-tight">No Ticket Selected</p>
              <p className="text-sm mt-2 max-w-sm">Select a ticket from the inbox on the left to view the conversation and send a reply.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
