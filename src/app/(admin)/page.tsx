"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Wallet, 
  Activity,
  CreditCard,
  Target,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { formatDistanceToNow } from "date-fns"

export default function Dashboard() {
  const firestore = useFirestore()
  const { user } = useUser()

  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  const programsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  
  // Fetch latest 6 payments
  const recentPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "payments"), orderBy("createdAt", "desc"), limit(6))
  }, [firestore, user])

  const { data: students, isLoading: loadingStudents } = useCollection(studentsRef)
  const { data: programs, isLoading: loadingPrograms } = useCollection(programsRef)
  const { data: allPayments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: recentPayments } = useCollection(recentPaymentsQuery)

  const stats = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled")
    
    // Calculate Total Expected Revenue
    let totalExpected = 0
    let totalTuitionPaid = 0
    enrolled.forEach(s => {
      const prog = (programs || []).find(p => p.name === s.appliedCourse)
      if (prog) totalExpected += Number(prog.tuitionFee) || 0
      
      const tPaid = (allPayments || []).filter(p => p.studentId === s.id && p.type === "Fee").reduce((acc, p) => acc + Number(p.amount), 0)
      totalTuitionPaid += tPaid
    })

    // Calculate Total Collected (All Fee Types)
    const totalCollected = (allPayments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

    const totalArrears = Math.max(0, totalExpected - totalTuitionPaid)
    const collectionRate = totalExpected > 0 ? Math.round((totalTuitionPaid / totalExpected) * 100) : 0

    return {
      totalStudents: enrolled.length,
      totalExpected,
      totalCollected,
      totalArrears,
      collectionRate
    }
  }, [students, programs, allPayments])

  const enrollmentDistribution = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled")
    const groups: Record<string, number> = {}
    
    enrolled.forEach(s => {
      const course = s.appliedCourse || "General"
      groups[course] = (groups[course] || 0) + 1
    })

    const total = enrolled.length || 1
    return Object.entries(groups)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [students])

  const isLoading = loadingStudents || loadingPrograms || loadingPayments

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Overview</h1>
          <p className="text-muted-foreground mt-2 font-medium text-lg">
            Welcome back. Here's what's happening at Risabu TTC today.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase text-slate-500">Active Scholars</CardTitle>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-black text-slate-900">{stats.totalStudents.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase text-slate-500">Expected Revenue</CardTitle>
            <div className="h-10 w-10 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-black text-slate-900">KES {stats.totalExpected.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mb-16 -mr-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase text-emerald-700">Collected Revenue</CardTitle>
            <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {isLoading ? (
              <div className="h-9 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-3xl font-black text-emerald-950">KES {stats.totalCollected.toLocaleString()}</div>
                <div className="flex items-center mt-1 text-xs font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.collectionRate}% Collection Rate
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mb-16 -mr-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase text-rose-700">Total Arrears</CardTitle>
            <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {isLoading ? (
              <div className="h-9 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-black text-rose-950">KES {stats.totalArrears.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Ledger Table */}
        <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Recent Transactions</CardTitle>
                <CardDescription className="font-medium mt-1">Latest fee collections logged in the system</CardDescription>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold h-10 px-4 rounded-full" asChild>
                <a href="/finance/fees">View All <ArrowRight className="h-4 w-4 ml-2" /></a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 h-12 pl-6">Student ID</TableHead>
                  <TableHead className="font-bold text-slate-500 h-12">Amount</TableHead>
                  <TableHead className="font-bold text-slate-500 h-12">Method</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 h-12 pr-6">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments && recentPayments.length > 0 ? (
                  recentPayments.map((payment) => {
                    // Try to find the student name if we have the students loaded
                    const student = students?.find(s => s.id === payment.studentId)
                    const studentName = student ? `${student.firstName} ${student.lastName}` : payment.studentId.substring(0, 8)
                    
                    return (
                      <TableRow key={payment.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{studentName}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">REF: {payment.transactionReference}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-black text-emerald-600">KES {Number(payment.amount).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold text-[10px] uppercase">
                            {payment.paymentMethod || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <span className="text-sm text-slate-500 font-medium">
                            {payment.paymentDate ? formatDistanceToNow(new Date(payment.paymentDate), { addSuffix: true }) : "Recently"}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium">No recent transactions to display.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sidebar Widgets */}
        <div className="space-y-8 flex flex-col">
          {/* Action Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full" />
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                Streamline your workflow with direct access to core operations.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20" asChild>
                  <a href="/finance/fees">Log Payment</a>
                </Button>
                <Button className="bg-white/10 hover:bg-white/20 text-white font-bold h-11 rounded-xl" asChild>
                  <a href="/admissions">Admit Scholar</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Departmental Mix */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white flex-1">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Target className="h-5 w-5 text-blue-500" />
                Program Distribution
              </CardTitle>
              <CardDescription className="font-medium">Active scholars across departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {enrollmentDistribution.length > 0 ? (
                enrollmentDistribution.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tight text-slate-700">
                      <span className="truncate max-w-[180px]">{item.name}</span>
                      <span className="text-slate-400">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-2 bg-slate-100" />
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                  <Users className="h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold uppercase text-slate-400">No Program Data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}