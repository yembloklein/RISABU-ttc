
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  UserPlus, 
  Wallet, 
  ArrowUpRight, 
  Clock,
  Loader2
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

  const totalStudents = (students || []).filter(s => s.admissionStatus === "Enrolled").length
  const newAdmissions = (students || []).filter(s => s.admissionStatus === "Approved" || s.admissionStatus === "Applied").length
  const totalRevenue = (payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  const totalOutstanding = (invoices || []).reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0)

  const stats = [
    {
      title: "Total Students",
      value: totalStudents.toLocaleString(),
      change: "+0%",
      trending: "up",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "New Admissions",
      value: newAdmissions.toLocaleString(),
      change: "+0%",
      trending: "up",
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Revenue",
      value: `KES ${totalRevenue.toLocaleString()}`,
      change: "+0%",
      trending: "up",
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Outstanding",
      value: `KES ${totalOutstanding.toLocaleString()}`,
      change: "-0%",
      trending: "down",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ]

  const isLoading = loadingStudents || loadingInvoices || loadingPayments

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">College Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, Admin. Here's what's happening today at Risabu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
                  <div className="flex items-center text-xs mt-1">
                    <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
                    <span className="text-primary">{stat.change}</span>
                    <span className="text-muted-foreground ml-1">from last month</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Financial Activity</CardTitle>
                <CardDescription>Latest invoices generated</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">Real-time</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices && recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                      <TableCell>KES {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.status === "Paid" ? "default" : 
                          invoice.status === "Issued" ? "secondary" : "destructive"
                        }>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {invoice.issueDate}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No recent invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment Distribution</CardTitle>
            <CardDescription>Estimated departmental capacity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Information Technology</span>
                <span className="text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Business Studies</span>
                <span className="text-muted-foreground">72%</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Engineering</span>
                <span className="text-muted-foreground">91%</span>
              </div>
              <Progress value={91} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
