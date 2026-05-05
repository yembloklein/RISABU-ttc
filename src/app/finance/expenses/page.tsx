
"use client"

import { useState, useMemo } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Plus, 
  Filter, 
  Receipt, 
  Calendar, 
  ShoppingCart, 
  Loader2, 
  Trash2, 
  AlertCircle,
  TrendingDown,
  ChevronRight
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

const COMMON_CATEGORIES = [
  "Salaries",
  "Utilities",
  "Maintenance",
  "Office Supplies",
  "Marketing",
  "Travel",
  "General",
  "Rent",
  "Insurance"
]

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ description: "", categoryId: "General", amount: "", payee: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"
  
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "expenses"), orderBy("createdAt", "desc"));
  }, [firestore, user]);

  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(exp => {
      const matchesSearch = 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.payee?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "All" || exp.categoryId === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const list = expenses || [];
    const total = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = list.length;
    
    // Categorized breakdown for the current view
    const categoryTotals = list.reduce((acc: any, curr) => {
      const cat = curr.categoryId || "General";
      acc[cat] = (acc[cat] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const topCategory = Object.entries(categoryTotals)
      .sort(([, a]: any, [, b]: any) => b - a)[0];

    return { total, count, topCategory: topCategory ? topCategory[0] : "None" };
  }, [expenses]);

  const handleSaveExpense = () => {
    if (!firestore || !user) return;
    
    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid numeric value.", variant: "destructive" });
      return;
    }

    addDocumentNonBlocking(collection(firestore, "expenses"), {
      description: formData.description,
      categoryId: formData.categoryId,
      amount: amountNum,
      payee: formData.payee,
      expenseDate: new Date().toISOString().split('T')[0],
      recordedByUserFirebaseUid: user.uid,
      recordedByUserId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    toast({ title: "Expense Recorded", description: "The expenditure has been logged successfully." });
    setIsDialogOpen(false);
    setFormData({ description: "", categoryId: "General", amount: "", payee: "" });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !isAdmin) return;
    if (confirm("Are you sure you want to delete this expense record?")) {
      deleteDocumentNonBlocking(doc(firestore, "expenses", id));
      toast({ title: "Deleted", description: "Expense record removed." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-muted-foreground">Monitor and control institutional spending</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Log New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record Expenditure</DialogTitle>
              <DialogDescription>
                Provide details for the cost incurred by the college.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="desc">Purpose / Description</Label>
                <Input 
                  id="desc" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g. Monthly Internet Subscription" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat">Category</Label>
                  <Select 
                    onValueChange={(v) => setFormData({...formData, categoryId: v})}
                    defaultValue="General"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payee">Payee / Vendor</Label>
                <Input 
                  id="payee" 
                  value={formData.payee}
                  onChange={(e) => setFormData({...formData, payee: e.target.value})}
                  placeholder="e.g. Safaricom PLC" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveExpense} className="w-full bg-primary">Confirm & Log Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cumulative Spend</CardTitle>
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.total.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total outflow across all categories</p>
          </CardContent>
        </Card>
        
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Transaction Count</CardTitle>
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count} Records</div>
            <p className="text-[10px] text-muted-foreground mt-1">Logged in current accounting period</p>
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Highest Spend Area</CardTitle>
            <div className="bg-accent/10 p-2 rounded-full text-accent">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topCategory}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Primary source of expenditure</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by description or payee..." 
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px] h-10">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {COMMON_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none ring-1 ring-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading expense logs...</p>
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(exp.expenseDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal rounded-md bg-background">
                        {exp.categoryId}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{exp.description}</TableCell>
                    <TableCell className="text-sm">{exp.payee || 'N/A'}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      KES {Number(exp.amount).toLocaleString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(exp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-40 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No matching expense records found.</p>
                    </div>
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
