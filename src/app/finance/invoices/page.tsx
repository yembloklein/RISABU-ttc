
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  FilePlus, 
  Download, 
  Filter, 
  MoreVertical, 
  Loader2, 
  User, 
  Eye, 
  Trash2, 
  CheckCircle,
  FileText,
  Calendar
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc, query, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ studentId: "", amount: "", description: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "invoices"), orderBy("createdAt", "desc"))
  }, [firestore, user])

  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  
  const { data: invoices, isLoading } = useCollection(invoicesQuery)
  const { data: students } = useCollection(studentsRef)

  const getStudentInfo = (studentId: string) => {
    const s = (students || []).find(student => student.id === studentId)
    return s ? { name: `${s.firstName} ${s.lastName}`, adm: s.id.substring(0, 8).toUpperCase(), email: s.contactEmail } : null
  }

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      const student = getStudentInfo(inv.studentId)
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student?.adm.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
  }, [invoices, students, searchTerm, statusFilter])

  const handleCreateInvoice = () => {
    if (!firestore || !user) return;
    
    if (!formData.studentId || !formData.amount || !formData.description) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" })
      return
    }

    const amount = Number(formData.amount)
    const invNumber = `INV-${Date.now().toString().slice(-6)}`
    
    addDocumentNonBlocking(collection(firestore, "invoices"), {
      studentId: formData.studentId,
      invoiceNumber: invNumber,
      totalAmount: amount,
      outstandingAmount: amount,
      status: "Issued",
      description: formData.description,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      recordedByUserFirebaseUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    toast({ title: "Invoice Generated", description: `Reference: ${invNumber}` })
    setIsDialogOpen(false);
    setFormData({ studentId: "", amount: "", description: "" });
  };

  const handleUpdateStatus = (invoiceId: string, newStatus: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "invoices", invoiceId);
    updateDocumentNonBlocking(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Status Updated", description: `Invoice marked as ${newStatus}` });
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (!firestore || !isAdmin) return;
    if (confirm("Permanently delete this invoice?")) {
      deleteDocumentNonBlocking(doc(firestore, "invoices", invoiceId));
      toast({ title: "Invoice Deleted", variant: "destructive" });
    }
  };

  const totals = useMemo(() => {
    const list = invoices || []
    const billed = list.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0)
    const outstanding = list.reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0)
    return { billed, outstanding, collected: billed - outstanding }
  }, [invoices])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Billing</h1>
          <p className="text-muted-foreground">Issue and manage student academic invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <FilePlus className="mr-2 h-4 w-4" /> New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Generate Bill</DialogTitle>
                <DialogDescription>Create a new fee obligation for a student.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="student">Student Name / ADM</Label>
                  <Select onValueChange={(v) => setFormData({...formData, studentId: v})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select student to bill" />
                    </SelectTrigger>
                    <SelectContent>
                      {(students || []).filter(s => s.admissionStatus === "Enrolled").map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.id.substring(0, 8).toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Total Amount (KES)</Label>
                    <Input 
                      id="amount" type="number" placeholder="0.00"
                      className="h-11"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Description</Label>
                    <Input 
                      id="desc" placeholder="e.g. Tuition Q1"
                      className="h-11"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateInvoice} className="w-full bg-primary h-11">Generate & Save Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="py-4 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.billed.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Institutional receivables</p>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="py-4 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-accent">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">KES {totals.collected.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Paid in full or partially</p>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm bg-destructive/[0.02]">
          <CardHeader className="py-4 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-destructive">Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">KES {totals.outstanding.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Current uncollected debt</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search invoice, student name or ADM..." 
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-10">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Issued">Issued</SelectItem>
            <SelectItem value="Partially Paid">Partial</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none ring-1 ring-border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Invoice / Date</TableHead>
                <TableHead>Student Details</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Total (KES)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Fetching records...</p>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const student = getStudentInfo(inv.studentId)
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-primary">{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {inv.issueDate}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{student?.name || 'Unknown'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">{student?.adm || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inv.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(inv.totalAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {Number(inv.outstandingAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          inv.status === "Paid" ? "default" :
                          inv.status === "Issued" ? "secondary" : "destructive"
                        } className="rounded-md text-[10px] h-5 px-1.5">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Invoice Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "Paid")}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> View Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" /> Send Reminder
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteInvoice(inv.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Void Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">
                    <FileText className="h-8 w-8 mb-2 mx-auto opacity-20" />
                    <p>No matching invoice records found.</p>
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
