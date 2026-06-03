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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Search, Plus, Loader2, BookOpen, User, Trash2, Edit2, ClipboardCheck, GraduationCap, CalendarDays, MapPin, Clock, Upload } from "lucide-react"

import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, serverTimestamp, addDoc, where, writeBatch } from "firebase/firestore"
import * as XLSX from "xlsx"

import { toast } from "@/hooks/use-toast"
import { triggerEmail } from "@/lib/send-email"
import { getExamScheduledEmail } from "@/lib/email-templates"

// Standard Kenyan University Grading
const getGradeInfo = (total: number) => {
  if (total >= 70) return { letter: "A", label: "Distinction", color: "bg-emerald-50 text-emerald-700" }
  if (total >= 60) return { letter: "B", label: "Credit", color: "bg-blue-50 text-blue-700" }
  if (total >= 50) return { letter: "C", label: "Pass", color: "bg-indigo-50 text-indigo-700" }
  if (total >= 40) return { letter: "D", label: "Pass", color: "bg-amber-50 text-amber-700" }
  return { letter: "E", label: "Fail", color: "bg-rose-50 text-rose-700" }
}

export default function ExaminationsPage() {
  const [activeTab, setActiveTab] = useState("grades")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUnit, setSelectedUnit] = useState<string>("all")
  
  // Grade Dialog State
  const [isAddGradeDialogOpen, setIsAddGradeDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeGradeId, setActiveGradeId] = useState<string | null>(null)
  const [gradeFormData, setGradeFormData] = useState({ studentId: "", catMarks: "", finalMarks: "" })

  // Schedule Dialog State
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [scheduleFormData, setScheduleFormData] = useState({
    unitId: "",
    examType: "CAT",
    date: "",
    time: "",
    venue: ""
  })
  
  const firestore = useFirestore()
  const { user } = useUser()
  const [isImporting, setIsImporting] = useState(false)

  // 1. Fetch Units
  const unitsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "units") : null, [firestore, user])
  const { data: units, isLoading: loadingUnits } = useCollection(unitsRef)

  // 2. Fetch Students
  const studentsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "students"), orderBy("firstName")) : null, [firestore, user])
  const { data: students, isLoading: loadingStudents } = useCollection(studentsRef)

  // 3. Fetch Grades
  const gradesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    if (selectedUnit !== "all") {
      return query(collection(firestore, "grades"), where("unitId", "==", selectedUnit))
    }
    return query(collection(firestore, "grades"))
  }, [firestore, user, selectedUnit])
  const { data: grades, isLoading: loadingGrades } = useCollection(gradesRef)

  // 4. Fetch Scheduled Exams
  const scheduledExamsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "scheduled_exams"), orderBy("date", "asc"))
  }, [firestore, user])
  const { data: scheduledExams, isLoading: loadingScheduledExams } = useCollection(scheduledExamsRef)


  // Filtering Grades
  const filteredGrades = useMemo(() => {
    return (grades || []).filter(g => 
      g.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.unitCode?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grades, searchTerm])

  // --- Grade Handlers ---
  const handleOpenAddGradeDialog = () => {
    if (selectedUnit === "all") {
      toast({ title: "Select a Unit First", description: "Please select a specific unit from the filter dropdown before adding grades.", variant: "destructive" })
      return
    }
    setIsEditing(false)
    setActiveGradeId(null)
    setGradeFormData({ studentId: "", catMarks: "", finalMarks: "" })
    setIsAddGradeDialogOpen(true)
  }

  const handleOpenEditGradeDialog = (grade: any) => {
    setIsEditing(true)
    setActiveGradeId(grade.id)
    setGradeFormData({
      studentId: grade.studentId,
      catMarks: grade.catMarks?.toString() || "0",
      finalMarks: grade.finalMarks?.toString() || "0"
    })
    setIsAddGradeDialogOpen(true)
  }

  const handleSaveGrade = async () => {
    if (!firestore || !selectedUnit || selectedUnit === "all" || !gradeFormData.studentId) {
      toast({ title: "Missing Fields", description: "Please ensure a unit and student are selected.", variant: "destructive" })
      return
    }

    const cat = Number(gradeFormData.catMarks) || 0
    const final = Number(gradeFormData.finalMarks) || 0

    if (cat < 0 || cat > 30) {
      toast({ title: "Invalid CAT Marks", description: "CAT marks must be between 0 and 30.", variant: "destructive" })
      return
    }
    if (final < 0 || final > 70) {
      toast({ title: "Invalid Final Marks", description: "Final marks must be between 0 and 70.", variant: "destructive" })
      return
    }

    const total = cat + final
    const gradeInfo = getGradeInfo(total)
    
    const student = students?.find(s => s.id === gradeFormData.studentId)
    const unit = units?.find(u => u.id === selectedUnit)

    try {
      const gradePayload = {
        studentId: student?.id,
        studentName: `${student?.firstName} ${student?.lastName}`,
        studentAdm: student?.admissionNumber || student?.id.substring(0, 8),
        unitId: unit?.id,
        unitName: unit?.name,
        unitCode: unit?.code,
        catMarks: cat,
        finalMarks: final,
        totalMarks: total,
        gradeLetter: gradeInfo.letter,
        gradeLabel: gradeInfo.label,
        updatedAt: serverTimestamp()
      }

      if (isEditing && activeGradeId) {
        await updateDocumentNonBlocking(doc(firestore, "grades", activeGradeId), gradePayload)
        toast({ title: "Grade Updated", description: "The examination result has been updated." })
      } else {
        const exists = grades?.some(g => g.studentId === gradeFormData.studentId && g.unitId === selectedUnit)
        if (exists) {
          toast({ title: "Already Exists", description: "A grade for this student in this unit already exists. Edit it instead.", variant: "destructive" })
          return
        }
        await addDoc(collection(firestore, "grades"), {
          ...gradePayload,
          createdAt: serverTimestamp()
        })
        toast({ title: "Grade Saved", description: "The examination result has been recorded." })
      }
      
      setIsAddGradeDialogOpen(false)
      setGradeFormData({ studentId: "", catMarks: "", finalMarks: "" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteGrade = async (gradeId: string) => {
    if (!firestore || !confirm("Are you sure you want to permanently delete this grade record?")) return
    try {
      await deleteDocumentNonBlocking(doc(firestore, "grades", gradeId))
      toast({ title: "Deleted", description: "Grade record removed." })
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (selectedUnit === "all") {
      toast({ title: "Select a Unit", description: "Please select a specific unit before importing grades.", variant: "destructive" })
      e.target.value = ""
      return
    }

    const unit = units?.find(u => u.id === selectedUnit)
    if (!unit || !firestore || !students) return

    setIsImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      const batch = writeBatch(firestore)
      let importedCount = 0

      jsonData.forEach((row) => {
        // Try to match student by admission number (case insensitive)
        const adm = row['AdmissionNumber'] || row['Admission Number'] || row['Adm']
        const cat = Number(row['CATMarks'] || row['CAT Marks'] || row['CAT']) || 0
        const final = Number(row['FinalMarks'] || row['Final Marks'] || row['Final']) || 0

        if (!adm) return

        const student = students.find(s => s.admissionNumber?.toLowerCase() === String(adm).toLowerCase())
        if (!student) return

        const total = cat + final
        const gradeInfo = getGradeInfo(total)

        // Check if grade already exists for this unit and student
        const exists = grades?.some(g => g.studentId === student.id && g.unitId === selectedUnit)
        if (exists) return // Skip duplicates

        const newGradeRef = doc(collection(firestore, "grades"))
        batch.set(newGradeRef, {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentAdm: student.admissionNumber || student.id.substring(0, 8),
          unitId: unit.id,
          unitName: unit.name,
          unitCode: unit.code,
          catMarks: cat,
          finalMarks: final,
          totalMarks: total,
          gradeLetter: gradeInfo.letter,
          gradeLabel: gradeInfo.label,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        importedCount++
      })

      if (importedCount > 0) {
        await batch.commit()
        toast({ title: "Import Successful", description: `Successfully imported ${importedCount} grades.` })
      } else {
        toast({ title: "No Grades Imported", description: "Could not find matching students or grades already exist.", variant: "default" })
      }
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsImporting(false)
      e.target.value = ""
    }
  }

  // --- Schedule Handlers ---
  const handleSaveSchedule = async () => {
    if (!firestore) return
    const { unitId, examType, date, time, venue } = scheduleFormData

    if (!unitId || !date || !time || !venue) {
      toast({ title: "Missing Fields", description: "Please fill in all scheduling details.", variant: "destructive" })
      return
    }

    const unit = units?.find(u => u.id === unitId)
    if (!unit) return

    try {
      // 1. Create the Schedule Document
      await addDoc(collection(firestore, "scheduled_exams"), {
        unitId,
        unitName: unit.name,
        unitCode: unit.code,
        examType,
        date,
        time,
        venue,
        createdAt: serverTimestamp()
      })

      // 2. Notify Students (Batch write notifications to all students)
      // Ideally, we filter by students enrolled in this unit, but since we don't have strict enrollment querying active, we will broadcast a portal notification to all active students or simulate it.
      // For this implementation, we will send to all students in the portal to ensure they see it.
      if (students && students.length > 0) {
        const batch = writeBatch(firestore)
        
        // Firestore batches can handle up to 500 writes. We slice to 400 to be safe.
        const studentsToNotify = students.slice(0, 400)
        
        studentsToNotify.forEach(student => {
          const newNotifRef = doc(collection(firestore, "notifications"))
          batch.set(newNotifRef, {
            studentId: student.id,
            title: `Upcoming ${examType} Scheduled`,
            message: `A ${examType} for ${unit.code} (${unit.name}) has been scheduled on ${date} at ${time}. Venue: ${venue}.`,
            type: "Academic",
            link: "/portal/academics",
            read: false,
            createdAt: serverTimestamp()
          })

          // Send email notification
          if (student.contactEmail) {
            triggerEmail({
              to: student.contactEmail,
              ...getExamScheduledEmail(student.firstName, `${unit.code} - ${unit.name} (${examType})`, `${date} at ${time}`)
            }).catch(e => console.error("Failed to send exam email", e))
          }
        })
        
        await batch.commit()
      }

      toast({ title: "Exam Scheduled", description: `The ${examType} has been scheduled and students have been notified via their portals.` })
      setIsScheduleDialogOpen(false)
      setScheduleFormData({ unitId: "", examType: "CAT", date: "", time: "", venue: "" })
    } catch (error: any) {
      toast({ title: "Error Scheduling", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!firestore || !confirm("Are you sure you want to cancel and delete this scheduled exam?")) return
    try {
      await deleteDocumentNonBlocking(doc(firestore, "scheduled_exams", id))
      toast({ title: "Deleted", description: "Exam schedule removed." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Academics</p>
          <h1 className="text-2xl font-bold text-slate-900">Examinations & Grading</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage schedules, CATs, final exams, and compute final grades.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="grades" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6 font-semibold">Grade Results</TabsTrigger>
          <TabsTrigger value="schedules" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6 font-semibold">Scheduled Exams</TabsTrigger>
        </TabsList>

        {/* GRADES TAB */}
        <TabsContent value="grades" className="space-y-6 outline-none">
          <div className="flex flex-col md:flex-row gap-3 bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
            <div className="w-full md:w-64">
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm font-semibold text-emerald-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <SelectValue placeholder="Select a Unit" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">View All Units</SelectItem>
                  {(units || []).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.code} - {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search student or admission no..." 
                className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={isImporting || selectedUnit === "all"}
                />
                <Button 
                  variant="outline"
                  className="h-10 px-4 rounded-lg text-sm font-medium shadow-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all w-full"
                  disabled={isImporting || selectedUnit === "all"}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import Excel
                </Button>
              </div>
              <Button 
                className="h-10 px-4 rounded-lg text-sm font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all w-full md:w-auto"
                onClick={handleOpenAddGradeDialog}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Result
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1 md:col-span-4 flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-semibold px-4 py-2 rounded-lg border border-blue-100">
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              <span>Standard Grading Rule Active: CATs (30%) + Final Examination (70%).</span>
            </div>
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5 w-[250px]">Student Details</TableHead>
                    {selectedUnit === "all" && <TableHead className="font-semibold text-slate-500 h-10 text-xs">Unit</TableHead>}
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center">CAT (30%)</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center">Final (70%)</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center">Total Score</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center">Grade</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingGrades ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                      </TableCell>
                    </TableRow>
                  ) : filteredGrades.length > 0 ? (
                    filteredGrades.map((grade) => {
                      const info = getGradeInfo(grade.totalMarks)
                      return (
                        <TableRow key={grade.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                          <TableCell className="py-3 pl-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{grade.studentName}</span>
                              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-0.5">{grade.studentAdm}</span>
                            </div>
                          </TableCell>
                          {selectedUnit === "all" && (
                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-800">{grade.unitName}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{grade.unitCode}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="py-3 text-center">
                            <span className="font-mono font-semibold text-slate-700">{grade.catMarks}</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="font-mono font-semibold text-slate-700">{grade.finalMarks}</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="font-mono font-black text-lg text-emerald-700">{grade.totalMarks}%</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className={`border-0 font-bold px-2 py-0.5 text-xs ${info.color}`}>
                                {info.letter}
                              </Badge>
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{info.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEditGradeDialog(grade)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteGrade(grade.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-slate-400 text-sm italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <GraduationCap className="h-8 w-8 text-slate-200" />
                          <p>{selectedUnit === "all" ? "Select a unit or add your first grade result." : "No grades recorded for this unit yet."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* SCHEDULES TAB */}
        <TabsContent value="schedules" className="space-y-6 outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Exams</h2>
            <Button 
              className="h-9 px-4 rounded-lg text-sm font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
              onClick={() => setIsScheduleDialogOpen(true)}
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Schedule Exam
            </Button>
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Unit</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Type</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Date & Time</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Venue</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingScheduledExams ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                      </TableCell>
                    </TableRow>
                  ) : scheduledExams && scheduledExams.length > 0 ? (
                    scheduledExams.map((exam) => (
                      <TableRow key={exam.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                        <TableCell className="py-3 pl-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{exam.unitName}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-0.5">{exam.unitCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`border-0 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider ${exam.examType === 'CAT' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'}`}>
                            {exam.examType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{exam.date}</span>
                            <span className="text-sm font-medium text-slate-500 mx-1">•</span>
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{exam.time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="text-sm font-medium">{exam.venue}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteSchedule(exam.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarDays className="h-8 w-8 text-slate-200" />
                          <p>No exams currently scheduled.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------- DIALOGS ------------------- */}

      {/* Add / Edit Grade Dialog */}
      <Dialog open={isAddGradeDialogOpen} onOpenChange={setIsAddGradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border border-slate-200 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">{isEditing ? "Edit Grade Result" : "Record Grade Result"}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              {isEditing ? "Update the scores for this examination." : `Adding result for: ${units?.find(u => u.id === selectedUnit)?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">Select Student</Label>
              <Select 
                value={gradeFormData.studentId} 
                onValueChange={(val) => setGradeFormData({...gradeFormData, studentId: val})}
                disabled={isEditing}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200 focus:ring-emerald-500">
                  <SelectValue placeholder={loadingStudents ? "Loading..." : "Select enrolled student"} />
                </SelectTrigger>
                <SelectContent>
                  {(students || []).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber || s.id.substring(0,8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">CAT Marks (Out of 30)</Label>
                <Input 
                  type="number"
                  min="0" max="30"
                  value={gradeFormData.catMarks}
                  onChange={(e) => setGradeFormData({...gradeFormData, catMarks: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-lg font-mono font-semibold"
                  placeholder="0 - 30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Final Marks (Out of 70)</Label>
                <Input 
                  type="number"
                  min="0" max="70"
                  value={gradeFormData.finalMarks}
                  onChange={(e) => setGradeFormData({...gradeFormData, finalMarks: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-lg font-mono font-semibold"
                  placeholder="0 - 70"
                />
              </div>
            </div>

            {(gradeFormData.catMarks || gradeFormData.finalMarks) && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Computed Total</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">
                    {(Number(gradeFormData.catMarks) || 0) + (Number(gradeFormData.finalMarks) || 0)} <span className="text-sm font-medium text-slate-500">/ 100</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grade</p>
                  <p className={`text-xl font-black mt-0.5 ${getGradeInfo((Number(gradeFormData.catMarks) || 0) + (Number(gradeFormData.finalMarks) || 0)).color.split(' ')[1]}`}>
                    {getGradeInfo((Number(gradeFormData.catMarks) || 0) + (Number(gradeFormData.finalMarks) || 0)).letter}
                  </p>
                </div>
              </div>
            )}

          </div>
          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
            <Button 
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
              onClick={handleSaveGrade}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {isEditing ? "Update Result" : "Save Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Exam Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border border-slate-200 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Schedule Examination</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Creates a new schedule and pushes a notification to the student portal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">Unit</Label>
              <Select 
                value={scheduleFormData.unitId} 
                onValueChange={(val) => setScheduleFormData({...scheduleFormData, unitId: val})}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200 focus:ring-emerald-500">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {(units || []).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.code} - {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">Examination Type</Label>
              <Select 
                value={scheduleFormData.examType} 
                onValueChange={(val) => setScheduleFormData({...scheduleFormData, examType: val})}
              >
                <SelectTrigger className="h-10 rounded-lg border-slate-200 focus:ring-emerald-500">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAT">Continuous Assessment Test (CAT)</SelectItem>
                  <SelectItem value="Final Examination">Final Examination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Date</Label>
                <Input 
                  type="date"
                  value={scheduleFormData.date}
                  onChange={(e) => setScheduleFormData({...scheduleFormData, date: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Time</Label>
                <Input 
                  type="time"
                  value={scheduleFormData.time}
                  onChange={(e) => setScheduleFormData({...scheduleFormData, time: e.target.value})}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">Venue</Label>
              <Input 
                type="text"
                value={scheduleFormData.venue}
                onChange={(e) => setScheduleFormData({...scheduleFormData, venue: e.target.value})}
                placeholder="e.g. Main Hall"
                className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-sm"
              />
            </div>

          </div>
          <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
            <Button 
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
              onClick={handleSaveSchedule}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Publish Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
