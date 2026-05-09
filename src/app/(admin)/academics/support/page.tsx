"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader2, Send, User, Filter, Trash2, Mail } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function AdminSupportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [replyMessage, setReplyMessage] = useState("")
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false)
  const [activeTicket, setActiveTicket] = useState<any>(null)
  
  const firestore = useFirestore()
  const { user } = useUser()

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

  const handleSendReply = async () => {
    if (!firestore || !activeTicket || !replyMessage) return

    try {
      const ticketRef = doc(firestore, "tickets", activeTicket.id)
      
      const response = {
        message: replyMessage,
        createdAt: new Date(), // Using JS Date for local arrayUnion compatibility if needed, but firestore handles it
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

      // 3. Create Notification for student
      await addDoc(collection(firestore, "notifications"), {
        studentId: activeTicket.studentId,
        title: "Support Reply Received",
        message: `An administrator has replied to your ticket: "${activeTicket.title}"`,
        type: "Support",
        link: "/portal/support",
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({ title: "Reply Sent", description: "The student has been notified of your response." })
      setIsReplyDialogOpen(false)
      setReplyMessage("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    if (!firestore) return
    try {
      const ticketRef = doc(firestore, "tickets", ticketId)
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Support Tickets</h1>
          <p className="text-slate-500 font-medium">Manage and respond to student inquiries</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search student, title or email..." 
            className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Status: All" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-2xl bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider pl-6">Student</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Inquiry</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTickets ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{ticket.studentName}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">{ticket.studentEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col max-w-[300px]">
                        <span className="font-bold text-slate-700">{ticket.title}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{ticket.category}</span>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ticket.message}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge className={`border-0 font-bold uppercase text-[9px] px-2 py-0.5 shadow-none ${
                        ticket.status === 'Open' ? 'bg-amber-100 text-amber-700' : 
                        ticket.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Dialog open={isReplyDialogOpen && activeTicket?.id === ticket.id} onOpenChange={(open) => {
                          setIsReplyDialogOpen(open)
                          if (open) {
                            setActiveTicket(ticket)
                            setReplyMessage("")
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 rounded-lg text-[10px] font-bold border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" /> Reply
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Reply to Ticket</DialogTitle>
                              <DialogDescription>
                                Sending a reply to <strong>{ticket.studentName}</strong> regarding "{ticket.title}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Student Message:</p>
                                <p className="text-xs text-slate-600 italic">"{ticket.message}"</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Reply</label>
                                <Textarea 
                                  placeholder="Type your response here..." 
                                  value={replyMessage}
                                  onChange={(e) => setReplyMessage(e.target.value)}
                                  className="min-h-[150px]"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                onClick={handleSendReply}
                                disabled={!replyMessage}
                              >
                                <Send className="h-4 w-4 mr-2" /> Send Reply & Notify Student
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        {ticket.status !== 'Closed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleCloseTicket(ticket.id)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-slate-400 italic">
                    No tickets found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
