"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useState, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText, Loader2, Download, Receipt, FileCheck2,
  Briefcase, GraduationCap, ArrowRight, ScrollText, BarChart3
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { PaymentReceipt } from "@/components/documents/payment-receipt"
import { ExamPass } from "@/components/documents/exam-pass"
import { InternshipLetter } from "@/components/documents/internship-letter"
import { AdmissionLetter } from "@/components/documents/admission-letter"
import { FinancialStatement } from "@/components/documents/financial-statement"

export default function DocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  // Student record
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // Official school documents (templates)
  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])
  const { data: schoolDocs } = useCollection(schoolDocsQuery)

  // Student-specific uploaded documents (e.g. official admission letter from registrar)
  const studentDocsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "student_documents"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: studentDocs } = useCollection(studentDocsQuery)

  // Payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: payments, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)

  // Invoices
  const invoicesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "invoices"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesQuery)

  // Program (for tuition fee + exam pass)
  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  const { data: programsData, isLoading: isProgramLoading } = useCollection(programQuery)
  const program = programsData?.[0]

  // Ref targets for PDF generation
  const [activeReceipt, setActiveReceipt] = useState<any>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const examPassRef = useRef<HTMLDivElement>(null)
  const internshipLetterRef = useRef<HTMLDivElement>(null)
  const admissionLetterRef = useRef<HTMLDivElement>(null)
  const financialStatementRef = useRef<HTMLDivElement>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingExamPass, setIsGeneratingExamPass] = useState(false)
  const [isGeneratingInternship, setIsGeneratingInternship] = useState(false)
  const [isGeneratingAdmission, setIsGeneratingAdmission] = useState(false)
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false)

  // ── Fee stats ────────────────────────────────────────────────────────────────
  const feeStats = useMemo(() => {
    const totalInvoiced = program ? Number(program.tuitionFee) : 0
    const totalPaid = (payments || [])
      .filter(p => p.type === "Fee")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, totalInvoiced - totalPaid)
    return { totalInvoiced, totalPaid, balance, isCleared: balance <= 0 }
  }, [program, payments])

  // ── Ledger for financial statement ──────────────────────────────────────────
  const ledger = useMemo(() => {
    const inv = (invoices || []).map(i => ({
      ...i,
      ledgerType: "invoice",
      date: i.issueDate || i.createdAt?.toDate?.()?.toISOString?.() || null,
      sortDate: i.createdAt?.seconds || 0,
    }))
    const pay = (payments || []).map(p => ({
      ...p,
      ledgerType: "payment",
      date: p.paymentDate || p.createdAt?.toDate?.()?.toISOString?.() || null,
      sortDate: p.createdAt?.seconds || 0,
    }))
    return [...inv, ...pay]
  }, [invoices, payments])

  // ── PDF helpers ──────────────────────────────────────────────────────────────
  const generatePdf = async (
    ref: React.RefObject<HTMLDivElement>,
    filename: string,
    setLoading: (v: boolean) => void,
    setup?: () => void
  ) => {
    setup?.()
    setLoading(true)
    setTimeout(async () => {
      if (!ref.current) { setLoading(false); return }
      try {
        const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true })
        const pdf = new jsPDF("p", "mm", "a4")
        const imgWidth = 210
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
        pdf.save(filename)
        toast({ title: "Success", description: `${filename.split("_")[0].replace(/_/g, " ")} generated.` })
      } catch {
        toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }, 150)
  }

  const downloadReceipt = async (payment: any) => {
    setActiveReceipt(payment)
    setIsGenerating(true)
    setTimeout(async () => {
      if (!receiptRef.current) return
      try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true })
        const pdf = new jsPDF("p", "mm", "a4")
        const imgWidth = 210
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
        pdf.save(`Receipt_${payment.transactionReference || payment.id}.pdf`)
        toast({ title: "Success", description: "Receipt downloaded." })
      } catch {
        toast({ title: "Error", description: "Failed to generate receipt.", variant: "destructive" })
      } finally {
        setIsGenerating(false)
        setActiveReceipt(null)
      }
    }, 100)
  }

  // Templates
  const paymentReceiptTemplate = schoolDocs?.find(d => d.type === "official_payment_receipt")?.downloadURL
  const examPassTemplate = schoolDocs?.find(d => d.type === "official_exam_pass")?.downloadURL
  const internshipTemplate = schoolDocs?.find(d => d.type === "official_internship_letter")?.downloadURL
  const feeStructureTemplate = schoolDocs?.find(d => d.type === "official_fee_structure")?.downloadURL

  // Admission letter URL — same priority order as the dashboard
  const studentSpecificOfficialLetter = studentDocs?.find(d => d.category === "admission_letter" && d.isOfficial === true)
  const customAdmissionLetter = studentDocs?.find(d => d.category === "admission_letter")
  const officialAdmissionLetter = schoolDocs?.find(d => d.type === "official_admission_letter")
  const admissionLetterUrl =
    studentSpecificOfficialLetter?.downloadURL ||
    customAdmissionLetter?.downloadURL ||
    officialAdmissionLetter?.downloadURL

  if (isStudentLoading || isProgramLoading || isPaymentsLoading || isInvoicesLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Syncing documents...</p>
      </div>
    )
  }

  // ── On-demand document cards ─────────────────────────────────────────────────
  const onDemandDocs = [
    {
      title: "Admission Letter",
      desc: "Official letter confirming your enrolment at Risabu TTC.",
      icon: ScrollText,
      color: "bg-emerald-50 text-emerald-600",
      btnColor: "text-emerald-600 hover:bg-emerald-50",
      loading: isGeneratingAdmission,
      locked: false,
      action: () => generatePdf(
        admissionLetterRef,
        `Admission_Letter_${student?.admissionNumber?.replace(/\//g, "_") || "Student"}.pdf`,
        setIsGeneratingAdmission
      ),
    },
    {
      title: "Examination Pass",
      desc: feeStats.isCleared
        ? "Required for entry into examination rooms."
        : `Locked — Fee clearance required. Balance: KES ${feeStats.balance.toLocaleString()}`,
      icon: GraduationCap,
      color: feeStats.isCleared ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-500",
      btnColor: feeStats.isCleared ? "text-blue-600 hover:bg-blue-50" : "text-rose-500 hover:bg-rose-50",
      loading: isGeneratingExamPass,
      locked: !feeStats.isCleared,
      action: () => generatePdf(
        examPassRef,
        `Exam_Pass_${student?.admissionNumber?.replace(/\//g, "_") || "Student"}.pdf`,
        setIsGeneratingExamPass
      ),
    },
    {
      title: "Internship Request",
      desc: "Official letter for industrial attachment placement.",
      icon: Briefcase,
      color: "bg-indigo-50 text-indigo-600",
      btnColor: "text-indigo-600 hover:bg-indigo-50",
      loading: isGeneratingInternship,
      locked: false,
      action: () => generatePdf(
        internshipLetterRef,
        `Internship_Letter_${student?.admissionNumber?.replace(/\//g, "_") || "Student"}.pdf`,
        setIsGeneratingInternship
      ),
    },
    {
      title: "Fee Statement",
      desc: "Full financial ledger showing all charges and payments to date.",
      icon: BarChart3,
      color: "bg-orange-50 text-orange-600",
      btnColor: "text-orange-600 hover:bg-orange-50",
      loading: isGeneratingStatement,
      locked: false,
      action: () => generatePdf(
        financialStatementRef,
        `Fee_Statement_${student?.admissionNumber?.replace(/\//g, "_") || "Student"}.pdf`,
        setIsGeneratingStatement
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <FileText className="h-6 w-6 text-emerald-600" />
          Document Centre
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Access and download your official institutional documents.
        </p>
      </div>

      <div className="max-w-4xl space-y-8">

        {/* On-Demand Documents */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <FileCheck2 className="h-3.5 w-3.5" /> On-Demand Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onDemandDocs.map((doc, i) => (
              <Card
                key={i}
                className={`border shadow-sm rounded-xl overflow-hidden transition-colors ${
                  doc.locked ? "border-rose-100 bg-rose-50/10" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${doc.color}`}>
                      <doc.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                        {doc.locked && (
                          <Badge variant="destructive" className="h-4 px-1.5 text-[9px] uppercase tracking-wider font-extrabold bg-rose-600 text-white rounded-full">
                            Locked
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${doc.locked ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
                        {doc.desc}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`mt-3 h-8 px-2 text-xs font-bold ${doc.btnColor}`}
                        onClick={doc.action}
                        disabled={doc.loading || doc.locked}
                      >
                        {doc.loading
                          ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          : <Download className="h-3 w-3 mr-1.5" />}
                        {doc.locked ? "Fee Clearance Required" : "Generate PDF"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Payment Receipts */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5" /> Recent Payment Receipts
          </h2>
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            {isPaymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : (payments || []).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {payments!.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {p.description || "Fee Payment"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                        REF: {p.transactionReference || p.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">KES {Number(p.amount).toLocaleString()}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 mt-0.5"
                        onClick={() => downloadReceipt(p)}
                        disabled={isGenerating && activeReceipt?.id === p.id}
                      >
                        {isGenerating && activeReceipt?.id === p.id
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <Download className="h-3 w-3 mr-1" />}
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 bg-slate-50/50">
                  <Button variant="link" className="h-auto p-0 text-xs text-slate-500 hover:text-emerald-600 font-medium" asChild>
                    <a href="/portal/finance">View all financial records <ArrowRight className="h-3 w-3 ml-1" /></a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-7 w-7 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No payment receipts found.</p>
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Hidden PDF render targets */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} templateImageUrl={paymentReceiptTemplate} />
        )}
        {student && (
          <AdmissionLetter
            ref={admissionLetterRef}
            student={student}
            program={program || { name: student.appliedCourse, code: "RTTC-01" }}
            templateImageUrl={admissionLetterUrl}
          />
        )}
        {student && (
          <ExamPass ref={examPassRef} student={student} program={{ name: student.appliedCourse, code: "RTTC-01" }} templateImageUrl={feeStructureTemplate || examPassTemplate} />
        )}
        {student && (
          <InternshipLetter ref={internshipLetterRef} student={student} program={{ name: student.appliedCourse, code: "RTTC-01" }} templateImageUrl={internshipTemplate} />
        )}
        {student && (
          <FinancialStatement ref={financialStatementRef} student={student} ledger={ledger} stats={feeStats} />
        )}
      </div>
    </div>
  )
}
