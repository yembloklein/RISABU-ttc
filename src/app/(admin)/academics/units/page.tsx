"use client"

import { useState, useMemo, useEffect } from "react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { BookOpen, Plus, Search, Edit2, Trash2, Loader2, User, Hash, Filter, Download, Printer, Users, GraduationCap, Activity, CheckCircle2, BarChart3, Save, LayoutGrid, List, RotateCcw } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy, updateDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function ManageUnitsPage() {
  const [activeTab, setActiveTab] = useState("catalog")

  // Catalog State
  const [unitSearchTerm, setUnitSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    courseName: "",
    instructor: "",
    status: "Active"
  })

  // Registrations State
  const [regSearchTerm, setRegSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedUnit, setSelectedUnit] = useState("all")

  // Progress State — unit-centric (one value per unit, pushes to all enrolled students)
  const [unitProgressDraft, setUnitProgressDraft] = useState<Record<string, number>>({})
  const [savingUnitIds, setSavingUnitIds] = useState<Set<string>>(new Set())

  // Progress Tab Filter & View States
  const [progressSearchTerm, setProgressSearchTerm] = useState("")
  const [progressSelectedCourse, setProgressSelectedCourse] = useState("all")
  const [progressSelectedStatus, setProgressSelectedStatus] = useState("all") // all, not_started, in_progress, completed, dirty
  const [progressViewMode, setProgressViewMode] = useState<"grid" | "table">("grid")

  const firestore = useFirestore()
  const { user } = useUser()

  // Data Fetching
  const unitsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "units") : null, [firestore, user])
  const coursesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  const regsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "unit_registrations"), orderBy("registeredAt", "desc")) : null, [firestore, user])
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])

  const { data: units, isLoading: loadingUnits } = useCollection(unitsRef)
  const { data: courses } = useCollection(coursesRef)
  const { data: registrations, isLoading: loadingRegs } = useCollection(regsRef)
  const { data: students } = useCollection(studentsRef)

  // --- CATALOG LOGIC ---
  const filteredUnits = useMemo(() => {
    return (units || []).filter(u =>
      u.name.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
      u.courseName.toLowerCase().includes(unitSearchTerm.toLowerCase())
    )
  }, [units, unitSearchTerm])

  const handleOpenDialog = (unit: any = null) => {
    if (unit) {
      setEditingUnitId(unit.id)
      setFormData({
        name: unit.name,
        code: unit.code,
        courseName: unit.courseName,
        instructor: unit.instructor || "",
        status: unit.status || "Active"
      })
    } else {
      setEditingUnitId(null)
      setFormData({ name: "", code: "", courseName: "", instructor: "", status: "Active" })
    }
    setIsDialogOpen(true)
  }

  const handleSaveUnit = async () => {
    if (!formData.name || !formData.code || !formData.courseName || !unitsRef) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" })
      return
    }

    const updateData = {
      ...formData,
      updatedAt: serverTimestamp(),
    }

    try {
      if (editingUnitId) {
        const docRef = doc(firestore!, "units", editingUnitId)
        await updateDocumentNonBlocking(docRef, updateData)
        toast({ title: "Updated", description: "Unit updated successfully." })
      } else {
        await addDocumentNonBlocking(unitsRef, {
          ...updateData,
          progress: 0,
          createdAt: serverTimestamp(),
        })
        toast({ title: "Created", description: "New unit added successfully." })
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteUnit = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this unit?")) return
    const docRef = doc(firestore, "units", id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Deleted", description: "Unit removed from catalog." })
  }

  // --- PROGRESS LOGIC (unit-centric) ---
  // Build a map: unitId -> list of registration docs
  const regsByUnit = useMemo(() => {
    const map: Record<string, any[]> = {}
    ;(registrations || []).forEach(r => {
      if (!map[r.unitId]) map[r.unitId] = []
      map[r.unitId].push(r)
    })
    return map
  }, [registrations])

  // Build a student lookup map
  const studentMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(students || []).forEach(s => {
      map[s.id] = s
    })
    return map
  }, [students])

  // Map of enrolled student details per unit
  const enrolledStudentsByUnit = useMemo(() => {
    const map: Record<string, { id: string; name: string; email: string }[]> = {}
    if (!registrations) return map
    registrations.forEach(r => {
      const stu = studentMap[r.studentId]
      const name = r.studentName || (stu ? `${stu.firstName || ""} ${stu.lastName || ""}`.trim() : "") || "Unknown Student"
      const email = r.studentEmail || (stu ? stu.contactEmail : "") || ""
      if (!map[r.unitId]) map[r.unitId] = []
      map[r.unitId].push({ id: r.studentId, name, email })
    })
    return map
  }, [registrations, studentMap])

  // Derive original progress from the first registration of each unit
  const originalProgressMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!units) return map
    units.forEach(u => {
      const regs = regsByUnit[u.id] || []
      map[u.id] = regs.length > 0 ? (regs[0].progress ?? 0) : 0
    })
    return map
  }, [units, regsByUnit])

  // Sync draft progress with actual DB values when database loads (only for unedited draft values)
  useEffect(() => {
    if (Object.keys(originalProgressMap).length === 0) return
    setUnitProgressDraft(prev => {
      const next = { ...prev }
      Object.entries(originalProgressMap).forEach(([unitId, prog]) => {
        if (!(unitId in next)) {
          next[unitId] = prog
        }
      })
      return next
    })
  }, [originalProgressMap])

  // Save progress for ALL students in a unit at once
  const handleSaveUnitProgress = async (unit: any) => {
    if (!firestore) return
    const newProgress = unitProgressDraft[unit.id] ?? 0
    const regsForUnit = regsByUnit[unit.id] || []
    if (regsForUnit.length === 0) {
      toast({ title: "No students", description: "No students are registered for this unit.", variant: "destructive" })
      return
    }
    setSavingUnitIds(prev => new Set(prev).add(unit.id))
    try {
      await Promise.all(regsForUnit.map(reg =>
        updateDoc(doc(firestore, "unit_registrations", reg.id), {
          progress: newProgress,
          status: newProgress >= 100 ? "Completed" : newProgress > 0 ? "In Progress" : "Registered",
          updatedAt: serverTimestamp(),
        })
      ))
      toast({ title: "Progress Updated", description: `${unit.name} → ${newProgress}% (${regsForUnit.length} student${regsForUnit.length !== 1 ? 's' : ''} updated)` })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSavingUnitIds(prev => { const s = new Set(prev); s.delete(unit.id); return s })
    }
  }

  // Save all units that have pending unsaved draft changes
  const handleSaveAllProgress = async () => {
    if (!firestore) return
    const dirtyUnitIds = Object.keys(unitProgressDraft).filter(
      uid => unitProgressDraft[uid] !== (originalProgressMap[uid] ?? 0)
    )

    if (dirtyUnitIds.length === 0) return

    setSavingUnitIds(prev => {
      const next = new Set(prev)
      dirtyUnitIds.forEach(id => next.add(id))
      return next
    })

    let successCount = 0
    let failCount = 0

    try {
      await Promise.all(
        dirtyUnitIds.map(async (unitId) => {
          const newProgress = unitProgressDraft[unitId] ?? 0
          const regsForUnit = regsByUnit[unitId] || []
          if (regsForUnit.length === 0) return

          try {
            await Promise.all(
              regsForUnit.map(reg =>
                updateDoc(doc(firestore, "unit_registrations", reg.id), {
                  progress: newProgress,
                  status: newProgress >= 100 ? "Completed" : newProgress > 0 ? "In Progress" : "Registered",
                  updatedAt: serverTimestamp(),
                })
              )
            )
            successCount++
          } catch (err) {
            console.error(`Error saving unit ${unitId}:`, err)
            failCount++
          }
        })
      )

      if (failCount === 0) {
        toast({ title: "All Progress Saved", description: `Successfully updated progress for ${successCount} units.` })
      } else {
        toast({ title: "Saved with Errors", description: `Updated ${successCount} units. Failed for ${failCount} units.`, variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Error Saving", description: e.message, variant: "destructive" })
    } finally {
      setSavingUnitIds(prev => {
        const next = new Set(prev)
        dirtyUnitIds.forEach(id => next.delete(id))
        return next
      })
    }
  }

  // Discard changes for a single unit
  const handleDiscardChanges = (unitId: string) => {
    setUnitProgressDraft(prev => ({
      ...prev,
      [unitId]: originalProgressMap[unitId] ?? 0
    }))
    toast({ title: "Changes Discarded", description: "Progress reset to saved state." })
  }

  // Discard all unsaved changes
  const handleDiscardAllChanges = () => {
    setUnitProgressDraft(prev => {
      const next = { ...prev }
      Object.keys(unitProgressDraft).forEach(uid => {
        next[uid] = originalProgressMap[uid] ?? 0
      })
      return next
    })
    toast({ title: "All Changes Discarded", description: "All unsaved changes have been reset." })
  }

  // Calculate statistics based on current draft state
  const unitProgressStats = useMemo(() => {
    const us = units || []
    if (us.length === 0) return { avg: 0, complete: 0, inProgress: 0, notStarted: 0 }
    const avg = Math.round(us.reduce((s, u) => s + (unitProgressDraft[u.id] ?? 0), 0) / us.length)
    const complete = us.filter(u => (unitProgressDraft[u.id] ?? 0) >= 100).length
    const inProgress = us.filter(u => { const p = unitProgressDraft[u.id] ?? 0; return p > 0 && p < 100 }).length
    const notStarted = us.filter(u => (unitProgressDraft[u.id] ?? 0) === 0).length
    return { avg, complete, inProgress, notStarted }
  }, [units, unitProgressDraft])

  // Filter progress units based on search, course, status, or dirty/draft states
  const filteredProgressUnits = useMemo(() => {
    return (units || []).filter(unit => {
      const draftVal = unitProgressDraft[unit.id] ?? 0
      const origVal = originalProgressMap[unit.id] ?? 0
      const isDirty = draftVal !== origVal

      const matchesSearch = 
        unit.name.toLowerCase().includes(progressSearchTerm.toLowerCase()) ||
        unit.code.toLowerCase().includes(progressSearchTerm.toLowerCase()) ||
        unit.courseName.toLowerCase().includes(progressSearchTerm.toLowerCase())

      const matchesCourse = progressSelectedCourse === "all" || unit.courseName === progressSelectedCourse

      let matchesStatus = true
      if (progressSelectedStatus === "completed") {
        matchesStatus = draftVal >= 100
      } else if (progressSelectedStatus === "in_progress") {
        matchesStatus = draftVal > 0 && draftVal < 100
      } else if (progressSelectedStatus === "not_started") {
        matchesStatus = draftVal === 0
      } else if (progressSelectedStatus === "dirty") {
        matchesStatus = isDirty
      }

      return matchesSearch && matchesCourse && matchesStatus
    })
  }, [units, unitProgressDraft, originalProgressMap, progressSearchTerm, progressSelectedCourse, progressSelectedStatus])

  // --- REGISTRATIONS LOGIC ---
  const studentMap = useMemo(() => {
    const map: Record<string, any> = {}
      ; (students || []).forEach(s => {
        map[s.id] = s
      })
    return map
  }, [students])

  const filteredRegs = useMemo(() => {
    return (registrations || []).filter(reg => {
      const student = studentMap[reg.studentId] || {}
      const studentName = reg.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "N/A"
      const studentEmail = reg.studentEmail || student.contactEmail || "N/A"

      const matchesSearch =
        studentName.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
        reg.unitName?.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
        reg.unitCode?.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(regSearchTerm.toLowerCase())

      const matchesCourse = selectedCourse === "all" || reg.courseName === selectedCourse
      const matchesUnit = selectedUnit === "all" || reg.unitId === selectedUnit

      return matchesSearch && matchesCourse && matchesUnit
    }).map(reg => {
      const student = studentMap[reg.studentId] || {}
      return {
        ...reg,
        resolvedName: reg.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "N/A",
        resolvedEmail: reg.studentEmail || student.contactEmail || "N/A"
      }
    })
  }, [registrations, regSearchTerm, selectedCourse, selectedUnit, studentMap])

  const handleExport = () => {
    const headers = ["Student Name", "Email", "Unit Code", "Unit Name", "Course", "Status", "Date"]
    const rows = filteredRegs.map(reg => [
      reg.resolvedName,
      reg.resolvedEmail,
      reg.unitCode,
      reg.unitName,
      reg.courseName,
      reg.status,
      reg.registeredAt?.seconds ? new Date(reg.registeredAt.seconds * 1000).toLocaleDateString() : ""
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `unit_registrations_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Curriculum Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Manage Units</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure subjects, modules, and track student enrollments.</p>
        </div>

        {activeTab === "catalog" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg h-10 px-6 transition-all">
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] max-h-[85vh] overflow-y-auto border border-slate-200 shadow-lg rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900">{editingUnitId ? "Edit Unit Details" : "Register New Unit"}</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Define a module and associate it with an academic course.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-5 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Unit Code</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="e.g. WD101"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Target Course</Label>
                    <Select value={formData.courseName} onValueChange={(v) => setFormData({ ...formData, courseName: v })}>
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Unit Name</Label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="e.g. Advanced JavaScript"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Assigned Instructor</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="e.g. Mr. Smith"
                        value={formData.instructor}
                        onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                        className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="h-10 border-slate-200 focus:ring-emerald-500 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
                <Button
                  onClick={handleSaveUnit}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
                >
                  {editingUnitId ? "Save Changes" : "Create Unit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {activeTab === "registrations" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} className="h-10 rounded-lg border-slate-200 shadow-sm font-medium text-sm">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 rounded-lg shadow-sm font-medium text-sm">
              <Printer className="mr-2 h-4 w-4" /> Print List
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg h-auto min-h-10 mb-6 inline-flex flex-wrap print:hidden">
          <TabsTrigger value="catalog" className="rounded-md px-6 text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-slate-500">Unit Catalog</TabsTrigger>
          <TabsTrigger value="registrations" className="rounded-md px-6 text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-slate-500">Registrations</TabsTrigger>
          <TabsTrigger value="progress" className="rounded-md px-6 text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-slate-500">Student Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 m-0 border-0 p-0 focus-visible:ring-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by code, name, or course..."
              className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500 max-w-md"
              value={unitSearchTerm}
              onChange={(e) => setUnitSearchTerm(e.target.value)}
            />
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5 w-[140px]">Unit Code</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs w-[300px]">Unit Name</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Associated Course</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Instructor</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[100px]">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-500 h-10 text-xs pr-5 w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUnits ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUnits.length > 0 ? (
                    filteredUnits.map((unit) => (
                      <TableRow key={unit.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                        <TableCell className="py-3 pl-5 font-mono font-bold text-slate-600 text-xs">
                          {unit.code}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-slate-900 text-sm">{unit.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 font-medium text-[11px] px-2 py-0.5 rounded-md truncate max-w-[200px]">
                            {unit.courseName}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <User className="h-3 w-3 text-slate-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{unit.instructor || "Not assigned"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${unit.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {unit.status || 'Active'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 pr-5">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => handleOpenDialog(unit)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" onClick={() => handleDeleteUnit(unit.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-slate-400 text-sm italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <BookOpen className="h-8 w-8 text-slate-200" />
                          <p>No units found matching your search.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="registrations" className="space-y-4 m-0 border-0 p-0 focus-visible:ring-0">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registrations</p>
                  <p className="text-xl font-bold text-slate-900">{filteredRegs.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Units</p>
                  <p className="text-xl font-bold text-slate-900">{units?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Programs Covered</p>
                  <p className="text-xl font-bold text-slate-900">{courses?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-3 print:hidden bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student or unit..."
                className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
                value={regSearchTerm}
                onChange={(e) => setRegSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <SelectValue placeholder="Course" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {(courses || []).map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-56">
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <SelectValue placeholder="Unit" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {(units || [])
                    .filter(u => selectedCourse === "all" || u.courseName === selectedCourse)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.code} - {u.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
            <CardContent className="p-0">
              {/* Print Header */}
              <div className="hidden print:block p-8 border-b border-slate-100">
                <h1 className="text-2xl font-bold text-center">Risabu Technical Training College</h1>
                <h2 className="text-xl font-semibold text-center mt-2">Student Unit Registration Report</h2>
                <div className="mt-4 flex justify-between text-sm text-slate-500">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Total Records: {filteredRegs.length}</span>
                </div>
                {selectedCourse !== 'all' && <p className="mt-1 text-sm font-bold">Course: {selectedCourse}</p>}
                {selectedUnit !== 'all' && <p className="mt-1 text-sm font-bold">Unit: {units?.find(u => u.id === selectedUnit)?.name}</p>}
              </div>

              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Student</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Unit</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs">Course</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center">Status</TableHead>
                    <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right pr-5">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRegs ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRegs.length > 0 ? (
                    filteredRegs.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                        <TableCell className="py-3 pl-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{reg.resolvedName}</span>
                            <span className="text-[10px] font-medium text-slate-500">{reg.resolvedEmail}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                              {reg.unitCode}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">{reg.unitName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="bg-slate-50 text-slate-600 hover:bg-slate-50 border-0 font-medium uppercase text-[9px] px-2 py-0.5 shadow-none rounded-md">
                            {reg.courseName}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="bg-emerald-50 text-emerald-700 font-bold uppercase text-[9px] px-2 py-0.5 rounded-md">
                            {reg.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-5">
                          <span className="text-xs font-medium text-slate-600">
                            {reg.registeredAt?.seconds ? new Date(reg.registeredAt.seconds * 1000).toLocaleDateString() : "Recently"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm italic">
                        No registrations found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROGRESS TAB ────────────────────────────────────── */}
        <TabsContent value="progress" className="space-y-5 m-0 border-0 p-0 focus-visible:ring-0">

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Progress", value: `${unitProgressStats.avg}%`, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Units Complete", value: unitProgressStats.complete, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "In Progress", value: unitProgressStats.inProgress, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Not Started", value: unitProgressStats.notStarted, icon: Users, color: "text-slate-500", bg: "bg-slate-100" },
            ].map((s, i) => (
              <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Activity className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Progress is set <strong>per unit</strong> — all students registered for that unit receive the same update simultaneously. Changes reflect instantly in the Student Portal.
            </p>
          </div>

          {/* Units table */}
          {loadingUnits || loadingRegs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (units || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <BookOpen className="h-8 w-8 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">No units found. Add units in the Unit Catalog tab first.</p>
            </div>
          ) : (
            <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Unit</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs">Course</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[90px]">Students</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs w-[280px]">Progress (all students)</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[70px]">%</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[90px]">Status</TableHead>
                      <TableHead className="font-semibold text-slate-500 h-10 text-xs text-right pr-5 w-[80px]">Save</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(units || []).map(unit => {
                      const current = unitProgressDraft[unit.id] ?? 0
                      const isSaving = savingUnitIds.has(unit.id)
                      const enrolled = (regsByUnit[unit.id] || []).length
                      const isComplete = current >= 100
                      const isInProgress = current > 0 && current < 100
                      return (
                        <TableRow key={unit.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                          <TableCell className="py-4 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                <BookOpen className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{unit.name}</p>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{unit.code}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 text-[11px] font-medium">
                              {unit.courseName}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-base font-bold text-slate-800">{enrolled}</span>
                              <span className="text-[10px] text-slate-400">enrolled</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Slider
                              value={[current]}
                              min={0} max={100} step={5}
                              onValueChange={([v]) => setUnitProgressDraft(p => ({ ...p, [unit.id]: v }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[9px] text-slate-300 mt-1 px-0.5">
                              {[0, 25, 50, 75, 100].map(m => (
                                <span key={m} className={current >= m ? "text-emerald-400 font-semibold" : ""}>{m}%</span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <input
                              type="number" min={0} max={100} value={current}
                              onChange={e => {
                                const v = Math.min(100, Math.max(0, Number(e.target.value)))
                                setUnitProgressDraft(p => ({ ...p, [unit.id]: v }))
                              }}
                              className="w-14 h-8 text-center text-sm font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
                            />
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isComplete ? "bg-emerald-100 text-emerald-700" :
                                isInProgress ? "bg-amber-100 text-amber-700" :
                                  "bg-slate-100 text-slate-500"
                              }`}>
                              {isComplete ? "Complete" : isInProgress ? "In Progress" : "Not Started"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-right pr-5">
                            <Button
                              size="sm"
                              onClick={() => handleSaveUnitProgress(unit)}
                              disabled={isSaving || enrolled === 0}
                              title={enrolled === 0 ? "No students enrolled" : `Update ${enrolled} student(s)`}
                              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-40"
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
