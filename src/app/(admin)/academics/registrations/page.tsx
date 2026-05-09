"use client"

import { useState, useMemo, useRef } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Download, Printer, Loader2, Users, BookOpen, GraduationCap, FileText } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"

export default function UnitRegistrationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedUnit, setSelectedUnit] = useState("all")
  
  const firestore = useFirestore()
  const { user } = useUser()

  // 1. Fetch Registrations
  const regsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "unit_registrations"), orderBy("registeredAt", "desc")) : null, [firestore, user])
  const { data: registrations, isLoading: loadingRegs } = useCollection(regsRef)

  // 1.1 Fetch Students to resolve names for old records
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  const { data: students } = useCollection(studentsRef)

  const studentMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(students || []).forEach(s => {
      map[s.id] = s
    })
    return map
  }, [students])

  // 2. Fetch Programs for filter

  const coursesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  const { data: courses } = useCollection(coursesRef)

  // 3. Fetch Units for filter
  const unitsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "units") : null, [firestore, user])
  const { data: units } = useCollection(unitsRef)

  // 4. Filtering Logic
  const filteredRegs = useMemo(() => {
    return (registrations || []).filter(reg => {
      const student = studentMap[reg.studentId] || {}
      const studentName = reg.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "N/A"
      const studentEmail = reg.studentEmail || student.contactEmail || "N/A"

      const matchesSearch = 
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
      
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
  }, [registrations, searchTerm, selectedCourse, selectedUnit, studentMap])


  // 5. Export Logic
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

  // 6. Print Logic
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header - Hidden on print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Unit Registrations</h1>
          <p className="text-slate-500 font-medium">Monitor student enrollment across all academic units</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="h-11 rounded-xl border-slate-200 shadow-sm font-bold">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 rounded-xl shadow-lg font-bold">
            <Printer className="mr-2 h-4 w-4" /> Print List
          </Button>
        </div>
      </div>

      {/* Stats Cards - Hidden on print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registrations</p>
              <p className="text-2xl font-black text-slate-900">{filteredRegs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Units</p>
              <p className="text-2xl font-black text-slate-900">{units?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programs Covered</p>
              <p className="text-2xl font-black text-slate-900">{courses?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Hidden on print */}
      <div className="flex flex-col md:flex-row gap-4 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search student, unit name or code..." 
            className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filter by Course" />
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
        <div className="w-full md:w-64">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filter by Unit" />
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

      {/* Table Section */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-2xl bg-white">
        <CardContent className="p-0">
          {/* Print Header - Visible only on print */}
          <div className="hidden print:block p-8 border-b-2 border-slate-100">
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
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider pl-6">Student</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Unit</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Course</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-right pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRegs ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredRegs.length > 0 ? (
                filteredRegs.map((reg) => (
                  <TableRow key={reg.id} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                    <TableCell className="py-4 pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{reg.resolvedName}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">{reg.resolvedEmail}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          {reg.unitCode}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{reg.unitName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold uppercase text-[9px] px-2 py-0.5">
                        {reg.courseName}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold uppercase text-[9px] px-2 py-0.5 shadow-none">
                        {reg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <span className="text-xs font-bold text-slate-500">
                        {reg.registeredAt?.seconds ? new Date(reg.registeredAt.seconds * 1000).toLocaleDateString() : "Recently"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">
                    No registrations found matching your filters.
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
