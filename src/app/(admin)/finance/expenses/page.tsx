
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Receipt,
  Loader2,
  Trash2,
  AlertCircle,
  TrendingDown,
  Settings2,
  Tag,
  ArrowUpRight,
  Filter,
  CalendarDays,
  Wallet,
  BarChart3,
  FileText,
  ChevronRight
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

const DEFAULT_CATEGORIES = [
  "Salaries", "Utilities", "Maintenance", "Office Supplies",
  "Marketing", "Travel", "Rent", "Insurance", "General"
]

const CATEGORY_COLORS: Record<string, string> = {
  "Salaries":       "bg-violet-100 text-violet-700 border-violet-200",
  "Utilities":      "bg-blue-100 text-blue-700 border-blue-200",
  "Maintenance":    "bg-orange-100 text-orange-700 border-orange-200",
  "Office Supplies":"bg-yellow-100 text-yellow-700 border-yellow-200",
  "Marketing":      "bg-pink-100 text-pink-700 border-pink-200",
  "Travel":         "bg-sky-100 text-sky-700 border-sky-200",
  "Rent":           "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Insurance":      "bg-teal-100 text-teal-700 border-teal-200",
  "General":        "bg-slate-100 text-slate-600 border-slate-200",
}

const CATEGORY_BAR_COLORS: Record<string, string> = {
  "Salaries":       "bg-violet-500",
  "Utilities":      "bg-blue-500",
  "Maintenance":    "bg-orange-500",
  "Office Supplies":"bg-yellow-500",
  "Marketing":      "bg-pink-500",
  "Travel":         "bg-sky-500",
  "Rent":           "bg-indigo-500",
  "Insurance":      "bg-teal-500",
  "General":        "bg-slate-400",
}

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || "bg-emerald-100 text-emerald-700 border-emerald-200"
}

