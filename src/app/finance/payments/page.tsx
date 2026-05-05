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
  Download, 
  Loader2, 
  History,
  Filter,
  DollarSign,
  User,
  Wallet,
  GraduationCap,
  Hash,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { parseTransaction, type ParseTransactionOutput } from "@/ai/flows/payment-parser"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<"Fee" | "Miscellaneous">("Fee")
  
  // AI Parsing States
  const [rawText, setRawText] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<ParseTransactionOutput | null>(null)

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
    } else {
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

    toast({ title: "Success", description: `Income of KES ${amount.toLocaleString()} recorded.` })
    setIsDialogOpen(false);
    setFormData({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" , receivedFrom: "", description: ""});
    setParsedData(null);
    setRawText("");
  };

  const handleParseText = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParsedData(null);
    
    try {
      const result = await parseTransaction({ rawText });
      setParsedData(result);
      
      // Auto-fill basic fields
      setFormData(prev => ({
        ...prev,
        amount: result.amount.toString(),
        reference: result.reference,
        method: result.provider === "M-Pesa" ? "M-Pesa" : "Bank Transfer",
        receivedFrom: result.payerName
      }));

      // Intelligent Student Matching Logic
      const matchedStudent = (students || []).find(s => {
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        return fullName.includes(result.payerName.toLowerCase()) || 
               result.payerName.toLowerCase().includes(fullName);
      });

      if (matchedStudent) {
        const matchedInvoice = (invoices || []).find(i => 
          i.studentId === matchedStudent.id && i.status !== "Paid"
        );
        
        if (matchedInvoice) {
          setFormData(prev => ({ ...prev, invoiceId: matchedInvoice.id }));
          toast({ 
            title: "AI Match Found", 
            description: `Matched to ${matchedStudent.firstName} ${matchedStudent.lastName} (${matchedInvoice.invoiceNumber})` 
          });
        }
      }
    } catch (error) {
      toast({ title: "Parsing Error", description: "Could not read transaction text.", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Institutional Ledger</h1>
          <p className="text-muted-foreground">Manage and audit all college income sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Record New Income
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Smart Income Logger
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Paste M-Pesa or Bank confirmation text below to auto-fill the record.
                </DialogDescription>
                
                <div className="mt-4 flex gap-2">
                  <Input 
                    placeholder="Paste transaction text here..." 
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="bg-background"
                  />
                  <Button 
                    onClick={handleParseText} 
                    disabled={isParsing || !rawText.trim()}
                    className="bg-primary"
                  >
                    {isParsing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "AI Sync"}
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <Tabs value={paymentType} onValueChange={(v: any) => setPaymentType(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="Fee" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Student Fee
                    </TabsTrigger>
                    <TabsTrigger value="Miscellaneous" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Miscellaneous
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid gap-5">
                  {paymentType === "Fee" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoice">Target Student Invoice</Label>
                        <Select onValueChange={(v) => setFormData({...formData, invoiceId: v})} value={formData.invoiceId}>
                          <SelectTrigger id="invoice" className="w-full h-11 border-muted-foreground/20">
                            <SelectValue placeholder="Match to student..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {loadingInvoices ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            ) : (
                              pendingInvoices.map(i => {
                                const info = getStudentInfo(i.studentId)
                                return (
                                  <SelectItem key={i.id} value={i.id}>
                                    {info.name} - {i.invoiceNumber} (KES {Number(i.outstandingAmount).toLocaleString()})
                                  </SelectItem>
                                )
                              })
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="payee">Payer / Source Name</Label>
                        <Input 
                          id="payee" 
                          placeholder="e.g. JOHN DOE" 
                          className="h-11"
                          value={formData.receivedFrom}
                          onChange={(e) => setFormData({...formData, receivedFrom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Input 
                          id="desc" 
                          placeholder="e.g. Canteen Rent"
                          className="h-11"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (KES)</Label>
                      <Input 
                        id="amount" type="number" 
                        placeholder="0.00"
                        className="h-11 font-bold"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="method">Method</Label>
                      <Select onValueChange={(v) => setFormData({...formData, method: v})} value={formData.method}>
                        <SelectTrigger id="method" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ref">Transaction Reference</Label>
                    <Input 
                      id="ref" placeholder="Reference ID"
                      className="font-mono uppercase h-11"
                      value={formData.reference}
                      onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-muted/30 p-4 border-t">
                <Button onClick={handleRecordPayment} className="w-full bg-primary h-12 text-md font-bold shadow-lg">
                  Confirm & Finalize Log
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Fee Revenue</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.fees.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Tuition and academic fees</p>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Other Income</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.misc.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Non-academic streams</p>
          </CardContent>
        </Card>
        <Card className="border-none ring-1 ring-border shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase opacity-80">Total Inflow</CardTitle>
            <CheckCircle2 className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.total.toLocaleString()}</div>
            <p className="text-[10px] opacity-70 mt-1">Consolidated institutional liquidity</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search student, ref or source..." 
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
                <TableHead>Date / Cat</TableHead>
                <TableHead>Source / Student</TableHead>
                <TableHead>ADM / Ref</TableHead>
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
                      <p className="text-sm text-muted-foreground">Fetching records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => {
                  const studentInfo = pay.studentId ? getStudentInfo(pay.studentId) : null
                  return (
                    <TableRow key={pay.id} className="hover:bg-muted/5 group">
                      <TableCell className="text-[10px] text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="font-bold uppercase text-primary/70">{pay.type}</span>
                          <span>{new Date(pay.paymentDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">
                            {pay.type === "Miscellaneous" ? pay.receivedFrom : studentInfo?.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                            {pay.type === "Miscellaneous" ? pay.description : `Invoice: ${pay.invoiceId?.substring(0, 8)}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold">{studentInfo?.adm || '---'}</span>
                          <span className="text-muted-foreground uppercase">{pay.transactionReference || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal rounded-md">
                          {pay.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-primary">
                        KES {Number(pay.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                    <History className="h-8 w-8 mb-2 mx-auto opacity-20" />
                    <p>No transaction history found.</p>
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
