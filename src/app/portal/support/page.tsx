"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp, getDocs, limit, doc, arrayUnion } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Plus, Loader2, Send, History, Inbox, MailOpen, AlertCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { Logo } from "@/components/ui/logo"

export default function StudentSupportPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Finance")
  const [message, setMessage] = useState("")
  
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchStudent() {
      if (!firestore || !user?.email) return
      try {
        const q = query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsStudentLoading(false)
      }
    }
    fetchStudent()
  }, [user, firestore])

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(
      collection(firestore, "tickets"),
      where("studentId", "==", student.id)
    )
  }, [firestore, student])

  const { data: rawTickets, isLoading: isTicketsLoading } = useCollection(ticketsQuery)

  const tickets = useMemo(() => {
    if (!rawTickets) return null
    return [...rawTickets].sort((a, b) => {
      const aTime = a.updatedAt?.seconds || 0
      const bTime = b.updatedAt?.seconds || 0
      return bTime - aTime // descending
    })
  }, [rawTickets])

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
    if (!activeTicketId && tickets && tickets.length > 0) {
      setActiveTicketId(tickets[0].id)
    }
  }, [tickets, activeTicketId])

  const handleSubmitTicket = async () => {
    if (!title || !message || !student) return
    setIsSubmitting(true)
    try {
      await addDoc(collection(firestore!, "tickets"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        title,
        category,
        message,
        status: "Open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responses: []
      })
      toast({ title: "Sent!", description: "Support will get back to you shortly." })
      setIsDialogOpen(false)
      setTitle("")
      setMessage("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendReply = async () => {
    if (!firestore || !activeTicket || !replyMessage.trim()) return

    try {
      const ticketRef = doc(firestore, "tickets", activeTicket.id)
      
      const response = {
        message: replyMessage,
        createdAt: new Date(),
        author: "Student"
      }

      await updateDocumentNonBlocking(ticketRef, {
        responses: arrayUnion({
          ...response,
          createdAt: new Date()
        }),
        status: "Open", // Moves back to open when student replies
        updatedAt: serverTimestamp()
      })

      setReplyMessage("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  if (isStudentLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Support Centre</h1>
          <p className="text-slate-500 font-medium text-sm">Need help? Start a conversation with our administration team.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200/50 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> NEW TICKET
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">How can we help?</DialogTitle>
              <DialogDescription className="font-medium text-slate-400">Fill in the details below and we'll get right on it.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <Input placeholder="What's the issue about?" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-0 focus-visible:ring-emerald-500 font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-0 font-medium">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100">
                    <SelectItem value="Finance">Finance / Fees</SelectItem>
                    <SelectItem value="Academic">Academics / Units</SelectItem>
                    <SelectItem value="Technical">Portal / Technical</SelectItem>
                    <SelectItem value="Other">Other Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <Textarea placeholder="Explain your problem..." value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[140px] rounded-xl bg-slate-50 border-0 focus-visible:ring-emerald-500 font-medium" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmitTicket} disabled={isSubmitting || !title || !message} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg">
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Send className="h-6 w-6 mr-2" />}
                {isSubmitting ? "SENDING..." : "SUBMIT REQUEST"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar - Ticket List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0">
          <Card className="flex-1 border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Your Tickets</span>
              <Badge variant="secondary" className="bg-slate-200/50 text-slate-500 text-[9px] font-bold">
                {tickets?.length || 0}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {isTicketsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setActiveTicketId(ticket.id)}
                      className={`w-full text-left p-4 transition-all hover:bg-slate-50 focus:outline-none ${activeTicketId === ticket.id ? 'bg-emerald-50/50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-bold text-sm truncate pr-2 ${activeTicketId === ticket.id ? 'text-emerald-700' : 'text-slate-900'}`}>{ticket.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {ticket.updatedAt?.seconds ? formatDistanceToNow(ticket.updatedAt.seconds * 1000, { addSuffix: true }) : 'Now'}
                        </span>
                      </div>
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
                  <p className="text-xs mt-1">Create a new ticket to get help.</p>
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
                    <History className="h-3 w-3" /> Created {activeTicket.createdAt?.seconds ? new Date(activeTicket.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              </div>

              {/* Chat Thread */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 flex flex-col gap-6">
                {/* Original Message (Student) */}
                <div className="flex gap-4 max-w-[85%] self-end flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-xs font-bold text-white">{student?.firstName?.[0]}</span>
                  </div>
                  <div className="space-y-1 flex flex-col items-end">
                    <div className="flex items-baseline gap-2 flex-row-reverse">
                      <span className="text-sm font-bold text-slate-900">You</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {activeTicket.createdAt?.seconds ? formatDistanceToNow(activeTicket.createdAt.seconds * 1000, { addSuffix: true }) : 'Recently'}
                      </span>
                    </div>
                    <div className="bg-emerald-600 text-white p-4 rounded-2xl rounded-tr-sm shadow-md">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{activeTicket.message}</p>
                    </div>
                  </div>
                </div>

                {/* Responses */}
                {activeTicket.responses?.map((resp: any, idx: number) => {
                  const isAdmin = resp.author === "Admin"
                  return (
                    <div key={idx} className={`flex gap-4 max-w-[85%] ${isAdmin ? 'self-start' : 'self-end flex-row-reverse'}`}>
                      {isAdmin ? (
                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                          <Logo size={16} className="text-primary" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                          <span className="text-xs font-bold text-white">{student?.firstName?.[0]}</span>
                        </div>
                      )}
                      
                      <div className={`space-y-1 flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                        <div className={`flex items-baseline gap-2 ${isAdmin ? '' : 'flex-row-reverse'}`}>
                          <span className="text-sm font-bold text-slate-900">{isAdmin ? 'Support Team' : 'You'}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {resp.createdAt?.seconds ? formatDistanceToNow(resp.createdAt.seconds * 1000, { addSuffix: true }) : 'Recently'}
                          </span>
                        </div>
                        <div className={`p-4 shadow-sm ${
                          isAdmin 
                            ? 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm text-slate-700' 
                            : 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{resp.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply Box */}
              {activeTicket.status !== 'Closed' ? (
                <div className="p-4 md:p-6 border-t border-slate-100 bg-white shrink-0">
                  <div className="flex gap-3">
                    <Textarea 
                      placeholder="Type your reply to support..." 
                      className="min-h-[80px] resize-none rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20 text-sm p-3"
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
                      className="h-auto w-14 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md"
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
                  <AlertCircle className="h-4 w-4 mr-2" /> This ticket has been marked as closed by the administration team.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-slate-50/30">
              <MessageSquare className="h-16 w-16 mb-4 text-slate-200" />
              <p className="text-xl font-bold text-slate-700 tracking-tight">No Ticket Selected</p>
              <p className="text-sm mt-2 max-w-sm">Select a ticket from the left to view the conversation.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