function getCategoryBarColor(cat: string) {
  return CATEGORY_BAR_COLORS[cat] || "bg-emerald-500"
}

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [formData, setFormData] = useState({
    description: "",
    categoryId: "General",
    amount: "",
    payee: "",
    expenseDate: new Date().toISOString().split('T')[0]
  })

  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"

  const categoriesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "expenseCategories") : null, [firestore, user])
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "expenses"), orderBy("createdAt", "desc"))
  }, [firestore, user])

  const { data: categories, isLoading: loadingCategories } = useCollection(categoriesRef)
  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery)

  const activeCategories = useMemo(() => {
    if (!categories || categories.length === 0) return DEFAULT_CATEGORIES
    return categories.map(c => c.name)
  }, [categories])

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(exp => {
      const matchesSearch =
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.payee?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "All" || exp.categoryId === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [expenses, searchTerm, categoryFilter])

  const stats = useMemo(() => {
    const list = expenses || []
    const total = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const count = list.length

    const categoryTotals: Record<string, number> = list.reduce((acc: any, curr) => {
      const cat = curr.categoryId || "General"
      acc[cat] = (acc[cat] || 0) + (Number(curr.amount) || 0)
      return acc
    }, {})

    const sorted = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)
    const topCategory = sorted[0] ? sorted[0][0] : "None"

    // This month spend
    const now = new Date()
    const thisMonth = list.filter(e => {
      if (!e.expenseDate) return false
      const d = new Date(e.expenseDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const thisMonthTotal = thisMonth.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

    return { total, count, topCategory, categoryTotals: sorted, thisMonthTotal }
  }, [expenses])

  const handleSaveExpense = () => {
    if (!firestore || !user) return

    if (!formData.description.trim()) {
      toast({ title: "Missing Description", description: "Please describe the expense.", variant: "destructive" })
      return
    }

    const amountNum = Number(formData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid numeric value.", variant: "destructive" })
      return
    }

    addDocumentNonBlocking(collection(firestore, "expenses"), {
      description: formData.description,
      categoryId: formData.categoryId,
      amount: amountNum,
      payee: formData.payee,
      expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
      recordedByUserFirebaseUid: user.uid,
      recordedByUserId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    toast({ title: "Expense Recorded", description: "The expenditure has been logged successfully." })
    setIsDialogOpen(false)
    setFormData({ description: "", categoryId: "General", amount: "", payee: "", expenseDate: new Date().toISOString().split('T')[0] })
  }

  const handleAddCategory = () => {
    if (!categoriesRef || !newCategoryName.trim()) return
    addDocumentNonBlocking(categoriesRef, {
      name: newCategoryName.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    setNewCategoryName("")
    setIsCategoryDialogOpen(false)
    toast({ title: "Category Added", description: `"${newCategoryName}" added to expense categories.` })
  }

  const handleDelete = (id: string) => {
    if (!firestore || !isAdmin) return
    if (confirm("Delete this expense record permanently?")) {
      deleteDocumentNonBlocking(doc(firestore, "expenses", id))
      toast({ title: "Deleted", description: "Expense record removed." })
    }
  }

  const isLoading = loadingExpenses || loadingCategories

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Finance</p>
          <h1 className="text-2xl font-bold text-slate-900">Expense Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor and control institutional spending.</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-600 text-xs">
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Manage Categories</DialogTitle>
                  <DialogDescription className="text-sm text-slate-500">
                    Add custom categories to organize your spending.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Lab Supplies"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                      className="h-9 rounded-lg border-slate-200"
                    />
                    <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddCategory}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Active Categories
                    </div>
                    <div className="p-3 flex flex-wrap gap-1.5">
                      {activeCategories.map(cat => (
                        <Badge key={cat} variant="outline" className={`border text-xs font-medium ${getCategoryStyle(cat)}`}>
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900">Record Expenditure</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Log a cost incurred by the institution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Monthly Internet Subscription"
                    className="h-9 rounded-lg border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Category</Label>
                    <Select onValueChange={(v) => setFormData({ ...formData, categoryId: v })} value={formData.categoryId}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Amount (KES)</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="h-9 rounded-lg border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Payee / Vendor</Label>
                    <Input
                      value={formData.payee}
                      onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                      placeholder="e.g. Safaricom PLC"
                      className="h-9 rounded-lg border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Date</Label>
                    <Input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      className="h-9 rounded-lg border-slate-200 text-sm"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSaveExpense}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                  disabled={!formData.description || !formData.amount}
                >
                  <Receipt className="h-4 w-4 mr-2" /> Confirm & Log Expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">Total Expenditure</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">KES {stats.total.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Across all categories</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">This Month</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">KES {stats.thisMonthTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stats.count} total records</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4 text-violet-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">Highest Spend Area</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 truncate">{stats.topCategory}</p>
            <p className="text-xs text-slate-400 mt-0.5">Primary expenditure category</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Layout: Table + Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Expense Table */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by description or payee..."
                className="pl-9 h-9 border-slate-200 rounded-lg text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 border-slate-200 rounded-lg text-sm">
                <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {activeCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="h-10 text-xs font-semibold text-slate-500 pl-5">Date</TableHead>
                    <TableHead className="h-10 text-xs font-semibold text-slate-500">Category</TableHead>
                    <TableHead className="h-10 text-xs font-semibold text-slate-500">Description</TableHead>
                    <TableHead className="h-10 text-xs font-semibold text-slate-500">Payee</TableHead>
                    <TableHead className="h-10 text-xs font-semibold text-slate-500 text-right pr-5">Amount</TableHead>
                    {isAdmin && <TableHead className="w-[44px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="h-40 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm text-slate-400">Loading expense records...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <TableRow key={exp.id} className="border-slate-100 hover:bg-slate-50/70 transition-colors group">
                        <TableCell className="pl-5 py-3">
                          <div>
                            <p className="text-xs font-mono text-slate-700">
                              {exp.expenseDate
                                ? new Date(exp.expenseDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
                                : "—"}
                            </p>
                            {exp.createdAt?.toDate && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {formatDistanceToNow(exp.createdAt.toDate(), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`border text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryStyle(exp.categoryId)}`}>
                            {exp.categoryId || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-sm font-medium text-slate-800 max-w-[200px] truncate">{exp.description}</p>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-sm text-slate-500">{exp.payee || <span className="text-slate-300 italic">N/A</span>}</p>
                        </TableCell>
                        <TableCell className="py-3 text-right pr-5">
                          <p className="text-sm font-bold text-rose-600">
                            − KES {Number(exp.amount).toLocaleString()}
                          </p>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-md"
                              onClick={() => handleDelete(exp.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="h-8 w-8 text-slate-200" />
                          <p className="text-sm font-medium text-slate-400">No expenses found</p>
                          <p className="text-xs text-slate-400">
                            {searchTerm || categoryFilter !== "All" ? "Try adjusting your filters." : "Log your first expense to get started."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Spending Breakdown Sidebar */}
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800">Spending Breakdown</h3>
            </div>
            <CardContent className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                </div>
              ) : stats.categoryTotals.length > 0 ? (
                stats.categoryTotals.map(([cat, amount]) => {
                  const pct = stats.total > 0 ? Math.round((amount / stats.total) * 100) : 0
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${getCategoryBarColor(cat)}`} />
                          <span className="text-xs font-medium text-slate-700 truncate">{cat}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs font-bold text-slate-800">KES {Number(amount).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getCategoryBarColor(cat)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center">
                  <Wallet className="h-7 w-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No expenses recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Summary card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Quick Summary</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Total Records", value: `${stats.count} entries`, icon: Receipt, color: "text-blue-600 bg-blue-50" },
                { label: "This Month", value: `KES ${stats.thisMonthTotal.toLocaleString()}`, icon: CalendarDays, color: "text-emerald-600 bg-emerald-50" },
                { label: "Top Category", value: stats.topCategory, icon: Tag, color: "text-violet-600 bg-violet-50" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{item.label}</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
