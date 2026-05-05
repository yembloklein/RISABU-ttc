"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, Search, Edit2, Trash2, Loader2, Info } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"

const INITIAL_COURSES = [
  { name: "Graphics Design", tuitionFee: 18000, durationMonths: 3, description: "Professional graphics design course" },
  { name: "Web Design", tuitionFee: 20000, durationMonths: 4, description: "Modern web development and design" },
  { name: "Videography and Photography", tuitionFee: 15000, durationMonths: 3, description: "Capturing and editing professional visual content" },
  { name: "Digital Marketing", tuitionFee: 15000, durationMonths: 2, description: "Strategic online marketing and branding" },
  { name: "Microsoft Packages", tuitionFee: 12000, durationMonths: 1, description: "Mastery of essential office tools" }
]

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", tuitionFee: "", durationMonths: "", description: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"
  
  const programsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  const { data: programs, isLoading } = useCollection(programsRef)

  const filteredPrograms = (programs || []).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (course: any = null) => {
    if (course) {
      setEditingCourse(course)
      setFormData({
        name: course.name,
        tuitionFee: course.tuitionFee.toString(),
        durationMonths: course.durationMonths.toString(),
        description: course.description || ""
      })
    } else {
      setEditingCourse(null)
      setFormData({ name: "", tuitionFee: "", durationMonths: "", description: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSaveCourse = () => {
    if (!programsRef) return;
    
    const data = {
      name: formData.name,
      tuitionFee: Number(formData.tuitionFee),
      durationMonths: Number(formData.durationMonths),
      description: formData.description,
      updatedAt: serverTimestamp(),
    }

    if (editingCourse) {
      const docRef = doc(firestore!, "programs", editingCourse.id)
      updateDocumentNonBlocking(docRef, data)
    } else {
      addDocumentNonBlocking(programsRef, {
        ...data,
        createdAt: serverTimestamp(),
      })
    }
    
    setIsDialogOpen(false)
  }

  const handleDeleteCourse = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this course?")) return;
    const docRef = doc(firestore, "programs", id)
    deleteDocumentNonBlocking(docRef)
  }

  const handleSeedData = () => {
    if (!programsRef || !isAdmin) return;
    INITIAL_COURSES.forEach(course => {
      addDocumentNonBlocking(programsRef, {
        ...course,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Course Catalog</h1>
          <p className="text-muted-foreground">Manage and update college academic programs</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            {(programs?.length === 0) && (
              <Button variant="outline" onClick={handleSeedData}>
                Seed Defaults
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the academic program.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Web Design" className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fee" className="text-right">Fee (KES)</Label>
                    <Input 
                      id="fee" 
                      type="number"
                      value={formData.tuitionFee}
                      onChange={(e) => setFormData({...formData, tuitionFee: e.target.value})}
                      placeholder="0.00" className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="duration" className="text-right">Duration</Label>
                    <Input 
                      id="duration" 
                      type="number"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({...formData, durationMonths: e.target.value})}
                      placeholder="Months" className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="desc" className="text-right pt-2">Description</Label>
                    <Textarea 
                      id="desc" 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Course overview..." className="col-span-3" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveCourse} className="bg-primary">
                    {editingCourse ? "Update Course" : "Create Course"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg flex items-center gap-3">
          <Info className="h-5 w-5" />
          <p className="text-sm font-medium">Viewing as Staff. Only the Super Admin can add or edit courses.</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search courses..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Tuition Fee</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredPrograms.length > 0 ? (
                filteredPrograms.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-primary">{p.name}</TableCell>
                    <TableCell className="font-mono font-semibold">KES {p.tuitionFee.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.durationMonths} Months</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {p.description || "No description provided."}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" variant="ghost" className="h-8 w-8 text-blue-600"
                            onClick={() => handleOpenDialog(p)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCourse(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    {programs?.length === 0 ? "No courses registered yet." : "No results match your search."}
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