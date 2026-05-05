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
  Calendar,
  Printer,
  Mail,
  GraduationCap,
  BadgeCheck,
  Building2,
  MailQuestion
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc, query, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ studentId: "", amount: "", description: "" })
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null)
  
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

  const activePrintInvoice = useMemo(() => {
    return (invoices || []).find(inv => inv.id === printInvoiceId) || null
  }, [invoices, printInvoiceId])

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

  const handlePrintInvoice = (invoiceId: string) => {
    setPrintInvoiceId(invoiceId)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const handleSendReminder = (invoice: any) => {
    const student = getStudentInfo(invoice.studentId)
    toast({
      title: "Reminder Sent",
      description: `Payment reminder notification sent to ${student?.name} (${student?.email})`,
    })
  }

  const totals = useMemo(() => {
    const list = invoices || []
    const billed = list.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0)
    const outstanding = list.reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0)
    return { billed, outstanding, collected: billed - outstanding }
  }, [invoices])

  return (
    <div className="space-y-6">
      {/* Printable Invoice/Receipt Redesign */}
      {activePrintInvoice && (
        <div id="invoice-print-container" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
          <div className="max-w-4xl mx-auto bg-white flex flex-col h-full relative border-[8px] border-primary/10 p-12">
            {/* Watermark for Paid */}
            {activePrintInvoice.status === "Paid" && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 opacity-[0.03] pointer-events-none select-none">
                <span className="text-[180px] font-black text-primary leading-none">PAID</span>
              </div>
            )}

            <header className="flex justify-between items-start border-b-2 border-primary pb-8 mb-10">
              <div className="flex items-center gap-5">
                <div className="bg-primary p-4 rounded-2xl shadow-lg">
                  <GraduationCap className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-primary leading-tight uppercase">Risabu Technical</h1>
                  <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.2em] leading-none">Training College</p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase font-medium">Empowering Excellence through Vocational Education</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block bg-primary px-6 py-2 rounded-lg mb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">
                    {activePrintInvoice.status === "Paid" ? "Official Receipt" : "Fee Invoice"}
                  </h2>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-mono text-primary font-bold">{activePrintInvoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">Date: {activePrintInvoice.issueDate}</p>
                </div>
              </div>
            </header>

            <main className="flex-1 space-y-12">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-primary/20 pb-1">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-[10px] font-bold uppercase text-primary tracking-widest">Student Information</h3>
                  </div>
                  {(() => {
                    const s = getStudentInfo(activePrintInvoice.studentId)
                    return (
                      <div className="text-sm space-y-1 bg-primary/[0.02] p-4 rounded-xl border border-primary/10">
                        <p className="font-black text-xl text-slate-900">{s?.name}</p>
                        <p className="text-primary font-mono font-bold uppercase tracking-wider">ADM: {s?.adm}</p>
                        <p className="text-muted-foreground">{s?.email}</p>
                      </div>
                    )
                  })()}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-primary/20 pb-1">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-[10px] font-bold uppercase text-primary tracking-widest">Account Summary</h3>
                  </div>
                  <div className="text-sm space-y-2 bg-primary/[0.02] p-4 rounded-xl border border-primary/10">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={`uppercase font-bold text-[10px] ${activePrintInvoice.status === "Paid" ? "bg-primary" : "bg-destructive"}`}>
                        {activePrintInvoice.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-bold text-slate-700">{activePrintInvoice.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-primary/10 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow className="hover:bg-primary border-none">
                      <TableHead className="text-white font-bold uppercase text-xs">Academic Fee Description</TableHead>
                      <TableHead className="text-right text-white font-bold uppercase text-xs">Amount (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="h-32">
                      <TableCell className="align-top py-6">
                        <p className="font-black text-lg text-primary">{activePrintInvoice.description}</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Standard institutional charges for the current academic session. 
                          Includes tuition, facility use, and administrative levies.
                        </p>
                      </TableCell>
                      <TableCell className="text-right align-top py-6 font-mono text-xl font-black text-slate-900">
                        {Number(activePrintInvoice.totalAmount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-80 space-y-4 bg-primary/[0.03] p-6 rounded-2xl border-2 border-primary/10">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total Billable Amount:</span>
                    <span className="font-mono">{Number(activePrintInvoice.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Amount Received:</span>
                    <span className="font-mono">
                      KES {Number(activePrintInvoice.totalAmount - activePrintInvoice.outstandingAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-2xl font-black border-t-2 border-primary pt-4 text-primary">
                    <span>Balance:</span>
                    <span className="font-mono">KES {Number(activePrintInvoice.outstandingAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </main>

            <footer className="mt-20 pt-10 border-t-2 border-primary/20 flex justify-between items-end">
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-64 border-b-2 border-dashed border-primary/30 h-16"></div>
                  <span className="text-[10px] font-bold uppercase text-primary tracking-widest block mt-2">Finance Department Seal</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/50 p-2 rounded-md">
                   <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                   <span>Digitally Authenticated Document - Risabu Connect Ledger System</span>
                </div>
              </div>
              <div className="text-right space-y-2">
                <p className="text-sm font-black uppercase text-primary">Risabu Technical Training College</p>
                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p>Main Campus, P.O. Box 1234 - 00100</p>
                  <p>Email: finance@risabu.ac.ke</p>
                  <p>Website: www.risabu.ac.ke</p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Main UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
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

      <div className="flex flex-col md:flex-row gap-4 no-print">
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

      <Card className="border-none ring-1 ring-border overflow-hidden no-print">
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
                            <DropdownMenuItem onClick={() => handlePrintInvoice(inv.id)}>
                              <Printer className="mr-2 h-4 w-4 text-primary" /> {inv.status === "Paid" ? "View Receipt" : "View Invoice"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder(inv)}>
                              <Mail className="mr-2 h-4 w-4 text-orange-600" /> Send Reminder
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
