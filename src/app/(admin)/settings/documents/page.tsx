"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { useState, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileBadge,
  Receipt,
  FileCheck2,
  Award,
  Briefcase,
  CloudUpload,
  RefreshCw,
  Info,
  Globe,
  FolderOpen,
  FileUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow, format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const OFFICIAL_DOC_TYPES = [
  {
    key: "official_admission_letter",
    label: "Admission Letter",
    icon: FileBadge,
    description: "Official template sent to newly admitted students.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "bg-emerald-500",
    usage: "Student Portal → Dashboard",
  },
  {
    key: "official_fee_structure",
    label: "Fee Structure",
    icon: Receipt,
    description: "Standard fee schedule visible to all enrolled students.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    accent: "bg-blue-500",
    usage: "Student Portal → Finance",
  },
  {
    key: "official_payment_receipt",
    label: "Payment Receipt",
    icon: Receipt,
    description: "Background template used for auto-generated payment receipts.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    accent: "bg-indigo-500",
    usage: "Student Portal → Documents",
  },
  {
    key: "official_exam_pass",
    label: "Exam Pass",
    icon: FileCheck2,
    description: "Background design layered on generated examination passes.",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    accent: "bg-orange-500",
    usage: "Student Portal → Documents",
  },
  {
    key: "official_internship_letter",
    label: "Internship Letter",
    icon: Briefcase,
    description: "Institutional letterhead for industrial attachment letters.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    accent: "bg-violet-500",
    usage: "Student Portal → Documents",
  },
  {
    key: "official_certificate_template",
    label: "Certificate Template",
    icon: Award,
    description: "Background design for official graduation certificates.",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    accent: "bg-amber-500",
    usage: "Admin → Students → Print",
  },
  {
    key: "official_other",
    label: "General Document",
    icon: FileText,
    description: "Any other official downloadable resource for students.",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    accent: "bg-slate-500",
    usage: "Student Portal → Documents",
  },
]

