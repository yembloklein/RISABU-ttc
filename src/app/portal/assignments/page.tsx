"use client"

import { useState, useEffect, useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import {
  collection, query, where, limit, getDocs, addDoc, serverTimestamp
} from "firebase/firestore"
import {
  ClipboardList, Upload, FileUp, Loader2, CheckCircle2, AlertCircle,
  Clock, CalendarDays, BookOpen, FileText, Lock, ChevronDown, ChevronUp,
  Send, TriangleAlert, Download, Paperclip
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"

// ── Deadline countdown ──────────────────────────────────────────────────────────
function Countdown({ dueDate }: { dueDate: string }) {
  const [display, setDisplay] = useState("")
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function calc() {
      const diff = new Date(dueDate).getTime() - Date.now()
      if (diff <= 0) { setDisplay("Deadline passed"); setUrgent(true); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setUrgent(diff < 86400000)
      if (d > 0) setDisplay(`${d}d ${h}h left`)
      else if (h > 0) setDisplay(`${h}h ${m}m left`)
      else setDisplay(`${m}m left`)
    }
    calc()
    const t = setInterval(calc, 60000)
    return () => clearInterval(t)
  }, [dueDate])

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      urgent ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
    }`}>
      <Clock className="h-2.5 w-2.5" />
      {display}
    </span>
  )
}

// ── Status badge ────────────────────────────────────────────────────────────────
function StatusBadge({ isGraded, isSubmitted, isPast }: { isGraded: boolean; isSubmitted: boolean; isPast: boolean }) {
  if (isGraded) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Graded</span>
  if (isSubmitted) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Submitted</span>
  if (isPast) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Closed</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
}

// ── Assignment Card ─────────────────────────────────────────────────────────────
function AssignmentCard({
  assignment,
  submission,
  onSubmit,
}: {
  assignment: any
  submission: any
  onSubmit: (assignment: any) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPast = assignment.dueDate && new Date(assignment.dueDate) < new Date()
  const isSubmitted = !!submission
  const isGraded = submission?.status === "Graded"

  const iconBg = isGraded ? "bg-emerald-100 text-emerald-600"
    : isSubmitted ? "bg-blue-100 text-blue-600"
    : isPast ? "bg-rose-100 text-rose-500"
    : "bg-slate-100 text-slate-500"

  const cardBorder = isGraded ? "border-emerald-200 bg-emerald-50/30"
    : isSubmitted ? "border-blue-200 bg-blue-50/20"
    : isPast ? "border-rose-100 bg-rose-50/20"
    : "border-slate-200 bg-white hover:shadow-sm"

  return (
    <Card className={`border rounded-xl overflow-hidden transition-all ${cardBorder}`}>
      <CardContent className="p-0">
        <div className="p-3 sm:p-4 md:p-5">

          {/* Top row: icon + title + status badge */}
          <div className="flex items-start gap-3">
            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {isGraded ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> :
               isSubmitted ? <Send className="h-4 w-4 sm:h-5 sm:w-5" /> :
               isPast ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> :
               <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{assignment.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <StatusBadge isGraded={isGraded} isSubmitted={isSubmitted} isPast={isPast} />
                    {assignment.dueDate && !isPast && <Countdown dueDate={assignment.dueDate} />}
                  </div>
                </div>
                {/* Expand toggle */}
                {assignment.instructions && (
                  <button
                    className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <BookOpen className="h-3 w-3" />
                  {assignment.unitCode}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <CalendarDays className="h-3 w-3" />
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "No deadline"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons — stacked on mobile, side by side on sm+ */}
          {(assignment.attachmentUrl || (!isSubmitted && !isPast)) && (
            <div className={`mt-3 flex flex-col sm:flex-row gap-2 ${
              assignment.attachmentUrl && !isSubmitted && !isPast ? "sm:gap-2" : ""
            }`}>
              {assignment.attachmentUrl && (
                <a
                  href={assignment.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex-1 flex items-center justify-center gap-2 h-10 sm:h-9 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 text-xs font-semibold transition-colors touch-manipulation"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </a>
              )}
              {!isSubmitted && !isPast && (
                <button
                  className="flex-1 flex items-center justify-center gap-2 h-10 sm:h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-colors touch-manipulation"
                  onClick={() => onSubmit(assignment)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Submit Assignment
                </button>
              )}
            </div>
          )}

          {/* Submitted file info */}
          {isSubmitted && (
            <div className={`mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2.5 ${
              isGraded ? "bg-emerald-50 border border-emerald-100" : "bg-blue-50 border border-blue-100"
            }`}>
              <FileText className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isGraded ? "text-emerald-600" : "text-blue-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700 truncate">{submission.fileName}</p>
                  {isGraded && submission.marks !== undefined && submission.marks !== null && (
                    <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {submission.marks}/100
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Submitted {submission.submittedAt?.seconds
                    ? new Date(submission.submittedAt.seconds * 1000).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                    : "recently"}
                </p>
                {submission.feedback && (
                  <p className="text-xs text-slate-600 italic mt-1.5 border-l-2 border-emerald-300 pl-2">
                    "{submission.feedback}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded instructions */}
        {expanded && assignment.instructions && (
          <div className="border-t border-slate-100 bg-slate-50/70 px-3 sm:px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instructions</p>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {assignment.instructions}
            </p>
            <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                📎 {assignment.allowedTypes}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                📦 Max {assignment.maxFileSizeMb}MB
              </span>
              {assignment.attachmentUrl && (
                <a
                  href={assignment.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:underline"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  {assignment.attachmentName || "Assignment File"}
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function StudentAssignmentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [student, setStudent] = useState<any>(null)
  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showOverdueWarning, setShowOverdueWarning] = useState(false)
  const [overdueVisible, setOverdueVisible] = useState(false)

  useEffect(() => {
    async function fetchStudent() {
      if (!firestore || !user?.email) return
      try {
        const q = query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } catch (e) { console.error(e) }
      finally { setIsStudentLoading(false) }
    }
    fetchStudent()
  }, [user, firestore])

  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "assignments"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  const { data: assignments, isLoading: isAssignmentsLoading } = useCollection(assignmentsQuery)

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "submissions"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: submissions, isLoading: isSubsLoading } = useCollection(submissionsQuery)

  const sortedAssignments = useMemo(() => {
    const isPast = (a: any) => a.dueDate && new Date(a.dueDate) < new Date()
    const isSub = (a: any) => (submissions || []).some(s => s.assignmentId === a.id)
    return [...(assignments || [])].sort((a, b) => {
      const aGraded = (submissions || []).find(s => s.assignmentId === a.id)?.status === "Graded"
      const bGraded = (submissions || []).find(s => s.assignmentId === b.id)?.status === "Graded"
      if (!isSub(a) && !isPast(a) && (isSub(b) || isPast(b))) return -1
      if (!isSub(b) && !isPast(b) && (isSub(a) || isPast(a))) return 1
      if (!aGraded && bGraded) return -1
      if (!bGraded && aGraded) return 1
      return 0
    })
  }, [assignments, submissions])

  const stats = useMemo(() => {
    const total = (assignments || []).length
    const submitted = (submissions || []).filter(s => (assignments || []).some(a => a.id === s.assignmentId)).length
    const graded = (submissions || []).filter(s => s.status === "Graded" && (assignments || []).some(a => a.id === s.assignmentId)).length
    const overdue = (assignments || []).filter(a =>
      a.dueDate && new Date(a.dueDate) < new Date() && !(submissions || []).some(s => s.assignmentId === a.id)
    ).length
    return { total, submitted, graded, pending: total - submitted, overdue }
  }, [assignments, submissions])

  // Auto-dismiss overdue warning after 6 seconds
  useEffect(() => {
    if (stats.overdue > 0) {
      setShowOverdueWarning(true)
      setOverdueVisible(true)
      const fadeTimer = setTimeout(() => setOverdueVisible(false), 5500)
      const hideTimer = setTimeout(() => setShowOverdueWarning(false), 6200)
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
    }
  }, [stats.overdue])

  const openSubmitDialog = (assignment: any) => {
    setActiveAssignment(assignment)
    setSelectedFile(null)
    setDialogOpen(true)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleSubmit = async () => {
    if (!selectedFile || !activeAssignment || !student?.id || !user) {
      toast({ title: "Select a file", description: "Please pick a file before submitting.", variant: "destructive" })
      return
    }
    const maxBytes = (activeAssignment.maxFileSizeMb || 10) * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      toast({ title: "File too large", description: `Max allowed: ${activeAssignment.maxFileSizeMb}MB.`, variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("folder", "submissions")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload failed") }
      const result = await res.json()
      await addDoc(collection(firestore!, "submissions"), {
        assignmentId: activeAssignment.id,
        assignmentTitle: activeAssignment.title,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        studentFirebaseUid: user.uid,
        unitId: activeAssignment.unitId,
        unitCode: activeAssignment.unitCode,
        unitName: activeAssignment.unitName,
        courseName: activeAssignment.courseName,
        fileName: selectedFile.name,
        fileUrl: result.fileUrl,
        publicId: result.publicId,
        status: "Pending",
        submittedAt: serverTimestamp(),
      })
      toast({ title: "✅ Submitted!", description: `"${activeAssignment.title}" uploaded successfully.` })
      setDialogOpen(false)
      setSelectedFile(null)
    } catch (e: any) {
      toast({ title: "Upload Failed", description: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isStudentLoading || isAssignmentsLoading || isSubsLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your assignments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Submit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
            <DialogTitle className="text-sm sm:text-base font-bold pr-6">Submit Assignment</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              <span className="font-medium text-slate-700">{activeAssignment?.title}</span>
              <br />
              <span className="font-mono">{activeAssignment?.allowedTypes}</span>
              {" · max "}
              <span className="font-semibold">{activeAssignment?.maxFileSizeMb}MB</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-5 py-4 space-y-3">
            {/* Drop zone */}
            <div
              onDrop={handleFileDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`relative py-7 sm:py-9 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer group ${
                dragOver ? "border-emerald-400 bg-emerald-50"
                : selectedFile ? "border-emerald-300 bg-emerald-50/50"
                : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30"
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 px-4 text-center leading-snug w-full max-w-[260px] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    <span className="hidden sm:inline"> · tap to change</span>
                  </p>
                  <span className="mt-2 text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full sm:hidden">Tap to change</span>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
                    <FileUp className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Tap to choose file</p>
                  <p className="text-xs text-slate-400 mt-0.5">{activeAssignment?.allowedTypes}</p>
                  <p className="text-[10px] text-slate-300 mt-1 hidden sm:block">or drag and drop</p>
                </>
              )}
            </div>

            {/* Near-deadline warning */}
            {activeAssignment?.dueDate && (() => {
              const diff = new Date(activeAssignment.dueDate).getTime() - Date.now()
              return diff > 0 && diff < 3600000 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <TriangleAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Less than 1 hour remaining!</p>
                </div>
              ) : null
            })()}
          </div>

          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white h-12 sm:h-11 rounded-xl font-semibold text-sm touch-manipulation"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Send className="h-4 w-4 mr-2" />}
              {isSubmitting ? "Uploading..." : "Confirm Submission"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-900">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 shrink-0" />
            Assignments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            {student?.appliedCourse ? (
              <span className="font-medium text-slate-600">{student.appliedCourse}</span>
            ) : null}
            {student?.appliedCourse ? " · " : ""}
            {stats.pending} pending · {stats.submitted} submitted · {stats.graded} graded
          </p>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-600", bg: "bg-slate-50", icon: ClipboardList },
          { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "Submitted", value: stats.submitted, color: "text-blue-600", bg: "bg-blue-50", icon: Send },
          { label: "Graded", value: stats.graded, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
        ].map((s, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
              <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none">{s.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mt-0.5">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Overdue Warning — auto-dismisses after 6s ────────────────────────── */}
      {showOverdueWarning && (
        <div
          className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-rose-50 border border-rose-200 transition-all duration-700"
          style={{ opacity: overdueVisible ? 1 : 0, transform: overdueVisible ? 'translateY(0)' : 'translateY(-6px)' }}
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-rose-700 font-medium leading-snug">
            <strong>{stats.overdue}</strong> assignment{stats.overdue > 1 ? "s" : ""} missed — deadline passed without submission.
          </p>
        </div>
      )}

      {/* ── Assignment List ───────────────────────────────────────────────────── */}
      {sortedAssignments.length === 0 ? (
        <div className="py-16 sm:py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No assignments yet.</p>
          <p className="text-xs text-slate-400 mt-1">Check back after your instructors post work.</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {sortedAssignments.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              submission={(submissions || []).find(s => s.assignmentId === a.id)}
              onSubmit={openSubmitDialog}
            />
          ))}
        </div>
      )}
    </div>
  )
}
