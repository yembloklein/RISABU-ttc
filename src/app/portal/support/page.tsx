"use client"

import { useState, useMemo, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp, getDocs, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, Loader2, Send, History, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

  const { data: tickets, isLoading: isTicketsLoading } = useCollection(ticketsQuery)

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

  if (isStudentLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 animate-in fade-in duration-500">
      {/* Simple Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">SUPPORT CENTRE</h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
          Need help with fees, units, or technical issues? Start a conversation with our administration team.
        </p>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
              <Plus className="mr-2 h-6 w-6" /> NEW SUPPORT TICKET
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

      {/* Ticket List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <History className="h-4 w-4" /> RECENT CONVERSATIONS
          </h2>
          <span className="text-[10px] font-bold text-slate-300 uppercase">{tickets?.length || 0} Tickets Total</span>
        </div>

        <div className="space-y-4">
          {isTicketsLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-100" /></div>
          ) : tickets && tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group transition-all hover:shadow-md hover:border-emerald-100">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                  {/* Ticket Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`border-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                        ticket.status === 'Open' ? 'bg-amber-100 text-amber-600' : 
                        ticket.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {ticket.status}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        REF: #{ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{ticket.title}</h3>
                      <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed italic">"{ticket.message}"</p>
                    </div>

                    {/* Replies */}
                    {ticket.responses && ticket.responses.length > 0 ? (
                      <div className="space-y-3 pt-4">
                        {ticket.responses.map((resp: any, idx: number) => (
                          <div key={idx} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 relative">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Admin Response</span>
                            </div>
                            <p className="text-sm text-slate-700 font-semibold leading-relaxed">{resp.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pt-4 flex items-center gap-2 text-amber-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Review</span>
                      </div>
                    )}
                  </div>
                </div>

                
                <div className="bg-slate-50/50 px-8 py-4 flex items-center justify-between border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-slate-200 flex items-center justify-center">
                      <Badge variant="outline" className="border-0 p-0 h-4 w-4 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {ticket.category[0]}
                      </Badge>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ticket.category}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    LAST UPDATED: {ticket.updatedAt?.seconds ? new Date(ticket.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-6">
              <div className="h-20 w-20 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-200">
                <MessageSquare className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black text-slate-900 uppercase tracking-tight">No active conversations</p>
                <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">Whenever you have an issue, create a ticket and it will show up here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
