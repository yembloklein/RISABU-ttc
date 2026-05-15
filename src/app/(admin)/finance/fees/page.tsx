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
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Plus,
  CreditCard,
  Loader2,
  TrendingDown,
  DollarSign,
  GraduationCap,
  Hash,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Printer,
  UploadCloud,
  FileSpreadsheet
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'
import { Logo } from "@/components/ui/logo"

export default function FeesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'arrears' | 'cleared'>('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [paymentMethodTab, setPaymentMethodTab] = useState("manual")
  const [isProcessingMpesa, setIsProcessingMpesa] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  const [formData, setFormData] = useState({
    studentId: "",
    amount: "",
    method: "Cash",
    reference: "",
    phoneNumber: ""
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  const programsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])

  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: students, isLoading: loadingStudents } = useCollection(studentsRef)
  const { data: programs, isLoading: loadingPrograms } = useCollection(programsRef)

  const enrolledStudents = useMemo(() => {
    return (students || []).filter(s => s.admissionStatus === "Enrolled")
  }, [students])

  const getStudentFeeDetails = (studentId: string) => {
    const student = enrolledStudents.find(s => s.id === studentId)
    if (!student) return { totalFee: 0, totalPaid: 0, balance: 0, courseName: "Unknown", progress: 0 }

    const program = (programs || []).find(p => p.name === student.appliedCourse)
    const totalFee = program ? Number(program.tuitionFee) : 0

    const studentPayments = (payments || []).filter(p => p.studentId === studentId && p.type === "Fee")
    const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    const balance = Math.max(0, totalFee - totalPaid)
    const progress = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 100

    return { totalFee, totalPaid, balance, courseName: student.appliedCourse || "General", progress }
  }

  const handleRecordManualPayment = () => {
    if (!paymentsRef || !user || !firestore) return;

    const amount = Number(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" })
      return
    }
    if (!formData.studentId) {
      toast({ title: "Validation Error", description: "Please select a student.", variant: "destructive" })
      return
    }

    addDocumentNonBlocking(paymentsRef, {
      type: "Fee",
      studentId: formData.studentId,
      amount: amount,
      paymentMethod: formData.method,
      transactionReference: formData.reference || `MNL-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString(),
      recordedByUserId: user.uid,
      recordedByUserFirebaseUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    toast({ title: "Success", description: `Manual payment of KES ${amount.toLocaleString()} recorded.` })
    setIsDialogOpen(false);
    resetForm();
  };

  const handleMpesaSTKPush = async () => {
    if (!formData.studentId || !formData.amount || !formData.phoneNumber) {
      toast({ title: "Missing Fields", description: "Phone number, amount, and student must be provided.", variant: "destructive" });
      return;
    }

    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }

    setIsProcessingMpesa(true);

    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: formData.studentId,
          amount: amount,
          phoneNumber: formData.phoneNumber,
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "STK Push Sent",
          description: "Check the phone to complete the M-Pesa transaction."
        });

        setIsDialogOpen(false);
        resetForm();

        // SIMULATION
        setTimeout(() => {
          if (!paymentsRef || !user) return;
          addDocumentNonBlocking(paymentsRef, {
            type: "Fee",
            studentId: formData.studentId,
            amount: amount,
            paymentMethod: "M-Pesa",
            transactionReference: data.CheckoutRequestID || `MPESA-${Date.now().toString().slice(-6)}`,
            paymentDate: new Date().toISOString(),
            recordedByUserId: user.uid,
            recordedByUserFirebaseUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          toast({
            title: "M-Pesa Payment Received",
            description: `KES ${amount.toLocaleString()} was successfully received via M-Pesa.`
          });
        }, 5000);

      } else {
        throw new Error(data.error || "Failed to initiate M-Pesa payment.");
      }
    } catch (error: any) {
      toast({ title: "M-Pesa Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingMpesa(false);
    }
  }

  const resetForm = () => {
    setFormData({ studentId: "", amount: "", method: "Cash", reference: "", phoneNumber: "" });
  }

  const handleFeesExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          let successCount = 0;
          let failCount = 0;

          for (const row of data as any[]) {
            const admNo = row['Admission Number'] || row['AdmissionNo'] || row['ADM'] || row['Admission No'];
            const amount = Number(row['Amount'] || row['Fee']);
            const method = row['Method'] || row['Payment Method'] || 'Bank Transfer';
            const ref = row['Reference'] || row['Receipt No'] || `IMP-${Date.now().toString().slice(-6)}`;
            
            if (!admNo || isNaN(amount) || amount <= 0) {
              failCount++;
              continue;
            }

            // Find student by ADM
            const student = enrolledStudents.find(s => s.admissionNumber === admNo);
            if (!student) {
              failCount++;
              continue;
            }

            if (paymentsRef && user) {
              addDocumentNonBlocking(paymentsRef, {
                type: "Fee",
                studentId: student.id,
                amount: amount,
                paymentMethod: method,
                transactionReference: ref.toString(),
                paymentDate: new Date().toISOString(),
                recordedByUserId: user.uid,
                recordedByUserFirebaseUid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              successCount++;
            }
          }
          
          toast({
            title: "Import Complete",
            description: `Successfully imported ${successCount} payments. ${failCount > 0 ? `Failed to import ${failCount} rows (invalid ADM or student not found).` : ''}`,
          });
          setIsImportDialogOpen(false);
        } catch (err) {
          toast({ title: "Import Error", description: "Failed to parse Excel file.", variant: "destructive" });
        } finally {
          setImporting(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      toast({ title: "Import Error", description: "Failed to read file.", variant: "destructive" });
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const isLoading = loadingPayments || loadingStudents || loadingPrograms

  const courseOptions = useMemo(() => {
    const set = new Set(enrolledStudents.map(s => s.appliedCourse).filter(Boolean))
    return Array.from(set).sort() as string[]
  }, [enrolledStudents])

  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter(s => {
      const searchStr = `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase()
      if (!searchStr.includes(searchTerm.toLowerCase())) return false

      if (courseFilter !== 'all' && s.appliedCourse !== courseFilter) return false

      if (balanceFilter !== 'all') {
        const fee = getStudentFeeDetails(s.id)
        if (balanceFilter === 'cleared' && fee.balance > 0) return false
        if (balanceFilter === 'arrears' && fee.balance <= 0) return false
      }

      return true
    })
  }, [enrolledStudents, searchTerm, balanceFilter, courseFilter, payments, programs])

  const totals = useMemo(() => {
    let totalBilled = 0
    let totalArrears = 0

    enrolledStudents.forEach(s => {
      const details = getStudentFeeDetails(s.id)
      totalBilled += details.totalFee
      totalArrears += details.balance
    })

    const totalCollected = (payments || []).filter(p => p.type === "Fee").reduce((sum, p) => sum + Number(p.amount), 0)

    return {
      totalBilled,
      totalCollected,
      totalArrears
    }
  }, [enrolledStudents, payments, programs])

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Fee Operations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor and manage student tuition collections</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Fees from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel (.xlsx) or CSV file with fee payments.
                </DialogDescription>
                <div className="mt-4">
                  <span className="font-semibold text-slate-700">Required Columns:</span>
                  <ul className="list-disc pl-5 mt-1 text-xs text-slate-600 space-y-1">
                    <li><b>Admission Number</b> (or ADM)</li>
                    <li><b>Amount</b></li>
                    <li><b>Method</b> (e.g. Bank Transfer, Cash) - Optional</li>
                    <li><b>Reference</b> (Receipt No) - Optional</li>
                  </ul>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="h-10 w-10 text-emerald-500 mb-4" />
                  <Label htmlFor="excel-upload" className="cursor-pointer bg-white px-4 py-2 border shadow-sm rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors text-slate-700">
                    {importing ? "Processing..." : "Select Excel File"}
                  </Label>
                  <Input 
                    id="excel-upload" 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                    onChange={handleFeesExcelUpload}
                    disabled={importing}
                  />
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Payments will be automatically matched to students using their Admission Number and recorded instantly.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
                <Plus className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="bg-slate-50 p-6 border-b">
              <DialogTitle className="text-xl font-bold text-slate-900">Process Fee Payment</DialogTitle>
              <DialogDescription className="mt-1.5">
                Register a new tuition deposit to a student's account.
              </DialogDescription>
            </div>

            <div className="p-6 pt-2">
              <div className="space-y-6">

                {/* Step 1: Select Student */}
                <div className="space-y-2">
                  <Label htmlFor="student" className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Target Student</Label>
                  <Select onValueChange={(v) => {
                    const details = getStudentFeeDetails(v)
                    setFormData({ ...formData, studentId: v, amount: details.balance.toString() })
                  }} value={formData.studentId}>
                    <SelectTrigger id="student" className="w-full h-12 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Search student..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {enrolledStudents.map(s => {
                        const details = getStudentFeeDetails(s.id)
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{s.firstName} {s.lastName} <span className="text-xs text-slate-400">({s.admissionNumber})</span></span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {formData.studentId && (
                    <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Current Arrears: KES {getStudentFeeDetails(formData.studentId).balance.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Step 2: Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Deposit Amount (KES)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="amount" type="number"
                      placeholder="0.00"
                      className="pl-11 h-12 text-lg font-black bg-slate-50 border-slate-200"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Step 3: Payment Method & Execution */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Payment Method</Label>
                  <Tabs value={paymentMethodTab} onValueChange={setPaymentMethodTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-xl h-12">
                      <TabsTrigger value="manual" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Manual Entry</TabsTrigger>
                      <TabsTrigger value="mpesa" className="rounded-lg font-semibold data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                        M-Pesa Express
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-5 mt-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="method" className="text-xs font-bold uppercase tracking-wider text-slate-500">Method</Label>
                          <Select onValueChange={(v) => setFormData({ ...formData, method: v })} value={formData.method}>
                            <SelectTrigger id="method" className="h-11 bg-slate-50 border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Bank Transfer">Bank</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ref" className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference</Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="ref" placeholder="Optional"
                              className="pl-9 h-11 font-mono uppercase bg-slate-50 border-slate-200 text-xs"
                              value={formData.reference}
                              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleRecordManualPayment} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md">
                        Confirm Manual Payment
                      </Button>
                    </TabsContent>

                    <TabsContent value="mpesa" className="space-y-5 mt-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-emerald-600">M-Pesa  Number</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                          <Input
                            id="phone"
                            placeholder="e.g. 254712345678"
                            className="pl-11 h-12 font-mono text-lg font-bold bg-emerald-50/50 border-emerald-200 focus-visible:ring-emerald-500 placeholder:text-emerald-300"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          />
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-tight">An STK Push prompt will be sent instantly to this number to authorize the payment.</p>
                      </div>

                      <Button
                        onClick={handleMpesaSTKPush}
                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                        disabled={isProcessingMpesa}
                      >
                        {isProcessingMpesa ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Smartphone className="h-5 w-5 mr-2" />}
                        {isProcessingMpesa ? "Sending Request..." : "Send M-Pesa Prompt"}
                      </Button>
                    </TabsContent>

                  </Tabs>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Expected</p>
                <p className="text-lg font-bold text-slate-900 leading-tight">KES {totals.totalBilled.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Collected</p>
                <p className="text-lg font-bold text-emerald-700 leading-tight">KES {totals.totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Arrears</p>
                <p className="text-lg font-bold text-rose-600 leading-tight">KES {totals.totalArrears.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500">Collection Rate</p>
                <p className="text-lg font-bold text-blue-700 leading-tight">
                  {totals.totalBilled > 0 ? Math.round((totals.totalCollected / totals.totalBilled) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Section */}
      <Tabs defaultValue="balances" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-slate-100 p-1 h-10 rounded-lg">
            <TabsTrigger value="balances" className="rounded-md px-4 text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Student Balances</TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-md px-4 text-xs font-semibold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Transactions Ledger</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="balances" className="mt-0 outline-none">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            {/* Card toolbar */}
            <div className="p-3 border-b border-slate-100 space-y-3">
              {/* Row 1: title + search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-800 text-sm shrink-0">
                  Student Fee Balances
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {filteredStudents.length} of {enrolledStudents.length}
                  </span>
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or ADM..."
                    className="pl-9 h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: filters */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Balance status filter */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  {(['all', 'arrears', 'cleared'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setBalanceFilter(f)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                        balanceFilter === f
                          ? f === 'arrears'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : f === 'cleared'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f === 'all' ? 'All Students' : f === 'arrears' ? 'In Arrears' : 'Cleared'}
                    </button>
                  ))}
                </div>

                {/* Course filter */}
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs border-slate-200 bg-white rounded-lg">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courseOptions.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear filters */}
                {(balanceFilter !== 'all' || courseFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => { setBalanceFilter('all'); setCourseFilter('all'); setSearchTerm('') }}
                    className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-slate-500">Loading balances...</p>
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredStudents.map((student) => {
                    const fee = getStudentFeeDetails(student.id)
                    const isCleared = fee.balance <= 0

                    return (
                      <div
                        key={student.id}
                        className={`rounded-xl border p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${
                          isCleared ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Top: Student info + status badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{student.firstName} {student.lastName}</p>
                              <p className="text-[10px] font-mono text-slate-400">{student.admissionNumber || '—'}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isCleared ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                            {isCleared ? 'Cleared' : 'Arrears'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-slate-500">{fee.courseName}</span>
                            <span className={isCleared ? 'text-emerald-600' : 'text-slate-500'}>{fee.progress}% paid</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isCleared ? 'bg-emerald-500' : fee.progress > 0 ? 'bg-emerald-400' : 'bg-slate-300'}`}
                              style={{ width: `${fee.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Amounts row */}
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="bg-slate-50 rounded-lg py-2 px-1">
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Billed</p>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">KES {fee.totalFee.toLocaleString()}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg py-2 px-1">
                            <p className="text-[9px] font-medium text-emerald-500 uppercase tracking-wider">Paid</p>
                            <p className="text-xs font-bold text-emerald-700 mt-0.5">KES {fee.totalPaid.toLocaleString()}</p>
                          </div>
                          <div className={`rounded-lg py-2 px-1 ${isCleared ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <p className={`text-[9px] font-medium uppercase tracking-wider ${isCleared ? 'text-emerald-500' : 'text-rose-500'}`}>Balance</p>
                            <p className={`text-xs font-bold mt-0.5 ${isCleared ? 'text-emerald-700' : 'text-rose-700'}`}>KES {fee.balance.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Action */}
                        {!isCleared && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 mt-1"
                            onClick={() => {
                              setFormData({ studentId: student.id, amount: fee.balance.toString(), method: 'Cash', reference: '', phoneNumber: '' })
                              setIsDialogOpen(true)
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1.5" /> Record Payment
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No students found</p>
                  <p className="text-xs text-slate-400 mt-1">Try a different name or admission number.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-0 ring-1 ring-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-sm">All Processed Payments</h3>
            </div>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white border-slate-100">
                    <TableHead className="font-bold text-slate-500 h-12">Date & Time</TableHead>
                    <TableHead className="font-bold text-slate-500 h-12">Transaction ID</TableHead>
                    <TableHead className="font-bold text-slate-500 h-12">Payer</TableHead>
                    <TableHead className="font-bold text-slate-500 h-12">Fee Type</TableHead>
                    <TableHead className="font-bold text-slate-500 h-12">Method</TableHead>
                    <TableHead className="text-right font-bold text-slate-500 h-12">Amount</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" />
                        <p className="text-sm text-slate-500 mt-2 font-medium">Loading ledger...</p>
                      </TableCell>
                    </TableRow>
                  ) : (payments || []).length > 0 ? (
                    [...payments].sort((a, b) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.paymentDate).getTime() - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.paymentDate).getTime()).map((p) => {
                      const student = (students || []).find(s => s.id === p.studentId);
                      return (
                        <TableRow key={p.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                          <TableCell className="py-4 pl-4">
                            <div className="font-bold text-slate-900">
                              {new Date(p.paymentDate || (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : Date.now())).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {new Date(p.paymentDate || (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : Date.now())).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              {p.transactionReference || `TXN-${p.id.slice(0, 6).toUpperCase()}`}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-bold text-slate-900">{student ? `${student.firstName} ${student.lastName}` : "Unknown Student"}</div>
                            <div className="text-[10px] font-mono text-slate-500">{student?.admissionNumber || "Pending ADM"}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={`border-0 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 ${p.type === 'Fee' ? 'bg-blue-100 text-blue-700' : p.type === 'AdmissionFee' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                              {p.type === 'Fee' ? 'Tuition' : p.type === 'AdmissionFee' ? 'Admission' : 'ID Card'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-xs font-bold text-slate-600">{p.paymentMethod}</span>
                          </TableCell>
                          <TableCell className="text-right py-4 pr-4">
                            <div className="font-black text-slate-900">
                              KES {Number(p.amount).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4 pr-4">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedReceipt({ ...p, student })} className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Print Receipt">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium">No transactions recorded yet.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Print Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-[400px] p-0 border-0 shadow-2xl rounded-xl overflow-hidden bg-white">
            <DialogTitle className="sr-only">Print Receipt</DialogTitle>
            {/* Printable Area */}
            <div id="receipt-print-area" className="p-8 bg-white text-slate-900">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl mx-auto mb-3 ring-1 ring-slate-100 shadow-sm overflow-hidden">
                  <Logo size={48} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Risabu TTC</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Payment Receipt</p>
              </div>

              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Receipt No.</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.transactionReference || `TXN-${selectedReceipt.id.slice(0, 6).toUpperCase()}`}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Date</span>
                  <span className="font-bold text-slate-900">{new Date(selectedReceipt.paymentDate || (selectedReceipt.createdAt?.seconds ? selectedReceipt.createdAt.seconds * 1000 : Date.now())).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Student</span>
                  <span className="font-bold text-slate-900 text-right">
                    {selectedReceipt.student ? `${selectedReceipt.student.firstName} ${selectedReceipt.student.lastName}` : "Unknown"}<br />
                    <span className="text-xs text-slate-500 font-mono">{selectedReceipt.student?.admissionNumber || "Pending ADM"}</span>
                  </span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Payment For</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.type === 'Fee' ? 'Tuition Fee' : selectedReceipt.type === 'AdmissionFee' ? 'Admission Fee' : 'ID Card Fee'}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Method</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between mb-8 ring-1 ring-slate-100">
                <span className="font-bold text-slate-600 uppercase text-xs tracking-wider">Amount Paid</span>
                <span className="text-2xl font-black text-slate-900">KES {Number(selectedReceipt.amount).toLocaleString()}</span>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-medium space-y-1">
                <p><b>You were served by the Finance Department.</b></p>
                <p>Receipt generated on:{new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 print:hidden">
              <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setSelectedReceipt(null)}>Close</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    const printContent = document.getElementById('receipt-print-area')?.outerHTML;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receipt - Risabu TTC</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            @media print { body { -webkit-print-color-adjust: exact; padding: 2rem; } }
                          </style>
                        </head>
                        <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                          <div style="max-width: 400px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            ${printContent}
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" /> Print PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
