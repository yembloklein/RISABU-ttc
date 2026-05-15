"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  BookOpen, Wallet, Calendar, Activity, Loader2, Download,
  GraduationCap, TrendingUp, Clock, CreditCard, CheckCircle2,
  AlertCircle, ArrowRight, Hash
} from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { AdmissionLetter } from "@/components/admission-letter"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export default function StudentDashboard() {
  const { user } = useUser()
  const firestore = useFirestore()

  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  const { data: programsData } = useCollection(programQuery)
  const program = programsData?.[0]

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: paymentsRaw, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)

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

  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "grades"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: grades } = useCollection(gradesQuery)

  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "student_documents"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: documents } = useCollection(docsQuery)

  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])
  const { data: schoolDocs } = useCollection(schoolDocsQuery)

  const customAdmissionLetter = useMemo(() => documents?.find(d => d.category === "admission_letter"), [documents])
  const officialAdmissionLetter = useMemo(() => schoolDocs?.find(d => d.type === "official_admission_letter"), [schoolDocs])
  const studentSpecificOfficialLetter = useMemo(() => documents?.find(d => d.category === "admission_letter" && d.isOfficial === true), [documents])

  const gpa = useMemo(() => {
    if (!grades || grades.length === 0) return null
    const points: Record<string, number> = { "A": 4, "B+": 3.5, "B": 3, "C+": 2.5, "C": 2, "D": 1, "F": 0 }
    return parseFloat((grades.reduce((acc, g) => acc + (points[g.grade || "F"] || 0), 0) / grades.length).toFixed(2))
  }, [grades])

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "attendance"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: attendance } = useCollection(attendanceQuery)

  const attendanceRate = useMemo(() => {
    if (!attendance || attendance.length === 0) return null
    return Math.round((attendance.filter(a => a.status === "Present").length / attendance.length) * 100)
  }, [attendance])

  const feeStats = useMemo(() => {
    const billed = program ? Number(program.tuitionFee) : 0
    const paid = (paymentsRaw || []).filter(p => p.type === "Fee").reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, billed - paid)
    const percentage = billed > 0 ? Math.min(100, Math.round((paid / billed) * 100)) : 0
    return { billed, paid, balance, percentage }
  }, [program, paymentsRaw])

  const letterRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadLetter = async () => {
    if (!letterRef.current) return
    setIsGenerating(true)
    try {
      const canvas = await html2canvas(letterRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgWidth = 210
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
      pdf.save(`Admission_Letter_${student.firstName}_${student.lastName}.pdf`)
      toast({ title: "Downloaded", description: "Your admission letter has been saved." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate admission letter.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  if (isStudentLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your dashboard...</p>
      </div>
    )
  }

  if (!student) return null

  const letterUrl = studentSpecificOfficialLetter?.downloadURL || officialAdmissionLetter?.downloadURL || customAdmissionLetter?.downloadURL

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Student Portal</p>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {student.firstName} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">{student.appliedCourse || "General Admission"} · {student.admissionNumber || "ADM Pending"}</p>
        </div>

        {(student.admissionStatus === "Enrolled" || student.admissionNumber) && (
          letterUrl ? (
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm shrink-0">
              <a href={letterUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download Admission Letter
              </a>
            </Button>
          ) : (
            <Button onClick={handleDownloadLetter} disabled={isGenerating} variant="outline" className="h-9 text-sm shrink-0 border-slate-200">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download Admission Letter
            </Button>
          )
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Fee Paid",
            value: `${feeStats.percentage}%`,
            sub: `KES ${feeStats.paid.toLocaleString()} of ${feeStats.billed.toLocaleString()}`,
            icon: CreditCard,
            color: "text-emerald-600", bg: "bg-emerald-50",
            bar: true, barVal: feeStats.percentage, barColor: feeStats.percentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400'
          },
          {
            label: "Balance Due",
            value: `KES ${feeStats.balance.toLocaleString()}`,
            sub: feeStats.balance <= 0 ? "Fully cleared" : "Outstanding",
            icon: Wallet,
            color: feeStats.balance <= 0 ? "text-emerald-600" : "text-rose-600",
            bg: feeStats.balance <= 0 ? "bg-emerald-50" : "bg-rose-50",
          },
          {
            label: "GPA",
            value: gpa !== null ? gpa.toFixed(2) : "—",
            sub: grades?.length ? `Based on ${grades.length} grade(s)` : "No grades yet",
            icon: TrendingUp,
            color: "text-blue-600", bg: "bg-blue-50"
          },
          {
            label: "Attendance",
            value: attendanceRate !== null ? `${attendanceRate}%` : "—",
            sub: attendanceRate !== null ? (attendanceRate >= 75 ? "Good standing" : "Below threshold") : "No records yet",
            icon: Clock,
            color: attendanceRate !== null && attendanceRate < 75 ? "text-rose-600" : "text-indigo-600",
            bg: attendanceRate !== null && attendanceRate < 75 ? "bg-rose-50" : "bg-indigo-50"
          },
        ].map((s, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xs text-slate-400 text-right leading-tight">{s.label}</p>
              </div>
              <p className={`text-xl font-bold leading-tight ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              {s.bar && (
                <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${s.barColor}`} style={{ width: `${s.barVal}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" /> Recent Transactions
              </h2>
              <Link href="/portal/finance" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {isPaymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                </div>
              ) : ledger.length > 0 ? (
                ledger.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.ledgerType === 'payment' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {item.ledgerType === 'payment'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <AlertCircle className="h-4 w-4 text-rose-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.description || (item.ledgerType === 'invoice' ? "Tuition Invoice" : "Fee Payment")}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {item.transactionReference || item.invoiceNumber || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${item.ledgerType === 'payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.ledgerType === 'payment' ? '+' : '-'} KES {Number(item.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.paymentDate || item.invoiceDate
                          ? formatDistanceToNow(new Date(item.paymentDate || item.invoiceDate), { addSuffix: true })
                          : "Recently"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-7 w-7 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">No transactions yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Student Info sidebar */}
        <div className="space-y-4">
          {/* Profile card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                  {student.firstName?.[0]}{student.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{student.firstName} {student.lastName}</p>
                  <p className="text-xs text-slate-400 truncate">{student.contactEmail}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { icon: Hash, label: "Admission No", value: student.admissionNumber || "Pending" },
                  { icon: BookOpen, label: "Programme", value: student.appliedCourse || "General" },
                  { icon: Calendar, label: "Joined", value: student.admissionDate || "—" },
                  { icon: Activity, label: "Status", value: student.status || student.admissionStatus || "Active" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                      <row.icon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{row.label}</p>
                      <p className="text-xs font-semibold text-slate-800 truncate">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-slate-500 px-1 mb-2">Quick Access</p>
              <div className="space-y-1">
                {[
                  { label: "My Academics", href: "/portal/academics", icon: GraduationCap },
                  { label: "Fee Statement", href: "/portal/finance", icon: Wallet },
                  { label: "My Grades", href: "/portal/grades", icon: TrendingUp },
                  { label: "Attendance", href: "/portal/attendance", icon: Clock },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors group"
                  >
                    <link.icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
                    <span className="text-xs font-medium">{link.label}</span>
                    <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden Admission Letter for PDF Capture */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <AdmissionLetter
          ref={letterRef}
          student={student}
          program={program}
          templateImageUrl={letterUrl}
        />
      </div>
    </div>
  )
}
