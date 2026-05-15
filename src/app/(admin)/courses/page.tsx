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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, Plus, Search, Edit2, Trash2, Loader2, Info, Users, GraduationCap, Phone, Mail } from "lucide-react"
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
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", tuitionFee: "", durationMonths: "", description: "" })
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [isStudentsSheetOpen, setIsStudentsSheetOpen] = useState(false)
  
  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"
  
  const programsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  const { data: programs, isLoading } = useCollection(programsRef)

  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  const { data: students } = useCollection(studentsRef)

  // Build enrollment count map: course name -> count
  const enrollmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (students || []).forEach(s => {
      if (s.admissionStatus === 'Enrolled' && s.appliedCourse) {
        const course = s.appliedCourse.trim();
        counts[course] = (counts[course] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  const filteredPrograms = useMemo(() => {
    return (programs || []).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [programs, searchTerm]);

  const handleOpenDialog = (course: any = null) => {
    if (course) {
      setEditingCourseId(course.id)
      setFormData({
        name: course.name,
        tuitionFee: course.tuitionFee.toString(),
        durationMonths: course.durationMonths.toString(),
        description: course.description || ""
      })
    } else {
      setEditingCourseId(null)
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

    if (editingCourseId) {
      const docRef = doc(firestore!, "programs", editingCourseId)
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
                  <DialogTitle>{editingCourseId ? "Edit Course" : "Add New Course"}</DialogTitle>
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
                    {editingCourseId ? "Update Course" : "Create Course"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-primary/5 border border-primary/20 text-primary p-4 rounded-lg flex items-center gap-3">
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
                <TableHead>Enrolled Students</TableHead>
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
                filteredPrograms.map((p) => {
                  const enrolled = enrollmentCounts[p.name] || 0;
                  return (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-primary">{p.name}</TableCell>
                    <TableCell className="font-mono font-semibold">KES {p.tuitionFee.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.durationMonths} Months</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => { setSelectedCourse(p.name); setIsStudentsSheetOpen(true); }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          enrolled > 0
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                            : 'bg-slate-100 text-slate-500 cursor-default'
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        {enrolled} {enrolled === 1 ? 'Student' : 'Students'}
                        {enrolled > 0 && <span className="ml-0.5 opacity-60">↗</span>}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {p.description || "No description provided."}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" variant="ghost" className="h-8 w-8 text-primary"
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
                  );
                })
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

      {/* Students enrolled in course - side sheet */}
      <Sheet open={isStudentsSheetOpen} onOpenChange={setIsStudentsSheetOpen}>
        <SheetContent className="sm:max-w-[480px] p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-900">{selectedCourse}</SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-0.5">
                  {selectedCourse ? (enrollmentCounts[selectedCourse] || 0) : 0} enrolled students
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-4 space-y-2">
            {selectedCourse && (students || []).filter(s =>
              s.admissionStatus === 'Enrolled' && s.appliedCourse?.trim() === selectedCourse
            ).length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No students enrolled in this course yet.</p>
              </div>
            ) : (
              (students || []).filter(s =>
                s.admissionStatus === 'Enrolled' && s.appliedCourse?.trim() === selectedCourse
              ).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xs font-bold">
                      {s.firstName?.[0]}{s.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">ADM: {s.admissionNumber || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.status === 'Active' || !s.status
                        ? 'bg-emerald-50 text-emerald-700'
                        : s.status === 'Graduated'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {s.status || 'Active'}
                    </span>
                    {s.contactPhone && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" /> {s.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}