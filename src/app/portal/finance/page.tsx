"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, CreditCard, Receipt, ArrowRight, Download, ShieldCheck, Landmark, Plus, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function FinancePage() {
  const { user } = useUser()
  const firestore = useFirestore()

  // 1. Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]
  const { toast } = useToast()

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 2. Fetch Program Data (for fees)
  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  
  const { data: programsData } = useCollection(programQuery)
  const program = programsData?.[0]

  // 3. Fetch Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: paymentsRaw, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)

  // 4. Fetch Invoices
  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "invoices"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: invoicesRaw, isLoading: isInvoicesLoading } = useCollection(invoicesQuery)
  
  // Combine into a chronological ledger
  const ledger = useMemo(() => {
    const combined: any[] = []
    
    if (paymentsRaw) {
      paymentsRaw.forEach(p => combined.push({
        ...p,
        ledgerType: 'payment',
        date: p.paymentDate ? new Date(p.paymentDate) : (p.createdAt?.toDate?.() || new Date()),
        sortDate: p.paymentDate ? new Date(p.paymentDate).getTime() : (p.createdAt?.toMillis?.() || Date.now())
      }))
    }

    if (invoicesRaw) {
      invoicesRaw.forEach(i => combined.push({
        ...i,
        ledgerType: 'invoice',
        date: i.invoiceDate ? new Date(i.invoiceDate) : (i.createdAt?.toDate?.() || new Date()),
        sortDate: i.invoiceDate ? new Date(i.invoiceDate).getTime() : (i.createdAt?.toMillis?.() || Date.now())
      }))
    }

    return combined.sort((a, b) => b.sortDate - a.sortDate)
  }, [paymentsRaw, invoicesRaw])

  const feeStats = useMemo(() => {
    const totalInvoiced = (invoicesRaw || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    const totalPaid = (paymentsRaw || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, totalInvoiced - totalPaid)
    const percentage = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 0

    return { totalInvoiced, totalPaid, balance, percentage }
  }, [invoicesRaw, paymentsRaw])

  if (isStudentLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Finance</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your tuition fees and track payment history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" className="font-semibold">
            <Download className="h-4 w-4 mr-2" /> Fee Structure
          </Button>
          <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                <CreditCard className="h-4 w-4 mr-2" /> Pay with M-Pesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>M-Pesa Payment</DialogTitle>
                <DialogDescription>
                  Enter the amount you wish to pay. A simulation push will be sent to your registered phone number.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g. 5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 font-medium">
                    This is a secure simulation. In production, this would trigger an STK Push to {student?.contactPhone || "your phone"}.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    if (!paymentAmount || isNaN(Number(paymentAmount))) return
                    setIsSubmitting(true)
                    try {
                      await addDoc(collection(firestore, "payments"), {
                        studentId: student?.id,
                        studentName: `${student?.firstName} ${student?.lastName}`,
                        amount: Number(paymentAmount),
                        paymentDate: new Date().toISOString(),
                        type: "Fee",
                        description: "M-Pesa Mobile Payment",
                        transactionReference: "SIM-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                        status: "Completed",
                        createdAt: serverTimestamp()
                      })
                      toast({
                        title: "Payment Received",
                        description: `KES ${Number(paymentAmount).toLocaleString()} has been added to your ledger.`,
                      })
                      setIsPaymentOpen(false)
                      setPaymentAmount("")
                    } catch (e) {
                      toast({
                        title: "Payment Failed",
                        description: "Could not process simulation. Please try again.",
                        variant: "destructive"
                      })
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting || !paymentAmount}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4 px-6">
            <CardTitle className="text-base font-bold text-slate-900">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Billed</p>
                  <p className="text-2xl font-bold text-slate-900">KES {feeStats.totalInvoiced.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-600">KES {feeStats.totalPaid.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Balance</p>
                  <p className="text-2xl font-bold text-rose-600">KES {feeStats.balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                  <span>Balance Coverage</span>
                  <span>{feeStats.percentage}%</span>
                </div>
                <Progress value={feeStats.percentage} className="h-2 bg-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Bank Accounts</h2>
          <Card className="border shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Equity Bank</p>
                <p className="text-sm font-mono font-bold text-slate-900">1234567890123</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Nairobi West Branch</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">M-Pesa Paybill</p>
                <p className="text-sm font-bold text-slate-900">522522</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Acc: [Adm Number]</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-4 px-6">
          <CardTitle className="text-base font-bold text-slate-900">Payment Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10 pl-6">Date</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10">Description</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-10">Reference</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500 h-10 pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPaymentsLoading || isInvoicesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Syncing Ledger...</TableCell>
                </TableRow>
              ) : ledger && ledger.length > 0 ? (
                ledger.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="pl-6 py-4 text-sm font-medium text-slate-600">
                      {item.date ? item.date.toLocaleDateString() : "Pending"}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{item.description || (item.ledgerType === 'invoice' ? "Tuition Fee Charge" : "Fee Payment")}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 font-bold uppercase ${item.ledgerType === 'invoice' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                            {item.ledgerType}
                          </Badge>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">{item.type}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.transactionReference || item.invoiceNumber || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <span className={`text-sm font-bold ${item.ledgerType === 'invoice' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.ledgerType === 'invoice' ? '-' : '+'} KES {Number(item.amount).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500 text-sm">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
