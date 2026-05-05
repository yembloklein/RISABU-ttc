
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  CreditCard, 
  Banknote, 
  Landmark, 
  Download, 
  Loader2, 
  History,
  CheckCircle2,
  Filter
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" })

  const firestore = useFirestore()
  const { user } = useUser()

  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  const invoicesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "invoices") : null, [firestore, user])
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesRef)
  const { data: students } = useCollection(studentsRef)

  const handleRecordPayment = async () => {
    if (!paymentsRef || !user || !firestore) return;

    const amount = Number(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" })
      return
    }

    const selectedInvoice = (invoices || []).find(i => i.id === formData.invoiceId)
    if (!selectedInvoice) {
      toast({ title: "Error", description: "Selected invoice not found.", variant: "destructive" })
      return
    }

    // Record the payment
    addDocumentNonBlocking(paymentsRef, {
      invoiceId: formData.invoiceId,
      studentId: selectedInvoice.studentId,
      amount: amount,
      paymentMethod: formData.method,
      transactionReference: formData.reference,
      paymentDate: new Date().toISOString(),
      recordedByUserId: user.uid,
      recordedByUserFirebaseUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update invoice outstanding balance
    const invoiceDocRef = doc(firestore, "invoices", formData.invoiceId)
    const newOutstanding = Math.max(0, Number(selectedInvoice.outstandingAmount) - amount)
    
    updateDocumentNonBlocking(invoiceDocRef, {
      outstandingAmount: newOutstanding,
      status: newOutstanding <= 0 ? "Paid" : "Partially Paid",
      updatedAt: serverTimestamp()
    })

    toast({ title: "Payment Recorded", description: `KES ${amount.toLocaleString()} has been logged successfully.` })
    setIsDialogOpen(false);
    setFormData({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" });
  };

  const filteredPayments = useMemo(() => {
    return (payments || []).filter(p => {
      const student = (students || []).find(s => s.id === p.studentId)
      const studentName = student ? `${student.firstName} ${student.lastName}` : ""
      
      const matchesSearch = 
        p.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesMethod = methodFilter === "All" || p.paymentMethod === methodFilter
      
      return matchesSearch && matchesMethod
    }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }, [payments, students, searchTerm, methodFilter])

  const totals = useMemo(() => {
    const p = payments || []
    return {
      mpesa: p.filter(pay => pay.paymentMethod === "M-Pesa").reduce((acc, pay) => acc + Number(pay.amount), 0),
      bank: p.filter(pay => pay.paymentMethod === "Bank Transfer").reduce((acc, pay) => acc + Number(pay.amount), 0),
      other: p.filter(pay => pay.paymentMethod !== "M-Pesa" && pay.paymentMethod !== "Bank Transfer").reduce((acc, pay) => acc + Number(pay.amount), 0)
    }
  }, [payments])

  const getStudentName = (id: string) => {
    const s = (students || []).find(student => student.id === id)
    return s ? `${s.firstName} ${s.lastName}` : "Unknown Student"
  }

  const isLoading = loadingPayments || loadingInvoices

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Records</h1>
          <p className="text-muted-foreground">Log and audit student fee payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Reports
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Record New Payment</DialogTitle>
                <DialogDescription>Log a payment against an issued invoice. Balance will update automatically.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice">Target Invoice</Label>
                  <Select onValueChange={(v) => setFormData({...formData, invoiceId: v})}>
                    <SelectTrigger id="invoice" className="w-full">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {(invoices || []).filter(i => i.status !== "Paid").map(i => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.invoiceNumber} - {getStudentName(i.studentId)} (KES {Number(i.outstandingAmount).toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received</Label>
                    <Input 
                      id="amount" type="number" 
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method</Label>
                    <Select onValueChange={(v) => setFormData({...formData, method: v})} defaultValue="M-Pesa">
                      <SelectTrigger id="method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref">Transaction Reference</Label>
                  <Input 
                    id="ref" placeholder="e.g. QX789J0..."
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRecordPayment} className="w-full bg-primary">Confirm & Save Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">M-Pesa Total</CardTitle>
            <div className="bg-green-100 p-2 rounded-lg text-green-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.mpesa.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Total</CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.bank.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Others Total</CardTitle>
            <div className="bg-orange-100 p-2 rounded-lg text-orange-700">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.other.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Tabs defaultValue="All" className="w-full md:w-auto" onValueChange={setMethodFilter}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="All">All Methods</TabsTrigger>
            <TabsTrigger value="M-Pesa">M-Pesa</TabsTrigger>
            <TabsTrigger value="Bank Transfer">Bank</TabsTrigger>
            <TabsTrigger value="Cash">Cash</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search student or reference..." 
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading payment logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <TableRow key={pay.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <History className="h-3 w-3" />
                        {new Date(pay.paymentDate).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{getStudentName(pay.studentId)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{pay.invoiceId?.substring(0, 8)}</TableCell>
                    <TableCell className="font-bold text-accent">KES {Number(pay.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md font-normal">
                        {pay.paymentMethod === "M-Pesa" && <CreditCard className="h-3 w-3 mr-1 inline" />}
                        {pay.paymentMethod === "Bank Transfer" && <Landmark className="h-3 w-3 mr-1 inline" />}
                        {pay.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] uppercase tracking-wider">{pay.transactionReference || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <History className="h-8 w-8 mb-2" />
                      <p>No payment records match your criteria.</p>
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
