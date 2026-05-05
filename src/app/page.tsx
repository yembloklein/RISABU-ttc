
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  UserPlus, 
  Wallet, 
  ArrowUpRight, 
  Clock,
  Loader2,
  TrendingUp,
  CreditCard,
  Target
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

export default function Dashboard() {
  const firestore = useFirestore()
  const { user } = useUser()

  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  const invoicesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "invoices") : null, [firestore, user])
  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  
  const recentInvoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "invoices"), orderBy("createdAt", "desc"), limit(5))
  }, [firestore, user])

  const { data: students, isLoading: loadingStudents } = useCollection(studentsRef)
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesRef)
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: recentInvoices } = useCollection(recentInvoicesQuery)

  const stats = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled")
    const pending = (students || []).filter(s => s.admissionStatus === "Applied" || s.admissionStatus === "Approved")
    const revenue = (payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const outstanding = (invoices || []).reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0)
    const totalBilled = (invoices || []).reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0)
    const collectionRate = totalBilled > 0 ? (revenue / totalBilled) * 100 : 0

    return {
      totalStudents: enrolled.length,
      newAdmissions: pending.length,
      totalRevenue: revenue,
      totalOutstanding: outstanding,
      collectionRate: collectionRate.toFixed(1)
    }
  }, [students, invoices, payments])

  // Dynamically calculate enrollment by course
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

  const cards = [
    {
      title: "Enrolled Students",
      value: stats.totalStudents.toLocaleString(),
      description: "Active in system",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Admission Funnel",
      value: stats.newAdmissions.toLocaleString(),
      description: "Pending/Approved",
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Collected Revenue",
      value: `KES ${stats.totalRevenue.toLocaleString()}`,
      description: `${stats.collectionRate}% collection rate`,
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Arrears",
      value: `KES ${stats.totalOutstanding.toLocaleString()}`,
      description: "Immediate follow-up req.",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ]

  const isLoading = loadingStudents || loadingInvoices || loadingPayments

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">College Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time operational metrics for {user?.email === "clainyemblo@gmail.com" ? "Super Admin" : "College Staff"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider">Live System Status</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-primary" />
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Financials</CardTitle>
                <CardDescription>Latest generated fee invoices</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-primary" asChild>
                <a href="/finance/invoices">View All</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="h-9">Invoice #</TableHead>
                  <TableHead className="h-9">Amount</TableHead>
                  <TableHead className="h-9">Status</TableHead>
                  <TableHead className="h-9 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices && recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="font-medium">KES {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.status === "Paid" ? "default" : 
                          invoice.status === "Issued" ? "secondary" : "destructive"
                        } className="rounded-md text-[10px] px-1.5 py-0 h-5">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        {invoice.issueDate}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                      {isLoading ? "Fetching records..." : "No recent activity found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Enrollment Mix
              </CardTitle>
              <CardDescription>Distribution across departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {enrollmentDistribution.length > 0 ? (
                enrollmentDistribution.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="truncate max-w-[150px]">{item.name}</span>
                      <span className="text-muted-foreground">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-1.5" />
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground italic">No enrolled students yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary border-none shadow-lg text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs opacity-90">Manage financial records or record a new student payment instantly.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="text-xs h-8" asChild>
                  <a href="/finance/payments">Record Pay</a>
                </Button>
                <Button variant="secondary" size="sm" className="text-xs h-8" asChild>
                  <a href="/admissions">Add Student</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
