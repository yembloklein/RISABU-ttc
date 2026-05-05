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
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, Receipt, Calendar, ShoppingCart, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp } from "firebase/firestore"

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ description: "", categoryId: "general", amount: "", payee: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()
  
  const expensesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "expenses");
  }, [firestore]);

  const { data: expenses, isLoading } = useCollection(expensesRef);

  const filteredExpenses = (expenses || []).filter(exp => 
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.categoryId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalMonthlySpend = (expenses || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const handleSaveExpense = () => {
    if (!expensesRef || !user) return;
    
    addDocumentNonBlocking(expensesRef, {
      description: formData.description,
      categoryId: formData.categoryId,
      amount: Number(formData.amount),
      payee: formData.payee,
      expenseDate: new Date().toISOString().split('T')[0],
      recordedByUserFirebaseUid: user.uid,
      recordedByUserId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    setIsDialogOpen(false);
    setFormData({ description: "", categoryId: "general", amount: "", payee: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Record and categorize institutional expenditures</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <Input 
                  id="desc" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g. Printer Repairs" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat" className="text-right">Category</Label>
                <Input 
                  id="cat" 
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  placeholder="e.g. Maintenance" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount (KES)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payee" className="text-right">Payee</Label>
                <Input 
                  id="payee" 
                  value={formData.payee}
                  onChange={(e) => setFormData({...formData, payee: e.target.value})}
                  placeholder="Vendor Name" className="col-span-3" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveExpense} className="bg-primary">Save Expense</Button>
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
              <CardDescription>Total Recorded Spend</CardDescription>
              <CardTitle className="text-xl">KES {totalMonthlySpend.toLocaleString()}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Records</CardDescription>
              <CardTitle className="text-xl">{expenses?.length || 0} Items</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className="bg-accent/10 p-2 rounded-lg text-accent">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-xl">Active</CardTitle>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-muted-foreground">{exp.expenseDate}</TableCell>
                    <TableCell className="font-medium">{exp.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">{exp.categoryId}</Badge>
                    </TableCell>
                    <TableCell>{exp.payee || 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">KES {Number(exp.amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
