"use client"
import { useMemo } from "react"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ClipboardList, Trophy, TrendingUp, Download, Info, Search, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export default function GradesPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  // Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // 2. Fetch Grades Data (Real-time)
  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "grades"), where("studentId", "==", student.id))
  }, [firestore, student])
  
  const { data: grades, isLoading: isGradesLoading } = useCollection(gradesQuery)

  const gpa = useMemo(() => {
    if (!grades || grades.length === 0) return 0
    const totalPoints = grades.reduce((acc, g) => {
      const grade = g.grade || "F"
      const points: Record<string, number> = { "A": 4, "B+": 3.5, "B": 3, "C+": 2.5, "C": 2, "D": 1, "F": 0 }
      return acc + (points[grade] || 0)
    }, 0)
    return parseFloat((totalPoints / grades.length).toFixed(2))
  }, [grades])

  if (isStudentLoading || isGradesLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grades</h1>
          <p className="text-slate-500 font-medium mt-1">Review your academic performance and exam results.</p>
        </div>
        <Button size="sm" variant="outline" className="font-semibold">
          <Download className="h-4 w-4 mr-2" /> Download Transcript
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Cumulative GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{gpa}</div>
            <p className="text-xs font-semibold text-emerald-600 mt-1">Distinction</p>
          </CardContent>
        </Card>
        
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Units Attempted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">12</div>
            <p className="text-xs font-medium text-slate-500 mt-1">Across 3 semesters</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Academic Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">Good Standing</div>
            <p className="text-xs font-medium text-slate-500 mt-1">Active Enrollment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-4 px-6">
          <CardTitle className="text-base font-bold text-slate-900">Examination Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 pl-6">Code</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10">Unit Name</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 text-center">CAT</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 text-center">Exam</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 text-center">Total</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500 h-10 pr-6">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades && grades.length > 0 ? (
                grades.map((res) => (
                  <TableRow key={res.code} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {res.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{res.name}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">{res.semester}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-slate-600">{res.cat}</TableCell>
                    <TableCell className="text-center text-sm font-medium text-slate-600">{res.exam}</TableCell>
                    <TableCell className="text-center text-sm font-bold text-slate-900">{(Number(res.cat) || 0) + (Number(res.exam) || 0)}</TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <Badge variant="outline" className={`font-bold text-xs ${
                        res.grade === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}>
                        {res.grade}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500 italic">
                    No examination results recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="p-4 bg-slate-50/50 border-t flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Official transcripts are available from the Registrar's Office.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
