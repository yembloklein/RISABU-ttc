"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Users,
  Wallet,
  Activity,
  CreditCard,
  Target,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BookOpen,
  UserPlus,
  BarChart3,
  CheckCircle2,
  Clock,
  GraduationCap,
  Receipt,
  ArrowUpRight,
  LayoutDashboard,
  ChevronRight,
  Zap,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit, doc, getDoc } from "firebase/firestore"
import { formatDistanceToNow, format } from "date-fns"

function useGreeting() {
  const [greeting, setGreeting] = useState("")
  const [dateStr, setDateStr] = useState("")

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 17) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")
    setDateStr(format(now, "EEEE, d MMMM yyyy"))
  }, [])

  return { greeting, dateStr }
}

export default function Dashboard() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { greeting, dateStr } = useGreeting()
  const [isStaff, setIsStaff] = useState(false)
  const checkedRef = useRef(false)

  // Gate the `users` list query behind a role check to prevent permission
  // errors when a student is temporarily in the admin layout during redirect.
  useEffect(() => {
    if (!user || !firestore || checkedRef.current) return
    checkedRef.current = true
    const verify = async () => {
      const adminSnap = await getDoc(doc(firestore, "roles_admin", user.uid)).catch(() => null)
      if (adminSnap?.exists()) { setIsStaff(true); return }
      const staffSnap = await getDoc(doc(firestore, "roles_staff", user.uid)).catch(() => null)
      if (staffSnap?.exists()) setIsStaff(true)
    }
    verify()
  }, [user, firestore])

  const studentsRef = useMemoFirebase(() => (firestore && user && isStaff) ? collection(firestore, "students") : null, [firestore, user, isStaff])
  const programsRef = useMemoFirebase(() => (firestore && user && isStaff) ? collection(firestore, "programs") : null, [firestore, user, isStaff])
  const paymentsRef = useMemoFirebase(() => (firestore && user && isStaff) ? collection(firestore, "payments") : null, [firestore, user, isStaff])
  const staffRef = useMemoFirebase(() => (firestore && user && isStaff) ? collection(firestore, "users") : null, [firestore, user, isStaff])

  const recentPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isStaff) return null
    return query(collection(firestore, "payments"), orderBy("createdAt", "desc"), limit(5))
  }, [firestore, user, isStaff])

  const { data: students, isLoading: loadingStudents } = useCollection(studentsRef)
  const { data: programs, isLoading: loadingPrograms } = useCollection(programsRef)
  const { data: allPayments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: staff } = useCollection(staffRef)
  const { data: recentPayments } = useCollection(recentPaymentsQuery)

  const stats = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled")
    const pending = (students || []).filter(s => s.admissionStatus === "Pending")

    let totalExpected = 0
    let totalTuitionPaid = 0
    enrolled.forEach(s => {
      const prog = (programs || []).find(p => p.name === s.appliedCourse)
      if (prog) totalExpected += Number(prog.tuitionFee) || 0
      const tPaid = (allPayments || []).filter(p => p.studentId === s.id && p.type === "Fee").reduce((acc, p) => acc + Number(p.amount), 0)
      totalTuitionPaid += tPaid
    })

    const totalCollected = (allPayments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const totalArrears = Math.max(0, totalExpected - totalTuitionPaid)
    const collectionRate = totalExpected > 0 ? Math.round((totalTuitionPaid / totalExpected) * 100) : 0

    return {
      totalStudents: enrolled.length,
      pendingAdmissions: pending.length,
      totalExpected,
      totalCollected,
      totalArrears,
      collectionRate,
      totalPrograms: (programs || []).length,
      totalStaff: (staff || []).length,
    }
  }, [students, programs, allPayments, staff])

  const enrollmentDistribution = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled")
    const groups: Record<string, number> = {}
    enrolled.forEach(s => {
      const course = s.appliedCourse || "General"
      groups[course] = (groups[course] || 0) + 1
    })
    const total = enrolled.length || 1
    return Object.entries(groups)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [students])

  const isLoading = loadingStudents || loadingPrograms || loadingPayments

  const kpis = [
    {
      label: "Active Scholars",
      value: stats.totalStudents.toLocaleString(),
      icon: GraduationCap,
      color: "emerald",
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ringColor: "ring-emerald-100",
      trend: null,
      sub: `${stats.pendingAdmissions} pending admissions`,
    },
    {
      label: "Expected Revenue",
      value: `KES ${stats.totalExpected.toLocaleString()}`,
      icon: Activity,
      color: "emerald",
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ringColor: "ring-emerald-100",
      trend: null,
      sub: `Across ${stats.totalPrograms} programs`,
    },
    {
      label: "Collected Revenue",
      value: `KES ${stats.totalCollected.toLocaleString()}`,
      icon: Wallet,
      color: "emerald",
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ringColor: "ring-emerald-100",
      trend: { value: stats.collectionRate, up: true, label: "collection rate" },
      sub: `${stats.collectionRate}% collection rate`,
    },
    {
      label: "Fee Arrears",
      value: `KES ${stats.totalArrears.toLocaleString()}`,
      icon: AlertCircle,
      color: "rose",
      accent: "bg-rose-500",
      bg: "bg-rose-50",
      iconColor: "text-rose-600",
      ringColor: "ring-rose-100",
      trend: null,
      sub: stats.totalArrears === 0 ? "All fees cleared! 🎉" : "Outstanding balance",
    },
  ]

  const quickLinks = [
    { label: "Admissions", icon: UserPlus, href: "/admissions" },
    { label: "Payments", icon: CreditCard, href: "/finance/fees" },
    { label: "Staff", icon: ShieldCheck, href: "/staff" },
    { label: "Courses", icon: BookOpen, href: "/courses" },
    { label: "Students", icon: Users, href: "/students" },
  ]

  const progressColor = (pct: number) => {
    if (pct >= 70) return "[&>div]:bg-emerald-500"
    if (pct >= 40) return "[&>div]:bg-amber-500"
    return "[&>div]:bg-rose-500"
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            {greeting}, {user?.displayName?.split(" ")[0] || "Admin"} <span className="text-2xl sm:text-3xl origin-bottom-right animate-pulse">👋</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm sm:text-base">
            Here is your executive overview of Risabu TTC for <span className="text-slate-700 font-bold">{dateStr}</span>.
          </p>
        </div>

      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="border-0 shadow-sm ring-1 ring-slate-200/60 bg-white overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl"
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 ${kpi.bg} ${kpi.iconColor} rounded-lg flex items-center justify-center`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-500">{kpi.label}</p>
                </div>
              </div>

              <div>
                {isLoading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md mt-1" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    {kpi.value.toString().startsWith('KES') ? (
                      <>
                        <span className="text-sm font-semibold text-slate-400">KES</span>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value.toString().replace('KES ', '')}</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto">
                {kpi.trend && (
                  <div className={`flex items-center gap-1 text-[11px] font-bold ${kpi.trend.up ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"} px-1.5 py-0.5 rounded-md`}>
                    {kpi.trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {kpi.trend.value}%
                  </div>
                )}
                <p className="text-[11px] text-slate-400 font-medium truncate">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Transactions */}
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-200/80 bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Recent Transactions</CardTitle>
                <CardDescription className="font-medium mt-0.5 text-xs">Latest fee collections logged in the system</CardDescription>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-white font-bold h-9 px-4 rounded-full text-xs" asChild>
                <Link href="/finance/fees">View All <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 h-11 pl-5 text-[11px] uppercase tracking-wider">Student</TableHead>
                  <TableHead className="font-bold text-slate-400 h-11 text-[11px] uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell font-bold text-slate-400 h-11 text-[11px] uppercase tracking-wider">Method</TableHead>
                  <TableHead className="hidden md:table-cell text-right font-bold text-slate-400 h-11 pr-5 text-[11px] uppercase tracking-wider">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments && recentPayments.length > 0 ? (
                  recentPayments.map((payment) => {
                    const student = students?.find(s => s.id === payment.studentId)
                    const studentName = student
                      ? `${student.firstName} ${student.lastName}`
                      : payment.studentId?.substring(0, 8) ?? "—"

                    return (
                      <TableRow key={payment.id} className="hover:bg-slate-50/60 transition-colors border-slate-100">
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                              {studentName[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-sm">{studentName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{payment.transactionReference || "—"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="font-black text-emerald-600">KES {Number(payment.amount).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-3.5">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase rounded-full px-2.5">
                            {payment.paymentMethod || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right pr-5 py-3.5">
                          <span className="text-xs text-slate-400 font-medium">
                            {payment.paymentDate
                              ? formatDistanceToNow(new Date(payment.paymentDate), { addSuffix: true })
                              : "Recently"}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">No recent transactions</p>
                        <Button asChild size="sm" variant="outline" className="rounded-full text-xs border-slate-200">
                          <Link href="/finance/fees">Log a Payment</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-5">

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/60 bg-white rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Zap className="h-4 w-4 text-emerald-500" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">Fast access to core operations</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-5 px-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {quickLinks.map((ql) => (
                  <Link
                    key={ql.label}
                    href={ql.href}
                    className="group flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100/50"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                      <ql.icon className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-emerald-700 tracking-wide">{ql.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Program Distribution */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/80 bg-white flex-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Program Distribution
                </CardTitle>
                <Link href="/students" className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 transition-colors">
                  Details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <CardDescription className="font-medium text-xs">Active scholars by course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-3 w-3/4 bg-slate-100 animate-pulse rounded" />
                      <div className="h-2 w-full bg-slate-100 animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              ) : enrollmentDistribution.length > 0 ? (
                enrollmentDistribution.map((item, i) => {
                  const colors = [
                    "bg-emerald-500",
                    "bg-emerald-400",
                    "bg-emerald-600",
                    "bg-emerald-300",
                    "bg-emerald-700",
                  ]
                  return (
                    <div key={item.name} className="space-y-1.5 group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]" title={item.name}>{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400">{item.count} scholars</span>
                          <span className="text-[10px] font-black text-slate-500">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-10 flex flex-col items-center justify-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Users className="h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No Program Data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: (students || []).length, icon: Users, color: "text-emerald-600 bg-emerald-50" },
          { label: "Active Programs", value: stats.totalPrograms, icon: BookOpen, color: "text-emerald-600 bg-emerald-50" },
          { label: "Pending Admissions", value: stats.pendingAdmissions, icon: Clock, color: "text-rose-600 bg-rose-50" },
          { label: "Staff Members", value: stats.totalStaff, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 bg-white rounded-2xl ring-1 ring-slate-200/80 px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.color} shrink-0`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 leading-none">
                {isLoading ? <span className="inline-block h-5 w-12 bg-slate-100 animate-pulse rounded" /> : item.value}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}