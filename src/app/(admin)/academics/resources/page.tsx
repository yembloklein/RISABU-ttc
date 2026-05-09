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
import { BookOpen, FileText, Upload, Trash2, Loader2, Download, Search, Plus, FileSpreadsheet } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"


export default function AcademicResourcesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    title: "",
    type: "Notes",
    courseName: "",
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
    try {
      // 1. Upload to local API
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await response.json();

      if (!response.ok) throw new Error(uploadResult.error || "Upload failed");

      // 2. Save metadata to Firestore
      await addDocumentNonBlocking(resourcesRef, {
        title: formData.title,
        type: formData.type,
        courseName: formData.courseName,
        fileName: file.name,
        fileUrl: uploadResult.fileUrl, // Relative local URL
        uploadedBy: user?.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast({ title: "Success", description: "Resource uploaded successfully (Local storage)." })
      setIsDialogOpen(false)
      setFile(null)
      setFormData({ title: "", type: "Notes", courseName: "" })
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
      // 1. Delete from local filesystem via API
      if (resource.fileUrl) {
        await fetch('/api/resources/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: resource.fileUrl }),
        });
      }
      
      // 2. Delete from Firestore
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Academic Resources</h1>
          <p className="text-slate-500 font-medium">Manage assignments and lecture notes for all courses</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg rounded-full h-11 px-6 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> Upload Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="bg-slate-50 p-6 border-b">
              <DialogTitle className="text-xl font-bold text-slate-900">Upload New Material</DialogTitle>
              <DialogDescription className="mt-1">
                Add assignments or notes to a specific course.
              </DialogDescription>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</Label>
                <Input 
                  placeholder="e.g. Introduction to Typography" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Notes">Lecture Notes</SelectItem>
                      <SelectItem value="Assignment">Assignment</SelectItem>
                      <SelectItem value="Reference">Reference Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Course</Label>
                  <Select value={formData.courseName} onValueChange={(v) => setFormData({...formData, courseName: v})}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
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

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select File</Label>
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

            <DialogFooter className="p-6 pt-0">
              <Button 
                onClick={handleUpload} 
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                {isUploading ? "Uploading..." : "Publish Resource"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search by title or course..." 
          className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Resource</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Course</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Type</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-right">Date</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResources ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredResources.length > 0 ? (
                filteredResources.map((res) => (
                  <TableRow key={res.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          {res.type === 'Assignment' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{res.title}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{res.fileName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 font-bold uppercase text-[10px]">
                        {res.courseName}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        res.type === 'Assignment' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {res.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span className="text-xs font-bold text-slate-500">
                        {res.createdAt?.seconds ? new Date(res.createdAt.seconds * 1000).toLocaleDateString() : "Recently"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(res)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">
                    No resources found.
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
