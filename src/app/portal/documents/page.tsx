"use client"

import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Download,
  FolderOpen,
  FileBadge,
  Receipt,
  FileCheck2,
  FileArchive,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { PaymentReceipt } from "@/components/payment-receipt"
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
import { limit } from "firebase/firestore"

// --- Constants ---
const DOCUMENT_CATEGORIES = [
  {
    key: "admission_letter",
    label: "Admission Letter",
    icon: FileBadge,
    color: "emerald",
    description: "Official admission letter issued by the institution or uploaded by student",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "payment_receipt",
    label: "Payment Receipt",
    icon: Receipt,
    color: "blue",
    description: "Bank slips, M-Pesa messages, or any proof of payment",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "academic_cert",
    label: "Academic Certificate",
    icon: FileCheck2,
    color: "purple",
    description: "Previous certificates, transcripts, or academic records",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "national_id",
    label: "National ID / Passport",
    icon: FileText,
    color: "amber",
    description: "National ID, birth certificate or passport copy",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "other",
    label: "Other Documents",
    icon: FileArchive,
    color: "slate",
    description: "Any other supporting documents",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
]

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
}

const ICON_COLOR_MAP: Record<string, string> = {
  emerald: "text-emerald-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  amber: "text-amber-600",
  slate: "text-slate-500",
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// --- Main Component ---
export default function DocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const { toast } = useToast()

  // Fetch student record
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(
      collection(firestore, "students"),
      where("contactEmail", "==", user.email),
      limit(1)
    )
  }, [firestore, user])

  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // Fetch uploaded documents
  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(
      collection(firestore, "student_documents"),
      where("studentId", "==", student.id)
    )
  }, [firestore, student])

  const { data: documents, isLoading: isDocsLoading } = useCollection(docsQuery)

  // Fetch School (Official) Documents
  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])

  const { data: schoolDocs } = useCollection(schoolDocsQuery)

  // Upload state
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadCategory, setActiveUploadCategory] = useState<string | null>(null)
  const [activeReceipt, setActiveReceipt] = useState<any>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: payments } = useCollection(paymentsQuery)

  const triggerUpload = (categoryKey: string) => {
    setActiveUploadCategory(categoryKey)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeUploadCategory || !student?.id) return

    // Reset input so same file can be re-uploaded
    e.target.value = ""

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB} MB.`,
        variant: "destructive",
      })
      return
    }

    const categoryInfo = DOCUMENT_CATEGORIES.find(c => c.key === activeUploadCategory)
    setUploadingCategory(activeUploadCategory)
    setUploadProgress(0)

    try {
      const timestamp = Date.now()
      const storagePath = `student_documents/${student.id}/${activeUploadCategory}/${timestamp}_${file.name}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            setUploadProgress(progress)
          },
          (error) => reject(error),
          () => resolve()
        )
      })

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

      await addDoc(collection(firestore, "student_documents"), {
        studentId: student.id,
        studentFirebaseUid: user!.uid,
        category: activeUploadCategory,
        categoryLabel: categoryInfo?.label || activeUploadCategory,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath,
        downloadURL,
        uploadedAt: serverTimestamp(),
      })

      toast({
        title: "Document Uploaded",
        description: `"${file.name}" has been saved successfully.`,
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingCategory(null)
      setUploadProgress(0)
      setActiveUploadCategory(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      // Remove from Storage
      const storageRef = ref(storage, deleteTarget.storagePath)
      await deleteObject(storageRef)

      // Remove Firestore record
      await deleteDoc(doc(firestore, "student_documents", deleteTarget.id))

      toast({ title: "Document Deleted", description: `"${deleteTarget.fileName}" has been removed.` })
      setDeleteTarget(null)
    } catch (error) {
      console.error("Delete error:", error)
      toast({ title: "Delete Failed", description: "Could not delete the document.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const downloadDynamicReceipt = async (docItem: any) => {
    if (!payments) return
    const payment = payments.find(p => p.id === docItem.paymentId)
    if (!payment) {
      toast({ title: "Error", description: "Payment record not found.", variant: "destructive" })
      return
    }

    setActiveReceipt(payment)
    setIsGenerating(true)
    
    setTimeout(async () => {
      if (!receiptRef.current) return
      try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(docItem.fileName || `Receipt_${payment.transactionReference}.pdf`)
        toast({ title: "Success", description: "Receipt generated successfully." })
      } catch (e) {
        toast({ title: "Error", description: "Failed to generate receipt PDF.", variant: "destructive" })
      } finally {
        setIsGenerating(false)
        setActiveReceipt(null)
      }
    }, 100)
  }

  if (isStudentLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Group uploaded docs by category
  const docsByCategory = (documents || []).reduce<Record<string, any[]>>((acc, d) => {
    const cat = d.category || "other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(d)
    return acc
  }, {})

  const totalDocs = documents?.length || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Center</h1>
          <p className="text-slate-500 font-medium mt-1">
            Access official school records and manage your personal uploads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
            {totalDocs} personal files
          </div>
        </div>
      </div>

      {/* Official School Documents Section */}
      {schoolDocs && schoolDocs.length > 0 && (
        <div className="animate-in slide-in-from-top duration-500">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Official School Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schoolDocs.map((docItem) => {
              const typeBase = docItem.type?.replace('official_', '')
              const typeInfo = DOCUMENT_CATEGORIES.find(c => c.key === typeBase)
              const Icon = typeInfo?.icon || FileText
              return (
                <Card key={docItem.id} className="border-emerald-100 bg-emerald-50/30 shadow-sm rounded-xl overflow-hidden group hover:border-emerald-200 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{docItem.label || docItem.fileName}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Official Record</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 shrink-0" asChild>
                      <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-900">Secure Personal Storage</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Upload your personal identification and records here. All files are stored securely and only accessible by you and authorized staff.
          </p>
        </div>
      </div>

      {/* Upload Categories Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">My Uploads</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENT_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isUploading = uploadingCategory === cat.key
            const uploadedCount = (docsByCategory[cat.key] || []).length
            return (
              <Card
                key={cat.key}
                className="border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${COLOR_MAP[cat.color]} border`}>
                      <Icon className={`h-5 w-5 ${ICON_COLOR_MAP[cat.color]}`} />
                    </div>
                    {uploadedCount > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold border-0 h-5">
                        {uploadedCount} uploaded
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">{cat.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{cat.description}</p>
                  </div>

                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5 bg-slate-100" />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-9 font-bold text-xs gap-2 border-dashed hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
                      onClick={() => triggerUpload(cat.key)}
                      disabled={!!uploadingCategory}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add File
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">File Archive</h2>

        {isDocsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : totalDocs === 0 ? (
          <Card className="border shadow-sm rounded-xl">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Personal Uploads</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Your uploaded documents will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(documents || [])
              .slice()
              .sort((a, b) => {
                const aTime = a.uploadedAt?.toMillis?.() || 0
                const bTime = b.uploadedAt?.toMillis?.() || 0
                return bTime - aTime
              })
              .map((docItem) => {
                const catInfo = DOCUMENT_CATEGORIES.find(c => c.key === docItem.category)
                const Icon = catInfo?.icon || FileText
                const color = catInfo?.color || "slate"

                return (
                  <Card key={docItem.id} className="border shadow-sm rounded-xl hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_MAP[color]} border`}>
                        <Icon className={`h-5 w-5 ${ICON_COLOR_MAP[color]}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{docItem.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] h-4 px-1.5 font-bold uppercase ${COLOR_MAP[color]} border`}
                          >
                            {docItem.categoryLabel || catInfo?.label}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatBytes(docItem.fileSize || 0)}
                          </span>
                          {docItem.uploadedAt && (
                            <span className="text-[10px] text-slate-400">
                              · {formatDistanceToNow(docItem.uploadedAt.toDate(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                          disabled={isGenerating}
                          onClick={() => {
                            if (docItem.isDynamic) {
                              downloadDynamicReceipt(docItem)
                            } else {
                              window.open(docItem.downloadURL, '_blank')
                            }
                          }}
                        >
                          {isGenerating && activeReceipt?.id === docItem.paymentId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500"
                          onClick={() => setDeleteTarget(docItem)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" /> Delete Document?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-slate-900">"{deleteTarget?.fileName}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Receipt for PDF Generation */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} />
        )}
      </div>
    </div>
  )
}
