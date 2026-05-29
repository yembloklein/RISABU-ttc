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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookOpen, Plus, Search, Edit2, Trash2, Loader2, Code, User, Hash, Filter, Download, Printer, Users, GraduationCap } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy, limit } from "firebase/firestore"
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

    const data = {
      ...formData,
      progress: editingUnitId ? undefined : 0, 
      updatedAt: serverTimestamp(),
    }

    try {
      if (editingUnitId) {
        const docRef = doc(firestore!, "units", editingUnitId)
        await updateDocumentNonBlocking(docRef, data)
        toast({ title: "Updated", description: "Unit updated successfully." })
      } else {
        await addDocumentNonBlocking(unitsRef, {
          ...data,
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

  // --- REGISTRATIONS LOGIC ---
  const studentMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(students || []).forEach(s => {
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
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Target Course</Label>
                    <Select value={formData.courseName} onValueChange={(v) => setFormData({...formData, courseName: v})}>
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
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                        className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
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
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            unit.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
      </Tabs>
    </div>
  )
}
