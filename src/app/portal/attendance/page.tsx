"use client"
import { useMemo } from "react"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarCheck, Users, Clock, AlertCircle, Info, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

export default function AttendancePage() {
  const { user } = useUser()
  const firestore = useFirestore()

  // Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // 2. Fetch Attendance Data (Real-time)
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "attendance"), where("studentId", "==", student.id))
  }, [firestore, student])
  
  const { data: attendance, isLoading: isAttendanceLoading } = useCollection(attendanceQuery)

  const stats = useMemo(() => {
    if (!attendance || attendance.length === 0) return { total: 0, attended: 0, missed: 0, percentage: 0 }
    
    const total = attendance.length
    const attended = attendance.filter(a => a.status === "Present").length
    const missed = total - attended
    const percentage = Math.round((attended / total) * 100)

    return { total, attended, missed, percentage }
  }, [attendance])

  if (isStudentLoading || isAttendanceLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-slate-500 font-medium mt-1">Track your class presence and attendance history.</p>
        </div>
        <Badge variant="outline" className={`h-8 px-3 font-bold ${stats.percentage >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
          {stats.percentage}% Overall Rate
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-xs font-medium text-slate-500 mt-1">This Semester</p>
          </CardContent>
        </Card>
        
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Attended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.attended}</div>
            <p className="text-xs font-medium text-emerald-600 mt-1">Present in class</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Missed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.missed}</div>
            <p className="text-xs font-medium text-rose-600 mt-1">Absent from class</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm rounded-xl p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-400">Attendance Progress</h3>
            <span className="text-sm font-bold text-slate-900">{stats.percentage}%</span>
          </div>
          <Progress value={stats.percentage} className="h-2 bg-slate-100" />
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
            Minimum requirement for exams is <span className="font-bold text-slate-900">75%</span>. 
            Currently you are <span className={stats.percentage >= 75 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {stats.percentage >= 75 ? "on track" : "below requirement"}
            </span>.
          </p>
        </div>
      </Card>

      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-4 px-6">
          <CardTitle className="text-base font-bold text-slate-900">Daily Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 pl-6">Date</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10">Unit</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10">Slot</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500 h-10 pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance && attendance.length > 0 ? (
                attendance.map((log, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="pl-6 py-4 text-sm font-medium text-slate-600">
                      {log.date ? new Date(log.date).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="py-4 text-sm font-semibold text-slate-900">
                      {log.unit || log.unitCode}
                    </TableCell>
                    <TableCell className="py-4 text-xs font-medium text-slate-500">
                      {log.time || "N/A"}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <Badge variant="outline" className={`font-bold text-[10px] uppercase ${
                        log.status === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-slate-500 italic">
                    No attendance logs found.
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
