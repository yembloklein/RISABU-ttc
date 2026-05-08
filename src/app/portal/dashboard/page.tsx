"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, Wallet, GraduationCap, Calendar, Activity, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"

export default function StudentDashboard() {
  const { user } = useUser()
  const firestore = useFirestore()

  // 1. Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // 2. Fetch Program Data (for fees)
  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  
  const { data: programsData } = useCollection(programQuery)
  const program = programsData?.[0]

  // 3. Fetch Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: paymentsRaw, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)
  
  // 4. Fetch Invoices
  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "invoices"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: invoicesRaw } = useCollection(invoicesQuery)
  const ledger = useMemo(() => {
    const combined: any[] = []
    if (paymentsRaw) paymentsRaw.forEach(p => combined.push({ ...p, ledgerType: 'payment', sortDate: p.paymentDate ? new Date(p.paymentDate).getTime() : (p.createdAt?.toMillis?.() || Date.now()) }))
    if (invoicesRaw) invoicesRaw.forEach(i => combined.push({ ...i, ledgerType: 'invoice', sortDate: i.invoiceDate ? new Date(i.invoiceDate).getTime() : (i.createdAt?.toMillis?.() || Date.now()) }))
    return combined.sort((a, b) => b.sortDate - a.sortDate)
  }, [paymentsRaw, invoicesRaw])

  // 4. Fetch Grades (Real-time)
  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "grades"), where("studentId", "==", student.id))
  }, [firestore, student])
  
  const { data: grades } = useCollection(gradesQuery)

  const gpa = useMemo(() => {
    if (!grades || grades.length === 0) return 0
    const totalPoints = grades.reduce((acc, g) => {
      const grade = g.grade || "F"
      const points: Record<string, number> = { "A": 4, "B+": 3.5, "B": 3, "C+": 2.5, "C": 2, "D": 1, "F": 0 }
      return acc + (points[grade] || 0)
    }, 0)
    return parseFloat((totalPoints / grades.length).toFixed(2))
  }, [grades])

  // 5. Fetch Attendance (Real-time)
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "attendance"), where("studentId", "==", student.id))
  }, [firestore, student])
  
  const { data: attendance } = useCollection(attendanceQuery)

  const attendanceRate = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0
    const attended = attendance.filter(a => a.status === "Present").length
    return Math.round((attended / attendance.length) * 100)
  }, [attendance])

  const feeStats = useMemo(() => {
    const billed = (invoicesRaw || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    const paid = (paymentsRaw || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, billed - paid)
    const percentage = billed > 0 ? Math.min(100, Math.round((paid / billed) * 100)) : 0

    return { billed, paid, balance, percentage }
  }, [invoicesRaw, paymentsRaw])

  if (isStudentLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  if (!student) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Simple Welcome Banner */}
      <div className="bg-white border rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-semibold px-3">
              Active Student
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome, {student.firstName}
            </h1>
            <p className="text-slate-500 font-medium max-w-lg">
              Check your academic progress and financial status below.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Program</p>
              <p className="text-sm font-semibold text-slate-900">{student.appliedCourse || "General Admission"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial Overview */}
        <Card className="md:col-span-2 border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                Financial Overview
              </CardTitle>
              <Badge variant="outline" className="bg-white font-bold">
                {feeStats.percentage}% Paid
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Total Billed</p>
                  <p className="text-xl font-bold text-slate-900">KES {feeStats.billed.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Total Paid</p>
                  <p className="text-xl font-bold text-emerald-600">KES {feeStats.paid.toLocaleString()}</p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-xs font-semibold text-slate-500">Balance</p>
                  <p className="text-xl font-bold text-rose-600">KES {feeStats.balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Fee Payment Progress</span>
                  <span>{feeStats.percentage}%</span>
                </div>
                <Progress value={feeStats.percentage} className="h-2 bg-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Details */}
        <Card className="border shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-wider">Academic Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-50">
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Current GPA</p>
                <p className="text-2xl font-bold text-slate-900">{gpa || "0.00"}</p>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Attendance</p>
                <p className={`text-2xl font-bold ${attendanceRate >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                  {attendanceRate}%
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Admission No</p>
                <p className="text-sm font-semibold text-slate-900">{student.admissionNumber || "Pending"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Admission Date</p>
                <p className="text-sm font-semibold text-slate-900">{student.admissionDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <Activity className="h-4 w-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <Badge variant="outline" className="text-[10px] font-bold border-slate-200 mt-1 uppercase">
                  {student.status || student.admissionStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-slate-500 h-10 pl-6 text-xs uppercase">Reference</TableHead>
                <TableHead className="font-bold text-slate-500 h-10 text-xs uppercase">Description</TableHead>
                <TableHead className="font-bold text-slate-500 h-10 text-xs uppercase">Amount</TableHead>
                <TableHead className="text-right font-bold text-slate-500 h-10 pr-6 text-xs uppercase">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPaymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Loading...</TableCell>
                </TableRow>
              ) : ledger && ledger.length > 0 ? (
                ledger.slice(0, 5).map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.transactionReference || item.invoiceNumber || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{item.description || (item.ledgerType === 'invoice' ? "Tuition Fee" : "Fee Payment")}</span>
                        <Badge variant="secondary" className={`w-fit text-[8px] h-3.5 px-1 font-bold uppercase mt-1 ${item.ledgerType === 'invoice' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {item.ledgerType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`text-sm font-bold ${item.ledgerType === 'invoice' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.ledgerType === 'invoice' ? '-' : '+'} KES {Number(item.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4 text-xs font-medium text-slate-500">
                      {item.date || item.paymentDate || item.invoiceDate ? formatDistanceToNow(new Date(item.date || item.paymentDate || item.invoiceDate), { addSuffix: true }) : "Recently"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500 text-sm">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
