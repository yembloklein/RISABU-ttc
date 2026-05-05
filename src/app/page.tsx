import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
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

export default function Dashboard() {
  const stats = [
    {
      title: "Total Students",
      value: "1,248",
      change: "+12%",
      trending: "up",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "New Admissions",
      value: "156",
      change: "+8%",
      trending: "up",
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Revenue",
      value: "KES 4.2M",
      change: "+24%",
      trending: "up",
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Outstanding",
      value: "KES 850k",
      change: "-5%",
      trending: "down",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ]

  const recentInvoices = [
    { id: "INV-001", student: "John Doe", amount: "KES 45,000", status: "Paid", date: "2024-03-01" },
    { id: "INV-002", student: "Jane Smith", amount: "KES 32,500", status: "Pending", date: "2024-03-02" },
    { id: "INV-003", student: "Michael Johnson", amount: "KES 28,000", status: "Overdue", date: "2024-02-15" },
    { id: "INV-004", student: "Sarah Williams", amount: "KES 50,000", status: "Paid", date: "2024-03-03" },
  ]

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
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs mt-1">
                {stat.trending === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
                )}
                <span className={stat.trending === "up" ? "text-primary" : "text-destructive"}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
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
                <CardDescription>Latest invoices and student payments</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">Last 30 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.student}</TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge variant={
                        invoice.status === "Paid" ? "default" : 
                        invoice.status === "Pending" ? "secondary" : "destructive"
                      }>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{invoice.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment Capacity</CardTitle>
            <CardDescription>Tracking departmental admissions</CardDescription>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Applied Sciences</span>
                <span className="text-muted-foreground">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
