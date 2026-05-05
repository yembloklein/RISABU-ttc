
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
  CreditCard, 
  Download, 
  Loader2, 
  History,
  Filter,
  DollarSign,
  GraduationCap,
  Hash
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function FeesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    invoiceId: "", 
    amount: "", 
    method: "M-Pesa", 
    reference: "",
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  const invoicesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "invoices") : null, [firestore, user])
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesRef)
  const { data: students } = useCollection(studentsRef)

  const handleRecordFee = async () => {
    if (!paymentsRef || !user || !firestore) return;

    const amount = Number(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" })
      return
    }

    const selectedInvoice = (invoices || []).find(i => i.id === formData.invoiceId)
    if (!selectedInvoice) {
      toast({ title: "Validation Error", description: "Please select a student invoice.", variant: "destructive" })
      return
    }

    addDocumentNonBlocking(paymentsRef, {
      type: "Fee",
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

    const invoiceDocRef = doc(firestore, "invoices", formData.invoiceId)
    const newOutstanding = Math.max(0, Number(selectedInvoice.outstandingAmount) - amount)
    
    updateDocumentNonBlocking(invoiceDocRef, {
      outstandingAmount: newOutstanding,
      status: newOutstanding <= 0 ? "Paid" : "Partially Paid",
      updatedAt: serverTimestamp()
    })

    toast({ title: "Success", description: `Fee payment of KES ${amount.toLocaleString()} recorded.` })
    setIsDialogOpen(false);
    setFormData({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" });
  };

  const filteredPayments = useMemo(() => {
    return (payments || [])
      .filter(p => p.type === "Fee")
      .filter(p => {
        const student = (students || []).find(s => s.id === p.studentId)
        const studentName = student ? `${student.firstName} ${student.lastName}` : ""
        const adm = student?.admissionNumber || ""
        const searchStr = (p.transactionReference || "") + studentName + adm + (p.invoiceId || "")
        
        const matchesSearch = searchStr.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesMethod = methodFilter === "All" || p.paymentMethod === methodFilter
        
        return matchesSearch && matchesMethod
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }, [payments, students, searchTerm, methodFilter])

  const totals = useMemo(() => {
    const p = (payments || []).filter(pay => pay.type === "Fee")
    const inv = (invoices || [])
    return {
      collected: p.reduce((acc, pay) => acc + Number(pay.amount), 0),
      outstanding: inv.reduce((acc, i) => acc + Number(i.outstandingAmount), 0),
      totalBilled: inv.reduce((acc, i) => acc + Number(i.totalAmount), 0)
    }
  }, [payments, invoices])

  const getStudentInfo = (studentId: string) => {
    const s = (students || []).find(student => student.id === studentId)
    return s ? { name: `${s.firstName} ${s.lastName}`, adm: s.admissionNumber || s.id.substring(0, 8).toUpperCase() } : { name: "N/A", adm: "N/A" }
  }

  const isLoading = loadingPayments || loadingInvoices

  const pendingInvoices = useMemo(() => {
    return (invoices || []).filter(i => i.status !== "Paid");
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Payments</h1>
          <p className="text-muted-foreground">Manage and track student tuition receipts</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Record Fee Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Log a new tuition receipt for a student.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice">Select Student</Label>
                  <Select onValueChange={(v) => setFormData({...formData, invoiceId: v})}>
                    <SelectTrigger id="invoice" className="w-full">
                      <SelectValue placeholder="Choose student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingInvoices.map(i => {
                        const info = getStudentInfo(i.studentId)
                        return (
                          <SelectItem key={i.id} value={i.id}>
                            {info.name} ({info.adm}) - KES {Number(i.outstandingAmount).toLocaleString()}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="amount" type="number" 
                      placeholder="0.00"
                      className="pl-9"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
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
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ref">Transaction Reference</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="ref" placeholder="Ref / Receipt No."
                      className="pl-9 font-mono uppercase"
                      value={formData.reference}
                      onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRecordFee} className="w-full bg-primary">Confirm Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Collected</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">KES {totals.collected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Billed</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.totalBilled.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm bg-destructive/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-destructive">Pending Balance</CardTitle>
            <History className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">KES {totals.outstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search records..." 
            className="pl-9 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Methods</SelectItem>
            <SelectItem value="M-Pesa">M-Pesa</SelectItem>
            <SelectItem value="Bank Transfer">Bank</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none ring-1 ring-border overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>ADM / Ref</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => {
                  const studentInfo = getStudentInfo(pay.studentId)
                  return (
                    <TableRow key={pay.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(pay.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {studentInfo?.name}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{studentInfo?.adm}</span>
                          <span className="text-muted-foreground uppercase">{pay.transactionReference || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {pay.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        KES {Number(pay.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No payment history found.
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
