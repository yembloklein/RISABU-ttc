"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search, CheckCircle, Loader2, FileText, User,
  Trash2, BookOpen, GraduationCap, Hash, MessageSquare,
  ExternalLink, ClipboardCheck, Calendar, X, Filter, Layers
} from "lucide-react"
import { ref, deleteObject } from "firebase/storage"
import {
  useFirestore, useCollection, useMemoFirebase,
  useUser, useStorage, updateDocumentNonBlocking, deleteDocumentNonBlocking
} from "@/firebase"
import { collection, query, orderBy, doc, serverTimestamp, addDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function SubmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedUnit, setSelectedUnit] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [feedbackNote, setFeedbackNote] = useState("")
  const [marks, setMarks] = useState("")
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false)
  const [activeSub, setActiveSub] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const firestore = useFirestore()
  const storage = useStorage()
  const { user } = useUser()

  const subsRef = useMemoFirebase(
    () => (firestore && user) ? query(collection(firestore, "submissions"), orderBy("submittedAt", "desc")) : null,
    [firestore, user]
  )
  const { data: submissions, isLoading: loadingSubs } = useCollection(subsRef)

  const unitsRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, "units") : null,
    [firestore, user]
  )
  const { data: units } = useCollection(unitsRef)

  const coursesRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, "courses") : null,
    [firestore, user]
  )
  const { data: courses } = useCollection(coursesRef)

  // Derive units that belong to the selected course
  const filteredUnits = useMemo(() => {
    if (!units) return []
    if (selectedCourse === "all") return units
    return units.filter((u: any) => u.courseId === selectedCourse)
  }, [units, selectedCourse])

  const hasActiveFilters = searchTerm || selectedCourse !== "all" || selectedUnit !== "all" || dateFrom || dateTo

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCourse("all")
    setSelectedUnit("all")
    setDateFrom("")
    setDateTo("")
  }

  const filteredSubs = useMemo(() => {
    return (submissions || []).filter((sub: any) => {
      // Name / unit / email search
      const matchesSearch =
        !searchTerm ||
        sub.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())

      // Course filter — submissions may carry courseId or we derive from unit
      const matchesCourse =
        selectedCourse === "all" ||
        sub.courseId === selectedCourse ||
        filteredUnits.some((u: any) => u.id === sub.unitId)

      // Unit filter
      const matchesUnit = selectedUnit === "all" || sub.unitId === selectedUnit

      // Date range
      let matchesDate = true
      if (dateFrom || dateTo) {
        const submittedAt = sub.submittedAt?.toDate ? sub.submittedAt.toDate() : sub.submittedAt ? new Date(sub.submittedAt) : null
        if (submittedAt) {
          if (dateFrom) matchesDate = matchesDate && submittedAt >= new Date(dateFrom)
          if (dateTo) {
            const toEnd = new Date(dateTo)
            toEnd.setHours(23, 59, 59, 999)
            matchesDate = matchesDate && submittedAt <= toEnd
          }
        } else {
          matchesDate = false
        }
      }

      return matchesSearch && matchesCourse && matchesUnit && matchesDate
    })
  }, [submissions, searchTerm, selectedCourse, selectedUnit, dateFrom, dateTo, filteredUnits])

  const openGradeDialog = (sub: any) => {
    setActiveSub(sub)
    setFeedbackNote(sub.feedback || "")
    setMarks(sub.marks !== undefined ? String(sub.marks) : "")
    setIsGradeDialogOpen(true)
  }

  const handleGrade = async () => {
    if (!firestore || !activeSub) return
    const parsedMarks = marks.trim() !== "" ? Number(marks) : null
    if (parsedMarks !== null && (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100)) {
      toast({ title: "Invalid marks", description: "Enter a number between 0 and 100.", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const docRef = doc(firestore, "submissions", activeSub.id)
      await updateDocumentNonBlocking(docRef, {
        status: "Graded",
        feedback: feedbackNote.trim(),
        ...(parsedMarks !== null && { marks: parsedMarks }),
        gradedAt: serverTimestamp(),
      })
      await addDoc(collection(firestore, "notifications"), {
        studentId: activeSub.studentId,
        title: "Assignment Graded",
        message: `Your submission for ${activeSub.unitName} has been graded${parsedMarks !== null ? ` — ${parsedMarks}/100` : ""}.${feedbackNote.trim() ? " Feedback provided." : ""}`,
        type: "Academic",
        link: "/portal/assignments",
        read: false,
        createdAt: serverTimestamp(),
      })
      toast({ title: "Graded!", description: `${activeSub.studentName}'s submission has been marked and student notified.` })
      setIsGradeDialogOpen(false)
      setActiveSub(null)
      setFeedbackNote("")
      setMarks("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubmission = async (submission: any) => {
    if (!firestore || !storage || !confirm("Permanently delete this submission and its file?")) return
    try {
      if (submission.storagePath) {
        const fileRef = ref(storage, submission.storagePath)
        await deleteObject(fileRef)
      } else if (submission.fileUrl && !submission.fileUrl.includes("firebasestorage")) {
        await fetch("/api/assignments/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: submission.fileUrl }),
        })
      }
      const docRef = doc(firestore, "submissions", submission.id)
      deleteDocumentNonBlocking(docRef)
      toast({ title: "Deleted", description: "Submission removed." })
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
    }
  }

  const formatDate = (ts: any) => {
    if (!ts) return "—"
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  const totalCount = (submissions || []).length
  const pendingCount = (submissions || []).filter((s: any) => s.status !== "Graded").length
  const gradedCount = (submissions || []).filter((s: any) => s.status === "Graded").length

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">

      {/* ── Grade Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isGradeDialogOpen} onOpenChange={open => {
        if (!open) { setIsGradeDialogOpen(false); setActiveSub(null) }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-0 gap-0 overflow-hidden border border-slate-200 shadow-xl">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              Grade Submission
            </DialogTitle>
            {activeSub && (
              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-0.5">
                <p className="text-xs font-semibold text-slate-800">{activeSub.studentName}</p>
                <p className="text-[11px] text-slate-500">{activeSub.assignmentTitle || activeSub.unitName}</p>
                <a href={activeSub.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-medium mt-1">
                  <ExternalLink className="h-2.5 w-2.5" />
                  View submitted file
                </a>
              </div>
            )}
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-slate-400" />
                Marks <span className="text-slate-400 font-normal">(out of 100)</span>
              </Label>
              <Input type="number" min={0} max={100} placeholder="e.g. 78" value={marks}
                onChange={e => setMarks(e.target.value)}
                className="h-10 rounded-lg border-slate-200 focus-visible:ring-emerald-500 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3 text-slate-400" />
                Feedback <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Textarea placeholder="e.g. Good structure. Work on referencing next time."
                value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)}
                className="min-h-[90px] rounded-lg border-slate-200 focus-visible:ring-emerald-500 text-sm resize-none" />
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-2">
            <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 text-sm"
              onClick={() => setIsGradeDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm"
              onClick={handleGrade} disabled={isSubmitting}>
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><CheckCircle className="h-4 w-4 mr-1.5" /> Confirm Grade</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Academic Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Student Submissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, grade, and manage student assignment uploads.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">Total</p>
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-xs text-amber-500 font-medium">Pending</p>
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-xs text-emerald-600 font-medium">Graded</p>
            <p className="text-xl font-bold text-emerald-600">{gradedCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filter Submissions</span>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                id="sub-search"
                placeholder="Search name or email…"
                className="pl-9 h-10 rounded-lg bg-slate-50 border-slate-200 text-sm focus-visible:ring-emerald-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Course filter */}
            <Select value={selectedCourse} onValueChange={v => { setSelectedCourse(v); setSelectedUnit("all") }}>
              <SelectTrigger id="sub-course-filter" className="h-10 rounded-lg bg-slate-50 border-slate-200 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Filter by Course" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {(courses || []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} – ` : ""}{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Unit filter */}
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger id="sub-unit-filter" className="h-10 rounded-lg bg-slate-50 border-slate-200 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Filter by Unit" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {filteredUnits.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.code} – {u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  id="sub-date-from"
                  type="date"
                  title="From date"
                  className="pl-8 h-10 rounded-lg bg-slate-50 border-slate-200 text-xs focus-visible:ring-emerald-500"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  id="sub-date-to"
                  type="date"
                  title="To date"
                  className="pl-8 h-10 rounded-lg bg-slate-50 border-slate-200 text-xs focus-visible:ring-emerald-500"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Name: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")}><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {selectedCourse !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                  Course: {(courses || []).find((c: any) => c.id === selectedCourse)?.name || selectedCourse}
                  <button onClick={() => { setSelectedCourse("all"); setSelectedUnit("all") }}><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {selectedUnit !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  Unit: {(units || []).find((u: any) => u.id === selectedUnit)?.name || selectedUnit}
                  <button onClick={() => setSelectedUnit("all")}><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {dateFrom && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                  From: {dateFrom}
                  <button onClick={() => setDateFrom("")}><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {dateTo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                  To: {dateTo}
                  <button onClick={() => setDateTo("")}><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              <span className="inline-flex items-center text-[10px] text-slate-400 ml-1">
                {filteredSubs.length} result{filteredSubs.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Student</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Assignment</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs hidden md:table-cell">Submitted</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">File</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[100px]">Status</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[80px]">Marks</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSubs ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                  </TableCell>
                </TableRow>
              ) : filteredSubs.length > 0 ? (
                filteredSubs.map((sub: any) => (
                  <TableRow key={sub.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    {/* Student */}
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-tight">{sub.studentName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{sub.studentEmail}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Assignment / Unit */}
                    <TableCell className="py-3">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{sub.assignmentTitle || sub.unitName}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{sub.unitCode}</p>
                    </TableCell>

                    {/* Date submitted */}
                    <TableCell className="py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-500">{formatDate(sub.submittedAt)}</span>
                    </TableCell>

                    {/* File link */}
                    <TableCell className="py-3">
                      <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-medium underline underline-offset-4 decoration-blue-200 line-clamp-1 max-w-[120px]">
                          {sub.fileName}
                        </span>
                      </a>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        sub.status === "Graded"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {sub.status || "Pending"}
                      </span>
                    </TableCell>

                    {/* Marks */}
                    <TableCell className="py-3 text-center">
                      {sub.marks !== undefined && sub.marks !== null ? (
                        <span className="text-sm font-bold text-slate-700">
                          {sub.marks}<span className="text-[10px] text-slate-400 font-normal">/100</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm"
                          className="h-7 rounded-md text-[10px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          onClick={() => openGradeDialog(sub)}>
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {sub.status === "Graded" ? "Re-grade" : "Grade"}
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDeleteSubmission(sub)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-200" />
                      <p className="text-sm text-slate-400">No submissions match your filters.</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-emerald-600 hover:underline font-medium">
                          Clear filters
                        </button>
                      )}
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