function formatBytes(bytes: number) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SchoolDocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore, user])

  const { data: schoolDocs, isLoading } = useCollection(schoolDocsQuery)

  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeType, setActiveType] = useState<string | null>(null)

  const uploadedCount = useMemo(() => {
    if (!schoolDocs) return 0
    const keys = new Set(schoolDocs.map((d: any) => d.type))
    return OFFICIAL_DOC_TYPES.filter(t => keys.has(t.key)).length
  }, [schoolDocs])

  const triggerUpload = (type: string) => {
    setActiveType(type)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeType || !firestore) return
    e.target.value = ""

    setUploadingType(activeType)
    setUploadProgress(0)

    try {
      const typeInfo = OFFICIAL_DOC_TYPES.find(t => t.key === activeType)

      // Delete old document(s) of same type in background
      const existingDocs = schoolDocs?.filter((d: any) => d.type === activeType) || []
      existingDocs.forEach((oldDoc: any) => {
        const cleanup = async () => {
          try {
            if (oldDoc.publicId) {
              await fetch('/api/upload/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: oldDoc.publicId, resourceType: 'raw' }),
              })
            }
            await deleteDoc(doc(firestore, "school_documents", oldDoc.id))
          } catch (e) {
            console.warn("Failed to delete old document in background", e)
          }
        }
        cleanup()
      })

      setUploadProgress(40)
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', `school_documents/${activeType}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      setUploadProgress(100)

      await addDoc(collection(firestore, "school_documents"), {
        type: activeType,
        label: typeInfo?.label || activeType,
        fileName: file.name,
        fileSize: file.size,
        downloadURL: result.fileUrl,
        publicId: result.publicId,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email,
        active: true,
      })

      toast({ title: "Upload Successful", description: `${file.name} has been published.` })
    } catch (error) {
      console.error(error)
      toast({ title: "Upload Failed", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setUploadingType(null)
      setActiveType(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !firestore) return
    setIsDeleting(true)
    try {
      if (deleteTarget.publicId) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: deleteTarget.publicId, resourceType: 'raw' }),
        }).catch(e => console.warn('Cloudinary delete warning:', e))
      }
      await deleteDoc(doc(firestore, "school_documents", deleteTarget.id))
      toast({ title: "Document Removed", description: "The file has been permanently deleted." })
      setDeleteTarget(null)
    } catch (error) {
      console.error(error)
      toast({ title: "Deletion Failed", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-10 max-w-6xl">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Settings</p>
          <h1 className="text-2xl font-bold text-slate-900">School Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage official templates and downloadable files published to all students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{uploadedCount}/{OFFICIAL_DOC_TYPES.length}</p>
            <p className="text-xs text-slate-400">documents uploaded</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${uploadedCount === OFFICIAL_DOC_TYPES.length ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {uploadedCount === OFFICIAL_DOC_TYPES.length
              ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              : <AlertCircle className="h-6 w-6 text-amber-500" />
            }
          </div>
        </div>
      </div>

      {/* ── Progress overview ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-semibold text-slate-600">Publishing Completeness</p>
          <p className="text-xs font-bold text-slate-800">{Math.round((uploadedCount / OFFICIAL_DOC_TYPES.length) * 100)}%</p>
        </div>
        <Progress value={(uploadedCount / OFFICIAL_DOC_TYPES.length) * 100} className="h-2" />
        <p className="text-[11px] text-slate-400 mt-2">
          {uploadedCount === OFFICIAL_DOC_TYPES.length
            ? "✓ All official documents are published and available to students."
            : `${OFFICIAL_DOC_TYPES.length - uploadedCount} document${OFFICIAL_DOC_TYPES.length - uploadedCount > 1 ? 's' : ''} still need to be uploaded.`}
        </p>
      </div>

      {/* ── Document Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))
          : OFFICIAL_DOC_TYPES.map((type) => {
            const Icon = type.icon
            const isUploading = uploadingType === type.key
            const existing = schoolDocs?.find((d: any) => d.type === type.key)
            const hasFile = !!existing

            return (
              <Card
                key={type.key}
                className={`border shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md ${hasFile ? "border-slate-200 bg-white" : "border-dashed border-slate-300 bg-slate-50/50"
                  }`}
              >
                {/* Card top accent bar */}
                <div className={`h-0.5 w-full ${hasFile ? type.accent : "bg-slate-200"}`} />

                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${type.bg}`}>
                        <Icon className={`h-4 w-4 ${type.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-tight">{type.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" /> {type.usage}
                        </p>
                      </div>
                    </div>
                    {hasFile
                      ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">Live</Badge>
                      : <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">Not set</Badge>
                    }
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed">{type.description}</p>

                  {/* File info or empty state */}
                  {hasFile ? (
                    <div className={`rounded-lg p-3 border ${type.border} ${type.bg}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${type.color}`}>{existing.fileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{formatBytes(existing.fileSize)}</span>
                            {existing.uploadedAt?.toDate && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] text-slate-500">
                                  {formatDistanceToNow(existing.uploadedAt.toDate(), { addSuffix: true })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className={`h-7 w-7 ${type.color} hover:${type.bg}`} asChild>
                            <a href={existing.downloadURL} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeleteTarget(existing)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-14 rounded-lg border border-dashed border-slate-200 flex items-center justify-center bg-white/60">
                      <div className="flex items-center gap-2 text-slate-400">
                        <FolderOpen className="h-4 w-4" />
                        <span className="text-xs">No file uploaded</span>
                      </div>
                    </div>
                  )}

                  {/* Upload button or progress */}
                  {isUploading ? (
                    <div className="space-y-1.5">
                      <Progress value={uploadProgress} className="h-1.5" />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                        </p>
                        <p className="text-[10px] font-bold text-slate-700">{uploadProgress}%</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={hasFile ? "outline" : "default"}
                      className={`w-full h-8 text-xs font-semibold gap-1.5 ${hasFile
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      onClick={() => triggerUpload(type.key)}
                      disabled={!!uploadingType}
                    >
                      {hasFile ? (
                        <><RefreshCw className="h-3.5 w-3.5" /> Replace File</>
                      ) : (
                        <><FileUp className="h-3.5 w-3.5" /> Upload File</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })
        }
      </div>

      {/* ── Info Banner ── */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-800">Publishing Rules & Behavior</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: CloudUpload,
              title: "Auto-Replacement",
              desc: "Uploading a new file automatically removes the previous one — one active file per document type.",
              color: "text-blue-600 bg-blue-50",
            },
            {
              icon: Globe,
              title: "Instant Publishing",
              desc: "Documents are live immediately after upload. Students can access them from their portal without a refresh.",
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              icon: Info,
              title: "Priority System",
              desc: "Uploaded templates (e.g. Admission Letter) take precedence over auto-generated system versions.",
              color: "text-violet-600 bg-violet-50",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-4 w-4" /> Delete Official Document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              <strong className="text-slate-700">{deleteTarget?.fileName}</strong> will be permanently removed from
              storage and unpublished from the student portal. Students will fall back to auto-generated versions
              where applicable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
