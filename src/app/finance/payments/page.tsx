
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
  Filter,
  DollarSign,
  User,
  Wallet
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<"Fee" | "Miscellaneous">("Fee")
  const [formData, setFormData] = useState({ 
    invoiceId: "", 
    amount: "", 
    method: "M-Pesa", 
    reference: "",
    receivedFrom: "",
    description: ""
  })

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

    if (paymentType === "Fee") {
      const selectedInvoice = (invoices || []).find(i => i.id === formData.invoiceId)
      if (!selectedInvoice) {
        toast({ title: "Error", description: "Selected invoice not found.", variant: "destructive" })
        return
      }

      // Record Fee Payment
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

      // Update invoice outstanding balance
      const invoiceDocRef = doc(firestore, "invoices", formData.invoiceId)
      const newOutstanding = Math.max(0, Number(selectedInvoice.outstandingAmount) - amount)
      
      updateDocumentNonBlocking(invoiceDocRef, {
        outstandingAmount: newOutstanding,
        status: newOutstanding <= 0 ? "Paid" : "Partially Paid",
        updatedAt: serverTimestamp()
      })
    } else {
      // Record Miscellaneous Payment
      addDocumentNonBlocking(paymentsRef, {
        type: "Miscellaneous",
        amount: amount,
        paymentMethod: formData.method,
        transactionReference: formData.reference,
        receivedFrom: formData.receivedFrom,
        description: formData.description,
        paymentDate: new Date().toISOString(),
        recordedByUserId: user.uid,
        recordedByUserFirebaseUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    toast({ title: "Payment Recorded", description: `KES ${amount.toLocaleString()} has been logged successfully.` })
    setIsDialogOpen(false);
    setFormData({ invoiceId: "", amount: "", method: "M-Pesa", reference: "", receivedFrom: "", description: "" });
  };

  const filteredPayments = useMemo(() => {
    return (payments || []).filter(p => {
      const student = (students || []).find(s => s.id === p.studentId)
      const studentName = student ? `${student.firstName} ${student.lastName}` : ""
      const searchStr = (p.transactionReference || "") + (p.receivedFrom || "") + (p.description || "") + studentName + (p.type || "")
      
      const matchesSearch = searchStr.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesMethod = methodFilter === "All" || p.paymentMethod === methodFilter
      
      return matchesSearch && matchesMethod
    }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }, [payments, students, searchTerm, methodFilter])

  const totals = useMemo(() => {
    const p = payments || []
    return {
      fees: p.filter(pay => pay.type === "Fee").reduce((acc, pay) => acc + Number(pay.amount), 0),
      misc: p.filter(pay => pay.type === "Miscellaneous").reduce((acc, pay) => acc + Number(pay.amount), 0),
      total: p.reduce((acc, pay) => acc + Number(pay.amount), 0)
    }
  }, [payments])

  const getStudentName = (id: string) => {
    const s = (students || []).find(student => student.id === id)
    return s ? `${s.firstName} ${s.lastName}` : "N/A"
  }

  const isLoading = loadingPayments || loadingInvoices

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Ledger</h1>
          <p className="text-muted-foreground">Comprehensive record of all institutional income</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Ledger
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Record Income
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Record New Income</DialogTitle>
                <DialogDescription>Select the income category and provide transaction details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>Income Category</Label>
                  <Tabs value={paymentType} onValueChange={(v: any) => setPaymentType(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="Fee" className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" /> Student Fee
                      </TabsTrigger>
                      <TabsTrigger value="Miscellaneous" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Miscellaneous
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Received (KES)</Label>
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
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {paymentType === "Fee" ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="invoice">Select Student & Invoice</Label>
                    <Select onValueChange={(v) => setFormData({...formData, invoiceId: v})}>
                      <SelectTrigger id="invoice" className="w-full h-12">
                        <SelectValue placeholder="Choose an outstanding invoice..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(invoices || []).filter(i => i.status !== "Paid").map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            <div className="flex flex-col">
                              <span className="font-bold">{getStudentName(i.studentId)}</span>
                              <span className="text-xs text-muted-foreground">
                                {i.invoiceNumber} • Bal: KES {Number(i.outstandingAmount).toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="payee">Received From (Source)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="payee" 
                          placeholder="e.g. Canteen Operator, Ministry of Education"
                          className="pl-9"
                          value={formData.receivedFrom}
                          onChange={(e) => setFormData({...formData, receivedFrom: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc">Description / Purpose</Label>
                      <Input 
                        id="desc" 
                        placeholder="e.g. Quarterly Rent Payment, Certificate Fee"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ref">Transaction Reference / Receipt No.</Label>
                  <Input 
                    id="ref" placeholder="e.g. QX789J0..."
                    className="font-mono uppercase"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRecordPayment} className="w-full bg-primary h-12 text-lg">
                  Finalize Income Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Fee Revenue</CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.fees.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Direct student tuition income</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Miscellaneous Income</CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.misc.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Other institutional revenue</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none ring-1 ring-border bg-primary text-primary-foreground shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider opacity-80">Total Liquidity</CardTitle>
            <div className="bg-white/20 p-2 rounded-lg">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.total.toLocaleString()}</div>
            <p className="text-[10px] opacity-70 mt-1">Combined institutional cash flow</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Tabs defaultValue="All" className="w-full md:w-auto" onValueChange={setMethodFilter}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="All" className="px-4">All Sources</TabsTrigger>
            <TabsTrigger value="M-Pesa">M-Pesa</TabsTrigger>
            <TabsTrigger value="Bank Transfer">Bank</TabsTrigger>
            <TabsTrigger value="Cash">Cash</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search student, source or reference..." 
            className="pl-9 h-10 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date / Category</TableHead>
                <TableHead>Source / Student</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Auditing Ledger...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <TableRow key={pay.id} className="hover:bg-muted/10 transition-colors group">
                    <TableCell className="text-[11px] text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] uppercase font-bold text-primary/70">
                          {pay.type || 'Fee'}
                        </span>
                        <span>{new Date(pay.paymentDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">
                          {pay.type === "Miscellaneous" ? (pay.receivedFrom || 'Unknown Source') : getStudentName(pay.studentId)}
                        </span>
                        <span className="text-[10px] text-muted-foreground italic">
                          {pay.type === "Miscellaneous" ? pay.description : `Invoice: ${pay.invoiceId?.substring(0, 8)}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] uppercase tracking-tighter">{pay.transactionReference || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-md font-normal bg-background">
                        {pay.paymentMethod === "M-Pesa" && <CreditCard className="h-3 w-3 mr-1 inline" />}
                        {pay.paymentMethod === "Bank Transfer" && <Landmark className="h-3 w-3 mr-1 inline" />}
                        {pay.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                      KES {Number(pay.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <History className="h-8 w-8 mb-2" />
                      <p>No matching transactions found in the ledger.</p>
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
