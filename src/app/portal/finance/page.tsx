"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Wallet, CreditCard, Receipt, Download, Landmark, Loader2,
  CheckCircle2, AlertCircle, Smartphone, ArrowUpRight, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { FinancialStatement } from "@/components/financial-statement"
import { PaymentReceipt } from "@/components/payment-receipt"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { useToast } from "@/hooks/use-toast"

export default function FinancePage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  const { data: programsData } = useCollection(programQuery)
  const program = programsData?.[0]

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: paymentsRaw, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)

  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "invoices"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: invoicesRaw, isLoading: isInvoicesLoading } = useCollection(invoicesQuery)

  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])
  const { data: schoolDocs } = useCollection(schoolDocsQuery)
  const officialFeeStructure = useMemo(() => schoolDocs?.find(d => d.type === "official_fee_structure"), [schoolDocs])

  const ledger = useMemo(() => {
    const combined: any[] = []
    if (paymentsRaw) paymentsRaw.forEach(p => combined.push({
      ...p, ledgerType: 'payment',
      date: p.paymentDate ? new Date(p.paymentDate) : (p.createdAt?.toDate?.() || new Date()),
      sortDate: p.paymentDate ? new Date(p.paymentDate).getTime() : (p.createdAt?.toMillis?.() || Date.now())
    }))
    if (invoicesRaw) invoicesRaw.forEach(i => combined.push({
      ...i, ledgerType: 'invoice',
      date: i.invoiceDate ? new Date(i.invoiceDate) : (i.createdAt?.toDate?.() || new Date()),
      sortDate: i.invoiceDate ? new Date(i.invoiceDate).getTime() : (i.createdAt?.toMillis?.() || Date.now())
    }))
    return combined.sort((a, b) => b.sortDate - a.sortDate)
  }, [paymentsRaw, invoicesRaw])

  const feeStats = useMemo(() => {
    const totalInvoiced = program ? Number(program.tuitionFee) : 0
    const totalPaid = (paymentsRaw || []).filter(p => p.type === "Fee").reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, totalInvoiced - totalPaid)
    const percentage = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 0
    return { totalInvoiced, totalPaid, balance, percentage }
  }, [program, paymentsRaw])

  const statementRef = useRef<HTMLDivElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<any>(null)

  const downloadStatement = async () => {
    if (!statementRef.current) return
    setIsGenerating(true)
    try {
      const canvas = await html2canvas(statementRef.current, { scale: 2, useCORS: true })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
      pdf.save(`Fee_Statement_${student.firstName}.pdf`)
      toast({ title: "Downloaded", description: "Your statement has been saved." })
    } catch {
      toast({ title: "Error", description: "Failed to generate statement.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReceipt = async (payment: any) => {
    setActiveReceipt(payment)
    setIsGenerating(true)
    setTimeout(async () => {
      if (!receiptRef.current) return
      try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true })
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
        pdf.save(`Receipt_${payment.transactionReference || payment.id}.pdf`)
      } catch {
        toast({ title: "Error", description: "Failed to generate receipt.", variant: "destructive" })
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

  if (isStudentLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your finance details...</p>
      </div>
    )
  }

  const isCleared = feeStats.balance <= 0

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <Wallet className="h-6 w-6 text-emerald-600" />
            Finance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your tuition fees and payment history.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {officialFeeStructure && (
            <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
              <a href={officialFeeStructure.downloadURL} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Fee Structure
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={downloadStatement} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Download Statement
          </Button>
        </div>
      </div>

      {/* Fee summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-slate-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">Total Billed</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">KES {feeStats.totalInvoiced.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{program?.durationMonths || '—'} month programme</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">Total Paid</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">KES {feeStats.totalPaid.toLocaleString()}</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${feeStats.percentage}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{feeStats.percentage}% of total fee</p>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm rounded-xl ${isCleared ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isCleared ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                {isCleared
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 text-rose-600" />
                }
              </div>
              <p className="text-xs font-medium text-slate-500">Balance Due</p>
            </div>
            <p className={`text-2xl font-bold ${isCleared ? 'text-emerald-600' : 'text-rose-600'}`}>
              KES {feeStats.balance.toLocaleString()}
            </p>
            <p className={`text-xs mt-0.5 ${isCleared ? 'text-emerald-600' : 'text-rose-500'}`}>
              {isCleared ? '✓ Fully cleared' : 'Outstanding balance'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Transaction ledger */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Payment Statement</h2>
            </div>

            {(isPaymentsLoading || isInvoicesLoading) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : ledger.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {ledger.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      item.ledgerType === 'payment' ? 'bg-emerald-50' : 'bg-rose-50'
                    }`}>
                      {item.ledgerType === 'payment'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <AlertCircle className="h-4 w-4 text-rose-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.description || (item.ledgerType === 'invoice' ? "Tuition Fee Charge" : "Fee Payment")}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.transactionReference || item.invoiceNumber || "—"}
                        </span>
                        {item.paymentMethod && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] text-slate-400">{item.paymentMethod}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-bold ${item.ledgerType === 'payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.ledgerType === 'payment' ? '+' : '-'} KES {Number(item.amount).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.date ? formatDistanceToNow(item.date, { addSuffix: true }) : "—"}
                        </p>
                      </div>
                      {item.ledgerType === 'payment' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 shrink-0"
                          onClick={() => downloadReceipt(item)}
                          disabled={isGenerating}
                          title="Download Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14">
                <CreditCard className="h-7 w-7 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No transactions recorded yet.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: payment info */}
        <div className="space-y-4">
          {/* Bank details card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Payment Details</h2>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Landmark className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Equity Bank</p>
                  <p className="text-xs font-mono text-slate-900 mt-0.5">1234567890123</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Nairobi West Branch</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700">M-Pesa Paybill</p>
                  <p className="text-lg font-bold text-slate-900">522522</p>
                  <p className="text-[10px] text-slate-400">Account: {student?.admissionNumber || "Your ADM No."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance status */}
          <Card className={`border shadow-sm rounded-xl overflow-hidden ${isCleared ? 'border-emerald-200' : 'border-amber-200'}`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${isCleared ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isCleared
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Fee Fully Cleared</>
                  : <><AlertCircle className="h-3.5 w-3.5" /> Balance Pending</>
                }
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${isCleared ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  style={{ width: `${feeStats.percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {feeStats.percentage}% paid · KES {feeStats.balance.toLocaleString()} remaining
              </p>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 px-1">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              After payment, share your receipt with the Finance Office for manual confirmation. Receipts can be downloaded from each transaction row.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden PDF components */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <FinancialStatement ref={statementRef} student={student} ledger={ledger} stats={feeStats} />
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} />
        )}
      </div>
    </div>
  )
}
