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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Filter, Receipt, Calendar, ShoppingCart } from "lucide-react"

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const expenses = [
    { id: "EXP-001", description: "Office Furniture", category: "Infrastructure", amount: "KES 120,000", date: "2024-03-01", payee: "Harambee Furnitures" },
    { id: "EXP-002", description: "Electricity Bill - Feb", category: "Utilities", amount: "KES 45,600", date: "2024-03-02", payee: "Kenya Power" },
    { id: "EXP-003", description: "Internet Subscription", category: "Utilities", amount: "KES 15,000", date: "2024-03-02", payee: "Safaricom PLC" },
    { id: "EXP-004", description: "Staff Lunch Meeting", category: "Welfare", amount: "KES 8,500", date: "2024-03-03", payee: "College Canteen" },
    { id: "EXP-005", description: "Stationery Supplies", category: "Office Supplies", amount: "KES 24,000", date: "2024-03-04", payee: "School Bookshop" },
  ]

  const filteredExpenses = expenses.filter(exp => 
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Record and categorize institutional expenditures</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
              <DialogDescription>
                Fill in the details for the institutional expenditure.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">Description</Label>
                <Input id="desc" placeholder="e.g. Printer Repairs" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat" className="text-right">Category</Label>
                <Input id="cat" placeholder="e.g. Maintenance" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount (KES)</Label>
                <Input id="amount" type="number" placeholder="0.00" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payee" className="text-right">Payee</Label>
                <Input id="payee" placeholder="Vendor Name" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Save Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Monthly Spend</CardDescription>
              <CardTitle className="text-xl">KES 213,100</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Major Category</CardDescription>
              <CardTitle className="text-xl">Infrastructure</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="bg-accent/10 p-2 rounded-lg text-accent">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Last 7 Days</CardDescription>
              <CardTitle className="text-xl">KES 48,000</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search expenses..." 
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
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-muted-foreground">{exp.date}</TableCell>
                  <TableCell className="font-medium">{exp.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal capitalize">{exp.category}</Badge>
                  </TableCell>
                  <TableCell>{exp.payee}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{exp.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
