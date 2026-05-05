"use client"

import { useState } from "react"
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
import { Search, FilePlus, Download, Filter, MoreHorizontal } from "lucide-react"

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const invoices = [
    { id: "INV-2024-001", student: "Alice Mwangi", amount: "KES 45,000", category: "Tuition Fees", date: "2024-03-01", status: "Paid" },
    { id: "INV-2024-002", student: "Robert Ochieng", amount: "KES 15,000", category: "Library Fees", date: "2024-03-02", status: "Pending" },
    { id: "INV-2024-003", student: "Sarah Kemboi", amount: "KES 5,000", category: "Activity Fees", date: "2024-03-02", status: "Paid" },
    { id: "INV-2024-004", student: "David Mutua", amount: "KES 45,000", category: "Tuition Fees", date: "2024-03-03", status: "Overdue" },
    { id: "INV-2024-005", student: "Grace Wanjiku", amount: "KES 12,000", category: "Lab Fees", date: "2024-03-04", status: "Pending" },
  ]

  const filteredInvoices = invoices.filter(inv => 
    inv.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track student fee invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <FilePlus className="mr-2 h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Billed</CardTitle>
            <div className="text-2xl font-bold text-primary">KES 1.2M</div>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Collected</CardTitle>
            <div className="text-2xl font-bold text-accent">KES 850k</div>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Outstanding</CardTitle>
            <div className="text-2xl font-bold text-destructive">KES 350k</div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search student or invoice ID..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-semibold">{inv.id}</TableCell>
                  <TableCell className="font-medium">{inv.student}</TableCell>
                  <TableCell>{inv.category}</TableCell>
                  <TableCell>{inv.amount}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>
                    <Badge variant={
                      inv.status === "Paid" ? "default" :
                      inv.status === "Pending" ? "secondary" : "destructive"
                    }>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
