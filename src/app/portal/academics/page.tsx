"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs } from "firebase/firestore"

import { Card, CardContent } from "@/components/ui/card"
import {
  BookOpen, FileText, Download, GraduationCap, Clock, Loader2,
  FileSpreadsheet, CheckCircle2, PlusCircle, UploadCloud, FileUp,
  Send, AlertCircle, Video, BookMarked, ExternalLink, PlayCircle, FileSearch
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

// ── Resource Viewer Dialog ────────────────────────────────────────────────────
function ResourceDialog({
  open,
  onClose,
  title,
  icon: Icon,
  resources,
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: React.ElementType
  resources: any[]
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Icon className="h-4 w-4 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Uploaded materials for your course.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
          {resources.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <FileSearch className="h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium">No materials uploaded yet.</p>
              <p className="text-xs">Check back later or contact your instructor.</p>
            </div>
          ) : (
            resources.map((res) => (
              <a
                key={res.id}
                href={res.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{res.title}</p>
                  <p className="text-xs text-slate-400 truncate">{res.fileName || res.type}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
              </a>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AcademicsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()

  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [targetUnit, setTargetUnit] = useState<any>(null)

  // Resource viewer state
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; unitName: string }>({ open: false, unitName: "" })
  const [videosDialog, setVideosDialog] = useState<{ open: boolean; unitName: string }>({ open: false, unitName: "" })

  useEffect(() => {
    async function fetchStudent() {
      if (!firestore || !user?.email) return
      try {
        const q = query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } catch (e) {
        console.error(e)
      } finally {
        setIsStudentLoading(false)
      }
    }
    fetchStudent()
  }, [user, firestore])

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "units"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  const { data: units, isLoading: isUnitsLoading } = useCollection(unitsQuery)

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "academic_resources"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  const { data: resources, isLoading: isResourcesLoading } = useCollection(resourcesQuery)

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "unit_registrations"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: registrations, isLoading: isRegistrationsLoading } = useCollection(registrationsQuery)

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "submissions"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: studentSubmissions, isLoading: isSubmissionsLoading } = useCollection(submissionsQuery)

  const handleRegisterUnit = async (unit: any) => {
    if (!firestore || !student?.id) return
    try {
      await addDoc(collection(firestore, "unit_registrations"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        unitId: unit.id,
        unitCode: unit.code,
        unitName: unit.name,
        courseName: student.appliedCourse,
        status: "Registered",
        progress: 0,
        registeredAt: serverTimestamp(),
      })
      toast({ title: "Unit Registered", description: `You are now registered for ${unit.name}.` })
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" })
    }
  }

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !targetUnit || !student?.id || !user) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      // Upload to Cloudinary via API route
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('folder', 'submissions')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Upload failed')
      }

      const result = await response.json()

      await addDoc(collection(firestore!, "submissions"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        studentFirebaseUid: user.uid,
        unitId: targetUnit.unitId,
        unitCode: targetUnit.unitCode,
        unitName: targetUnit.unitName,
        fileName: selectedFile.name,
        fileUrl: result.fileUrl,
        publicId: result.publicId,
        status: "Pending",
        submittedAt: serverTimestamp(),
      })
      toast({ title: "Assignment Submitted", description: "Your work has been uploaded successfully." })
      setSubmitDialogOpen(false)
      setSelectedFile(null)
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isStudentLoading || isUnitsLoading || isResourcesLoading || isRegistrationsLoading || isSubmissionsLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your academic profile...</p>
      </div>
    )
  }

  const availableUnits = (units || []).filter(u => !(registrations || []).some(r => r.unitId === u.id))
  const totalUnits = (registrations || []).length
  const avgProgress = totalUnits > 0
    ? Math.round((registrations || []).reduce((s, r) => s + (r.progress || 0), 0) / totalUnits)
    : 0

  // Filtered resource helpers
  const notesResources = (resources || []).filter(r => r.type === "Notes" || r.type === "Reference")
  const videoResources = (resources || []).filter(r => r.type === "Video")

  return (
    <div className="space-y-6 pb-10">
      {/* Notes Dialog */}
      <ResourceDialog
        open={notesDialog.open}
        onClose={() => setNotesDialog({ open: false, unitName: "" })}
        title={`Lecture Notes${notesDialog.unitName ? ` — ${notesDialog.unitName}` : ""}`}
        icon={FileText}
        resources={notesResources}
      />

      {/* Videos Dialog */}
      <ResourceDialog
        open={videosDialog.open}
        onClose={() => setVideosDialog({ open: false, unitName: "" })}
        title={`Video Resources${videosDialog.unitName ? ` — ${videosDialog.unitName}` : ""}`}
        icon={PlayCircle}
        resources={videoResources}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            Academics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {student?.appliedCourse ? (
              <>{student.appliedCourse} · {totalUnits} unit{totalUnits !== 1 ? 's' : ''} registered</>
            ) : "Manage your course units and learning resources"}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Programme", value: student?.appliedCourse || "—", icon: BookMarked, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Registered Units", value: totalUnits, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Submissions", value: (studentSubmissions || []).length, icon: Send, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((s, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{s.label}</p>
                <p className="text-base font-bold text-slate-900 truncate leading-tight mt-0.5">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Registered Units + Available */}
        <div className="lg:col-span-2 space-y-6">

          {/* Registered Units */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              My Registered Units
            </h2>
            <div className="space-y-3">
              {(registrations || []).length > 0 ? (
                (registrations || []).map((reg) => {
                  const submission = (studentSubmissions || []).find(s => s.unitId === reg.unitId)
                  const isGraded = submission?.status === 'Graded'
                  return (
                    <div key={reg.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all">
                      {/* Unit header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{reg.unitName}</p>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">{reg.unitCode}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${reg.status === 'Registered' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {reg.status || "Registered"}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                          <span>Progress</span>
                          <span className="text-emerald-600">{reg.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${reg.progress || 0}%` }} />
                        </div>
                      </div>

                      {/* Submission status */}
                      {submission && (
                        <div className={`rounded-lg px-3 py-2 mb-3 flex items-center gap-2 ${isGraded ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                          }`}>
                          {isGraded
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            : <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          }
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold ${isGraded ? 'text-emerald-700' : 'text-amber-700'}`}>
                              Assignment: {submission.status}
                            </span>
                            {submission.feedback && (
                              <p className="text-xs text-slate-600 italic mt-0.5 truncate">"{submission.feedback}"</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {/* Submit Work */}
                        <Dialog open={submitDialogOpen && targetUnit?.id === reg.id} onOpenChange={(open) => {
                          setSubmitDialogOpen(open)
                          if (open) { setTargetUnit(reg); setSelectedFile(null) }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                              <Send className="h-3 w-3 mr-1.5" /> Submit Work
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[420px] rounded-xl">
                            <DialogHeader>
                              <DialogTitle className="text-base font-bold">Submit Assignment</DialogTitle>
                              <DialogDescription className="text-sm text-slate-500">
                                Upload your work for <strong>{reg.unitName}</strong>.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative hover:border-emerald-400 transition-all group">
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              />
                              <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-emerald-500 mb-2 transition-colors" />
                              <span className="text-sm font-medium text-slate-600 px-4 text-center">
                                {selectedFile ? selectedFile.name : "Click to select file"}
                              </span>
                              <span className="text-xs text-slate-400 mt-1">PDF, ZIP or DOCX · Max 10MB</span>
                            </div>
                            <DialogFooter className="mt-2">
                              <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-lg"
                                onClick={handleSubmitAssignment}
                                disabled={isSubmitting || !selectedFile}
                              >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                                {isSubmitting ? "Uploading..." : "Confirm Submission"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Notes — opens resource dialog filtered to Notes */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setNotesDialog({ open: true, unitName: reg.unitName })}
                        >
                          <FileText className="h-3 w-3 mr-1.5" /> Notes
                          {notesResources.length > 0 && (
                            <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {notesResources.length}
                            </span>
                          )}
                        </Button>

                        {/* Videos — opens resource dialog filtered to Videos */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setVideosDialog({ open: true, unitName: reg.unitName })}
                        >
                          <Video className="h-3 w-3 mr-1.5" /> Videos
                          {videoResources.length > 0 && (
                            <span className="ml-1.5 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {videoResources.length}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No units registered yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Register from the list below to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Units */}
          {availableUnits.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-blue-500" />
                Available to Register
              </h2>
              <div className="space-y-2">
                {availableUnits.map((unit) => (
                  <div key={unit.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-emerald-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{unit.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{unit.code}{unit.instructor ? ` · ${unit.instructor}` : ''}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shrink-0"
                      onClick={() => handleRegisterUnit(unit)}
                    >
                      <PlusCircle className="h-3 w-3 mr-1.5" /> Register
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Course Materials + Support */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-500" />
            Course Materials
          </h2>
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {(resources || []).length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {(resources || []).map((res) => (
                    <a
                      key={res.id}
                      href={res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${res.type === 'Assignment' ? 'bg-amber-50 text-amber-600' :
                          res.type === 'Video' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {res.type === 'Assignment' ? <FileSpreadsheet className="h-4 w-4" /> :
                          res.type === 'Video' ? <PlayCircle className="h-4 w-4" /> :
                            <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate leading-tight">{res.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{res.type}</p>
                      </div>
                      <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="h-7 w-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No materials uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic Support CTA */}
          <div className="bg-emerald-600 rounded-xl p-5 text-white">
            <h4 className="text-sm font-bold mb-1">Academic Support</h4>
            <p className="text-xs text-emerald-50 leading-relaxed mb-4">Need help with your units? Our instructors are available to assist.</p>
            <Button
              size="sm"
              className="w-full bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-semibold h-9 rounded-lg"
              onClick={() => router.push("/portal/support")}
            >
              Open Support Ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
