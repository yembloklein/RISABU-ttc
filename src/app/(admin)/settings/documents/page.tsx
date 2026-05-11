"use client"

import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, addDoc, deleteDoc, doc, serverTimestamp, getDocs, updateDoc, setDoc } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Download,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Settings,
  Globe,
  FileCheck2,
  FileBadge,
  Receipt,
  GraduationCap
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
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
  { key: "official_admission_letter", label: "Admission Letter", icon: FileBadge, description: "Official template for admission notifications" },
  { key: "official_fee_structure", label: "Fee Structure", icon: Receipt, description: "Standard fee schedule for all students" },
  { key: "official_prospectus", label: "College Prospectus", icon: BookOpen, description: "Official college brochure and course catalog" },
  { key: "official_id_template", label: "ID Card Template", icon: GraduationCap, description: "Official layout/instructions for student IDs" },
  { key: "official_other", label: "General Document", icon: FileText, description: "Any other official downloadable document" },
]

import { BookOpen } from "lucide-react"

export default function SchoolDocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const { toast } = useToast()

  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])

  const { data: schoolDocs, isLoading } = useCollection(schoolDocsQuery)

  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeType, setActiveType] = useState<string | null>(null)

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
      const storagePath = `school_documents/${activeType}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed", 
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          (err) => reject(err),
          () => resolve()
        )
      })

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

      await addDoc(collection(firestore, "school_documents"), {
        type: activeType,
        label: typeInfo?.label || activeType,
        fileName: file.name,
        fileSize: file.size,
        downloadURL,
        storagePath,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email,
        active: true
      })

      toast({ title: "Success", description: `Uploaded ${file.name} successfully.` })
    } catch (error) {
      console.error(error)
      toast({ title: "Upload Failed", variant: "destructive" })
    } finally {
      setUploadingType(null)
      setActiveType(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !firestore) return
    setIsDeleting(true)
    try {
      await deleteObject(ref(storage, deleteTarget.storagePath))
      await deleteDoc(doc(firestore, "school_documents", deleteTarget.id))
      toast({ title: "Deleted", description: "Document removed successfully." })
      setDeleteTarget(null)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Documents</h1>
          <p className="text-muted-foreground mt-1">Manage official templates and downloadable documents for all students.</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Settings className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {OFFICIAL_DOC_TYPES.map((type) => {
          const Icon = type.icon
          const isUploading = uploadingType === type.key
          const existing = schoolDocs?.filter(d => d.type === type.key)
          
          return (
            <Card key={type.key} className="border-2 border-dashed bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold">{type.label}</CardTitle>
                </div>
                <CardDescription className="text-[11px] leading-tight mt-1">{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {existing && existing.length > 0 ? (
                  <div className="space-y-2">
                    {existing.map((docItem) => (
                      <div key={docItem.id} className="flex items-center justify-between p-2 rounded-lg bg-background border text-xs">
                        <span className="truncate max-w-[120px] font-medium">{docItem.fileName}</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" asChild>
                            <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(docItem)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-xs text-muted-foreground italic">
                    No official file uploaded
                  </div>
                )}

                {isUploading ? (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-1.5" />
                    <p className="text-[10px] text-center font-bold uppercase tracking-widest text-primary">{uploadProgress}% Uploading...</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-9 gap-2 text-xs font-bold" 
                    variant="outline" 
                    onClick={() => triggerUpload(type.key)}
                    disabled={!!uploadingType}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Upload Official File
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-2 border-primary/10">
        <CardHeader>
          <div className="flex items-center gap-2">
             <Globe className="h-5 w-5 text-primary" />
             <CardTitle>Public Resource Library</CardTitle>
          </div>
          <CardDescription>These documents appear in the "Official Documents" section of every student's portal.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 text-primary mt-1 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold">Automatic Replacement Rule</p>
                <p className="text-xs text-muted-foreground">
                  If an official <strong>Admission Letter</strong> is uploaded here, the system will prioritize it over the auto-generated version for all enrolled students.
                </p>
              </div>
           </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Official Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the official file for all students. They will revert to using system-generated versions where applicable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
