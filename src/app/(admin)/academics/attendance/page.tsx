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
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, CalendarCheck, Download, Printer } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminAttendancePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const firestore = useFirestore()
  const { user } = useUser()

  const attendanceRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "attendance"), orderBy("timestamp", "desc")) : null, [firestore, user])
  
  const { data: attendanceLogs, isLoading } = useCollection(attendanceRef)

  const filteredLogs = useMemo(() => {
    return (attendanceLogs || []).filter(log => {
      const matchesSearch = 
        log.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.unitName?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || log.status?.toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [attendanceLogs, searchTerm, statusFilter])

  const handleExport = () => {
    const headers = ["Date", "Time", "Student Name", "Email", "Unit Code", "Unit Name", "Course", "Status"]
    const rows = filteredLogs.map(log => [
      log.date ? (typeof log.date === 'string' ? new Date(log.date).toLocaleDateString() : (log.date.seconds ? new Date(log.date.seconds * 1000).toLocaleDateString() : "")) : "",
      log.time || "",
      log.studentName || "",
      log.studentEmail || "",
      log.unitCode || "",
      log.unitName || "",
      log.courseName || "",
      log.status || ""
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `attendance_logs_${new Date().toISOString().split('T')[0]}.csv`)
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
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Academics</p>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor student attendance logs across all active units.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="h-10 rounded-lg border-slate-200 shadow-sm font-medium text-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 rounded-lg shadow-sm font-medium text-sm">
            <Printer className="mr-2 h-4 w-4" /> Print List
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 print:hidden bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search student name, email, or unit..." 
            className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-56">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Present">Present</SelectItem>
              <SelectItem value="Absent">Absent</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <CardContent className="p-0">
          <div className="hidden print:block p-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-center">Risabu Technical Training College</h1>
            <h2 className="text-xl font-semibold text-center mt-2">Daily Attendance Report</h2>
            <div className="mt-4 flex justify-between text-sm text-slate-500">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Total Logs: {filteredLogs.length}</span>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5 w-[140px]">Date / Time</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs w-[300px]">Student</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Unit</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs text-center w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-5 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {log.date ? (typeof log.date === 'string' ? new Date(log.date).toLocaleDateString() : (log.date.seconds ? new Date(log.date.seconds * 1000).toLocaleDateString() : "N/A")) : "N/A"}<br/>
                      <span className="text-[10px] text-slate-400">{log.time || "N/A"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs uppercase">
                          {log.studentName?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{log.studentName || "Unknown Student"}</span>
                          <span className="text-[10px] font-medium text-slate-500">{log.studentEmail || "No Email"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold font-mono text-slate-700 text-[10px]">{log.unitCode || "N/A"}</span>
                        <span className="text-xs font-semibold text-slate-800">{log.unitName || "Unknown Unit"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge variant="outline" className={`font-bold text-[10px] uppercase shadow-none border-0 ${
                        log.status === "Present" ? "bg-emerald-50 text-emerald-700" : 
                        log.status === "Late" ? "bg-amber-50 text-amber-700" : 
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {log.status || "Unknown"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-slate-400 text-sm italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarCheck className="h-8 w-8 text-slate-200" />
                      <p>No attendance logs found matching your filters.</p>
                    </div>
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
