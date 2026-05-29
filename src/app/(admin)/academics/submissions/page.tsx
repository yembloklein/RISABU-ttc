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

import { Search, Download, CheckCircle, Clock, Loader2, FileText, User, GraduationCap, Filter, Trash2, BookOpen } from "lucide-react"

import { ref, deleteObject } from "firebase/storage"
import { useFirestore, useCollection, useMemoFirebase, useUser, useStorage, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"

import { collection, query, orderBy, doc, serverTimestamp, addDoc } from "firebase/firestore"

import { toast } from "@/hooks/use-toast"

export default function SubmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("all")
  const [feedbackNote, setFeedbackNote] = useState("")
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [activeSub, setActiveSub] = useState<any>(null)
  
  const firestore = useFirestore()
  const storage = useStorage()
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
    if (!firestore || !storage || !confirm("Are you sure you want to permanently delete this submission and its file?")) return
    
    try {
      // 1. Delete file from Storage if path exists
      if (submission.storagePath) {
        const fileRef = ref(storage, submission.storagePath)
        await deleteObject(fileRef)
      } else if (submission.fileUrl && !submission.fileUrl.includes('firebasestorage')) {
        // Fallback for old local files (optional cleanup)
        await fetch('/api/assignments/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: submission.fileUrl }),
        })
      }

      // 2. Delete from Firestore
      const docRef = doc(firestore, "submissions", submission.id)
      deleteDocumentNonBlocking(docRef)
      
      toast({ title: "Deleted", description: "Submission and file have been removed from the cloud." })
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Academic Submissions</p>
          <h1 className="text-2xl font-bold text-slate-900">Student Submissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, grade, and manage student assignment uploads.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search student, unit or email..." 
            className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
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

      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Student</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Unit</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Assignment File</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[120px]">Status</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right pr-5 w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSubs ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                  </TableCell>
                </TableRow>
              ) : filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-sm">{sub.studentName}</span>
                          <span className="text-[10px] font-medium text-slate-500">{sub.studentEmail}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">{sub.unitName}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tighter mt-0.5">{sub.unitCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <a 
                        href={sub.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors group"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-medium underline underline-offset-4 decoration-blue-200 group-hover:decoration-blue-400 line-clamp-1 max-w-[150px]">
                          {sub.fileName}
                        </span>
                      </a>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        sub.status === 'Graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {sub.status || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status !== 'Graded' && (
                          <Dialog open={isFeedbackDialogOpen && activeSub?.id === sub.id} onOpenChange={(open) => {
                            setIsFeedbackDialogOpen(open)
                            if (open) setActiveSub(sub)
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 rounded-md text-[10px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                              >
                                <CheckCircle className="h-3 w-3 mr-1.5" /> Grade
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] border border-slate-200 shadow-lg rounded-xl">
                              <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-slate-900">Provide Feedback</DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 mt-1">
                                  Add an optional note for <strong>{sub.studentName}</strong> regarding their submission for {sub.unitName}.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-2">
                                <Label className="text-xs font-medium text-slate-700">Instructor Note (Optional)</Label>
                                <Textarea 
                                  placeholder="e.g. Great work on the typography! Next time, focus more on..." 
                                  value={feedbackNote}
                                  onChange={(e) => setFeedbackNote(e.target.value)}
                                  className="min-h-[120px] rounded-lg border-slate-200 focus-visible:ring-emerald-500"
                                />
                              </div>
                              <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
                                <Button 
                                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                                  onClick={() => handleUpdateStatus(sub, 'Graded', feedbackNote)}
                                >
                                  Finalize & Mark Graded
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteSubmission(sub)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-200" />
                      <p>No submissions found matching your search.</p>
                    </div>
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
