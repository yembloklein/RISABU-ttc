"use client"

import { useState, useEffect, useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import {
  collection, query, where, limit, getDocs, addDoc, serverTimestamp
} from "firebase/firestore"
import {
  ClipboardList, Upload, FileUp, Loader2, CheckCircle2, AlertCircle,
  Clock, CalendarDays, BookOpen, FileText, Lock, ChevronDown, ChevronUp,
  Send, TriangleAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"

// ── Deadline countdown ─────────────────────────────────────────────────────────
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
    <span className={`flex items-center gap-1 text-xs font-semibold ${urgent ? "text-rose-600" : "text-slate-500"}`}>
      <Clock className="h-3 w-3" />
      {display}
    </span>
  )
}

// ── Single Assignment Card ─────────────────────────────────────────────────────
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

  return (
    <Card className={`border rounded-xl overflow-hidden transition-all ${
      isGraded ? "border-emerald-200 bg-emerald-50/30" :
      isSubmitted ? "border-blue-200 bg-blue-50/20" :
      isPast ? "border-rose-100 bg-rose-50/20" :
      "border-slate-200 bg-white hover:shadow-sm"
    }`}>
      <CardContent className="p-0">
        {/* Card header */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              isGraded ? "bg-emerald-100 text-emerald-600" :
              isSubmitted ? "bg-blue-100 text-blue-600" :
              isPast ? "bg-rose-100 text-rose-500" :
              "bg-slate-100 text-slate-500"
            }`}>
              {isGraded ? <CheckCircle2 className="h-5 w-5" /> :
               isSubmitted ? <Send className="h-5 w-5" /> :
               isPast ? <Lock className="h-5 w-5" /> :
               <ClipboardList className="h-5 w-5" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">{assignment.title}</h3>
                {/* Status badge */}
                {isGraded && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Graded</span>}
                {isSubmitted && !isGraded && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Submitted</span>}
                {!isSubmitted && isPast && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Closed</span>}
                {!isSubmitted && !isPast && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <BookOpen className="h-3 w-3" />
                  {assignment.unitCode} · {assignment.unitName}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays className="h-3 w-3" />
                  Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
                {assignment.dueDate && !isPast && <Countdown dueDate={assignment.dueDate} />}
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
              {!isSubmitted && !isPast && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  onClick={() => onSubmit(assignment)}
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Submit
                </Button>
              )}
            </div>
          </div>

          {/* Submitted file info */}
          {isSubmitted && (
            <div className={`mt-3 rounded-lg px-3 py-2 flex items-start gap-2 ${isGraded ? "bg-emerald-50 border border-emerald-100" : "bg-blue-50 border border-blue-100"}`}>
              <FileText className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isGraded ? "text-emerald-600" : "text-blue-600"}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{submission.fileName}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Submitted {submission.submittedAt?.seconds ? new Date(submission.submittedAt.seconds * 1000).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "recently"}
                </p>
                {submission.feedback && (
                  <p className="text-xs text-slate-600 italic mt-1 border-l-2 border-emerald-300 pl-2">"{submission.feedback}"</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded: instructions */}
        {expanded && assignment.instructions && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Instructions</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{assignment.instructions}</p>
            <div className="flex gap-4 mt-3">
              <span className="text-[10px] text-slate-400 font-medium">
                📎 Accepted: {assignment.allowedTypes}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                📦 Max size: {assignment.maxFileSizeMb}MB
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentAssignmentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [student, setStudent] = useState<any>(null)
  const [isStudentLoading, setIsStudentLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Fetch student
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

  // Fetch assignments for course
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "assignments"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  const { data: assignments, isLoading: isAssignmentsLoading } = useCollection(assignmentsQuery)

  // Fetch student submissions
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "submissions"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: submissions, isLoading: isSubsLoading } = useCollection(submissionsQuery)

  // Sort: pending first, then submitted, then graded, then overdue
  const sortedAssignments = useMemo(() => {
    const list = (assignments || [])
    const isPast = (a: any) => a.dueDate && new Date(a.dueDate) < new Date()
    const isSub = (a: any) => (submissions || []).some(s => s.assignmentId === a.id)
    return [...list].sort((a, b) => {
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
    const overdue = (assignments || []).filter(a => a.dueDate && new Date(a.dueDate) < new Date() && !(submissions || []).some(s => s.assignmentId === a.id)).length
    return { total, submitted, graded, pending: total - submitted, overdue }
  }, [assignments, submissions])

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

    // Validate file size
    const maxBytes = (activeAssignment.maxFileSizeMb || 10) * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      toast({ title: "File too large", description: `Maximum allowed size is ${activeAssignment.maxFileSizeMb}MB.`, variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", selectedFile)
      uploadFormData.append("folder", "submissions")

      const res = await fetch("/api/upload", { method: "POST", body: uploadFormData })
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

      toast({ title: "✅ Submitted!", description: `Your work for "${activeAssignment.title}" has been uploaded.` })
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
    <div className="space-y-6 pb-10">
      {/* Submit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Submit Assignment</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Upload your work for <strong>{activeAssignment?.title}</strong>.
              <br />
              <span className="text-xs">Accepted: {activeAssignment?.allowedTypes} · Max: {activeAssignment?.maxFileSizeMb}MB</span>
            </DialogDescription>
          </DialogHeader>

          {/* Drop zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`relative py-10 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer group ${
              dragOver ? "border-emerald-400 bg-emerald-50" :
              selectedFile ? "border-emerald-300 bg-emerald-50/50" :
              "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30"
            }`}
          >
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile ? (
              <>
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800 px-4 text-center">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                  <FileUp className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Drag & drop or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">{activeAssignment?.allowedTypes} · max {activeAssignment?.maxFileSizeMb}MB</p>
              </>
            )}
          </div>

          {/* Warning if close to deadline */}
          {activeAssignment?.dueDate && (() => {
            const diff = new Date(activeAssignment.dueDate).getTime() - Date.now()
            return diff > 0 && diff < 3600000 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">Less than 1 hour remaining!</p>
              </div>
            ) : null
          })()}

          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {isSubmitting ? "Uploading..." : "Confirm Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <ClipboardList className="h-6 w-6 text-emerald-600" />
          Assignments
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {student?.appliedCourse ? `${student.appliedCourse} · ` : ""}
          {stats.pending} pending · {stats.submitted} submitted · {stats.graded} graded
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-600", bg: "bg-slate-50", icon: ClipboardList },
          { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "Submitted", value: stats.submitted, color: "text-blue-600", bg: "bg-blue-50", icon: Send },
          { label: "Graded", value: stats.graded, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
        ].map((s, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue warning */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <p className="text-sm text-rose-700 font-medium">
            You have <strong>{stats.overdue}</strong> overdue assignment{stats.overdue > 1 ? "s" : ""} that {stats.overdue > 1 ? "were" : "was"} not submitted before the deadline.
          </p>
        </div>
      )}

      {/* Assignment list */}
      {sortedAssignments.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No assignments yet.</p>
          <p className="text-xs text-slate-400 mt-1">Your instructors haven't posted any assignments yet. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
