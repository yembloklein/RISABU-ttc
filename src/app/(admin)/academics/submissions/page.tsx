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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"


import { Search, Download, CheckCircle, Clock, Loader2, FileText, User, GraduationCap, Filter, Trash2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"

import { collection, query, orderBy, doc, serverTimestamp, addDoc } from "firebase/firestore"

import { toast } from "@/hooks/use-toast"

export default function SubmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("all")
  const [feedbackNote, setFeedbackNote] = useState("")
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [activeSub, setActiveSub] = useState<any>(null)
  
  const firestore = useFirestore()
  const { user } = useUser()


  // 1. Fetch Submissions
  const subsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "submissions"), orderBy("submittedAt", "desc")) : null, [firestore, user])
  const { data: submissions, isLoading: loadingSubs } = useCollection(subsRef)

  // 2. Fetch Units for filter
  const unitsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "units") : null, [firestore, user])
  const { data: units } = useCollection(unitsRef)

  // 3. Filtering Logic
  const filteredSubs = useMemo(() => {
    return (submissions || []).filter(sub => {
      const matchesSearch = 
        sub.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesUnit = selectedUnit === "all" || sub.unitId === selectedUnit

      return matchesSearch && matchesUnit
    })
  }, [submissions, searchTerm, selectedUnit])

  const handleUpdateStatus = async (submission: any, newStatus: string, feedback: string = "") => {
    if (!firestore) return
    try {
      // 1. Update Submission status
      const docRef = doc(firestore, "submissions", submission.id)
      await updateDocumentNonBlocking(docRef, { 
        status: newStatus,
        feedback: feedback,
        gradedAt: serverTimestamp()
      })

      // 2. Create Notification for the student
      await addDoc(collection(firestore, "notifications"), {
        studentId: submission.studentId,
        title: "Assignment Graded",
        message: `Your submission for ${submission.unitName} has been marked as ${newStatus}. ${feedback ? "Feedback provided." : ""}`,
        type: "Academic",
        link: "/portal/academics",
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({ title: "Status Updated", description: `Submission marked as ${newStatus} and student notified.` })
      setIsFeedbackDialogOpen(false)
      setFeedbackNote("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }



  const handleDeleteSubmission = async (submission: any) => {
    if (!firestore || !confirm("Are you sure you want to permanently delete this submission and its file?")) return
    
    try {
      // 1. Delete file from disk via API
      if (submission.fileUrl) {
        await fetch('/api/assignments/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: submission.fileUrl }),
        })
      }

      // 2. Delete from Firestore
      const docRef = doc(firestore, "submissions", submission.id)
      deleteDocumentNonBlocking(docRef)
      
      toast({ title: "Deleted", description: "Submission has been removed." })
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
    }
  }


  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Student Submissions</h1>
          <p className="text-slate-500 font-medium">Review and manage student assignment uploads</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search student, unit or email..." 
            className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filter by Unit" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {(units || []).map(u => (
                <SelectItem key={u.id} value={u.id}>{u.code} - {u.name}</SelectItem>
              ))}
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
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Unit</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Assignment File</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSubs ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{sub.studentName}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{sub.studentEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{sub.unitName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{sub.unitCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <a 
                        href={sub.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors group"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-bold underline underline-offset-4 decoration-blue-200 group-hover:decoration-blue-400 line-clamp-1 max-w-[150px]">
                          {sub.fileName}
                        </span>
                      </a>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge className={`border-0 font-bold uppercase text-[9px] px-2 py-0.5 shadow-none ${
                        sub.status === 'Graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sub.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {sub.status !== 'Graded' && (
                          <Dialog open={isFeedbackDialogOpen && activeSub?.id === sub.id} onOpenChange={(open) => {
                            setIsFeedbackDialogOpen(open)
                            if (open) setActiveSub(sub)
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-lg text-[10px] font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Mark Graded
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Provide Feedback</DialogTitle>
                                <DialogDescription>
                                  Add a note for {sub.studentName} regarding their submission for {sub.unitName}.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructor Note</Label>
                                <Textarea 
                                  placeholder="e.g. Great work on the typography! Next time, focus more on..." 
                                  value={feedbackNote}
                                  onChange={(e) => setFeedbackNote(e.target.value)}
                                  className="min-h-[120px]"
                                />
                              </div>
                              <DialogFooter>
                                <Button 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  onClick={() => handleUpdateStatus(sub, 'Graded', feedbackNote)}
                                >
                                  Finalize & Send Feedback
                                </Button>
                              </DialogFooter>

                            </DialogContent>
                          </Dialog>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600" onClick={() => handleDeleteSubmission(sub)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">
                    No submissions found matching your search.
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
