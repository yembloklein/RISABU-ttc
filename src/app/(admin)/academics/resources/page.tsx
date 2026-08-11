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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Upload, Trash2, Loader2, Download, Search, Plus, FileSpreadsheet, CheckSquare, Square } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function AcademicResourcesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)

  const [formData, setFormData] = useState({
    title: "",
    type: "Notes",
    courseName: "",
    visibleTo: [] as string[],
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const resourcesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "academic_resources") : null, [firestore, user])
  const coursesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])

  const { data: resources, isLoading: loadingResources } = useCollection(resourcesRef)
  const { data: courses } = useCollection(coursesRef)

  const filteredResources = useMemo(() => {
    return (resources || []).filter(r =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.courseName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [resources, searchTerm])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !formData.title || !formData.courseName || !resourcesRef) {
      toast({ title: "Missing Fields", description: "Please fill all fields and select a file.", variant: "destructive" })
      return
    }

    setIsUploading(true)
    setProgress(10)
    try {
      // Upload to Cloudinary via our API route
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'academic_resources')

      setProgress(40)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        // Safely parse error — server may return plain text on 413 (too large) etc.
        let errMessage = `Upload failed (HTTP ${response.status})`
        try {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const err = await response.json()
            errMessage = err.error || errMessage
          } else {
            const text = await response.text()
            if (response.status === 413) {
              errMessage = 'File is too large. Please upload a file smaller than 50 MB.'
            } else if (text) {
              errMessage = text.slice(0, 200)
            }
          }
        } catch {}
        throw new Error(errMessage)
      }

      const result = await response.json()
      setProgress(90)

      await addDocumentNonBlocking(resourcesRef, {
        title: formData.title,
        type: formData.type,
        courseName: formData.courseName,
        visibleTo: formData.visibleTo.length > 0 ? formData.visibleTo : [formData.courseName],
        fileName: file.name,
        fileUrl: result.fileUrl,
        publicId: result.publicId,
        uploadedBy: user?.email || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })


      setProgress(100)
      toast({ title: "Success", description: "Resource uploaded successfully." })
      setIsDialogOpen(false)
      setFile(null)
      setProgress(0)
      setFormData({ title: "", type: "Notes", courseName: "", visibleTo: [] })
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (resource: any) => {
    if (!confirm("Are you sure you want to delete this resource?") || !firestore) return

    try {
      // Delete from Cloudinary if publicId exists
      if (resource.publicId) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: resource.publicId, resourceType: 'raw' }),
        }).catch(e => console.warn('Cloudinary delete warning:', e))
      }

      const docRef = doc(firestore, "academic_resources", resource.id)
      deleteDocumentNonBlocking(docRef)

      toast({ title: "Deleted", description: "Resource has been removed." })
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete resource.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Course Materials</p>
          <h1 className="text-2xl font-bold text-slate-900">Academic Resources</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage assignments and lecture notes for all courses.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg h-10 px-6 transition-all">
              <Plus className="mr-2 h-4 w-4" /> Upload Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border border-slate-200 shadow-lg rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Upload New Material</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Add assignments or notes to a specific course.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Title</Label>
                <Input
                  placeholder="e.g. Introduction to Typography"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Resource Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="h-10 border-slate-200 focus:ring-emerald-500 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Notes">Lecture Notes</SelectItem>
                      <SelectItem value="Reference">Reference Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Primary Course</Label>
                  <Select value={formData.courseName} onValueChange={(v) => {
                    setFormData(prev => ({
                      ...prev,
                      courseName: v,
                      visibleTo: prev.visibleTo.includes(v) ? prev.visibleTo : [v, ...prev.visibleTo]
                    }))
                  }}>
                    <SelectTrigger className="h-10 border-slate-200 focus:ring-emerald-500 rounded-lg">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {(courses || []).map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multi-course visibility */}
              {formData.courseName && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Also Visible To
                    <span className="text-slate-400 font-normal">(optional — for cross-course access)</span>
                  </Label>
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto bg-slate-50/50">
                    {(courses || []).filter(c => c.name !== formData.courseName).map(c => {
                      const checked = formData.visibleTo.includes(c.name)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            visibleTo: checked
                              ? prev.visibleTo.filter(n => n !== c.name)
                              : [...prev.visibleTo, c.name]
                          }))}
                          className="w-full flex items-center gap-2.5 text-left px-2 py-1.5 rounded-md hover:bg-white transition-colors"
                        >
                          {checked
                            ? <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                            : <Square className="h-4 w-4 text-slate-300 shrink-0" />}
                          <span className={`text-xs font-medium ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  {formData.visibleTo.filter(n => n !== formData.courseName).length > 0 && (
                    <p className="text-[10px] text-emerald-600 font-medium">
                      ✓ Visible to {formData.visibleTo.length} course(s)
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Select File</Label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-slate-300 transition-all bg-slate-50/50">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">
                      {file ? file.name : "Click or drag to upload"}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">PDF, Word, or Zip files</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
              <Button
                onClick={handleUpload}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {isUploading ? `Uploading... ${progress}%` : "Publish Resource"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by title or course..."
          className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Resource</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Course</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Type</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right">Date</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResources ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                  </TableCell>
                </TableRow>
              ) : filteredResources.length > 0 ? (
                filteredResources.map((res) => (
                  <TableRow key={res.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          {res.type === 'Assignment' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-slate-900">{res.title}</span>
                          <span className="text-[10px] text-slate-500">{res.fileName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 font-medium text-xs">
                        {res.courseName}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${res.type === 'Assignment' ? 'bg-amber-50 text-amber-700' :
                          res.type === 'Reference' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-blue-50 text-blue-700'
                        }`}>
                        {res.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-xs font-medium text-slate-500">
                        {res.createdAt?.seconds ? new Date(res.createdAt.seconds * 1000).toLocaleDateString() : "Recently"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md" asChild>
                          <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" onClick={() => handleDelete(res)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm">
                    No resources found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
