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
import { Search, Plus, CreditCard, Banknote, Landmark, Download } from "lucide-react"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const payments = [
    { id: "PAY-5001", student: "Alice Mwangi", amount: "KES 45,000", method: "M-Pesa", ref: "RCD98S291", date: "2024-03-01" },
    { id: "PAY-5002", student: "Sarah Kemboi", amount: "KES 5,000", method: "Bank Transfer", ref: "BNK-00122", date: "2024-03-02" },
    { id: "PAY-5003", student: "John Kamau", amount: "KES 15,000", method: "Cash", ref: "RCP-110", date: "2024-03-03" },
    { id: "PAY-5004", student: "Grace Wanjiku", amount: "KES 10,000", method: "M-Pesa", ref: "RDH12K310", date: "2024-03-04" },
  ]

  const filteredPayments = payments.filter(p => 
    p.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ref.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payment Records</h1>
          <p className="text-muted-foreground">Log and audit student fee payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Reports
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">M-Pesa Payments</CardTitle>
            <div className="bg-green-100 p-2 rounded text-green-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES 520,000</div>
            <p className="text-xs text-muted-foreground">75% of total revenue</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <div className="bg-blue-100 p-2 rounded text-blue-700">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES 280,000</div>
            <p className="text-xs text-muted-foreground">20% of total revenue</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash/Cheque</CardTitle>
            <div className="bg-orange-100 p-2 rounded text-orange-700">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES 50,000</div>
            <p className="text-xs text-muted-foreground">5% of total revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by student or reference..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="font-mono text-xs font-semibold">{pay.id}</TableCell>
                  <TableCell className="font-medium">{pay.student}</TableCell>
                  <TableCell className="font-semibold text-accent">{pay.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{pay.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pay.ref}</TableCell>
                  <TableCell className="text-right">{pay.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
