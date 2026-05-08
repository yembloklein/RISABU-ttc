"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, CreditCard, Receipt, ArrowRight, Download, ShieldCheck, Landmark, Plus, Loader2, Smartphone, CheckCircle2, Info, Package, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { addDoc, serverTimestamp } from "firebase/firestore"
import { useRef, useState } from "react"
import { FinancialStatement } from "@/components/financial-statement"
import { PaymentReceipt } from "@/components/payment-receipt"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
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

  const statementRef = useRef<HTMLDivElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<any>(null)

  const downloadStatement = async () => {
    if (!statementRef.current) return
    setIsGenerating(true)
    try {
      const canvas = await html2canvas(statementRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`Fee_Statement_${student.firstName}.pdf`)
      toast({ title: "Success", description: "Statement downloaded successfully." })
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate statement.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReceipt = async (payment: any) => {
    setActiveReceipt(payment)
    setIsGenerating(true)
    // Small delay to ensure state update renders the hidden component
    setTimeout(async () => {
      if (!receiptRef.current) return
      try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`Receipt_${payment.transactionReference}.pdf`)
      } catch (e) {
        toast({ title: "Error", description: "Failed to generate receipt.", variant: "destructive" })
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

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
          <Button size="sm" variant="outline" className="font-semibold" onClick={downloadStatement} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download Statement
          </Button>
          <Button size="sm" variant="outline" className="font-semibold">
            <Download className="h-4 w-4 mr-2" /> Fee Structure
          </Button>
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
                <th className="h-10 w-10"></th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPaymentsLoading || isInvoicesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">Syncing Ledger...</TableCell>
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
                    <TableCell className="text-right pr-6 py-4">
                      {item.ledgerType === 'payment' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                          onClick={() => downloadReceipt(item)}
                          disabled={isGenerating}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 text-sm">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hidden Components for PDF Capture */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <FinancialStatement ref={statementRef} student={student} ledger={ledger} stats={feeStats} />
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} />
        )}
      </div>
    </div>
  );
}
