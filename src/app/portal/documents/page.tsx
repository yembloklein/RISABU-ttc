"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useState, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Loader2,
  Download,
  FileBadge,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Calendar,
  ArrowRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { PaymentReceipt } from "@/components/documents/payment-receipt"
import { ExamPass } from "@/components/documents/exam-pass"
import { InternshipLetter } from "@/components/documents/internship-letter"

export default function DocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  // Fetch student record
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // Fetch School (Official) Documents
  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])
  const { data: schoolDocs } = useCollection(schoolDocsQuery)

  // Fetch payments for Receipts
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: payments, isLoading: isPaymentsLoading } = useCollection(paymentsQuery)

  // Fetch programs to calculate tuition fee balance
  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  const { data: programsData, isLoading: isProgramLoading } = useCollection(programQuery)
  const program = programsData?.[0]

  const [activeReceipt, setActiveReceipt] = useState<any>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const examPassRef = useRef<HTMLDivElement>(null)
  const internshipLetterRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingExamPass, setIsGeneratingExamPass] = useState(false)
  const [isGeneratingInternship, setIsGeneratingInternship] = useState(false)

  const downloadDynamicReceipt = async (payment: any) => {
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
        toast({ title: "Success", description: "Receipt generated successfully." })
      } catch {
        toast({ title: "Error", description: "Failed to generate receipt PDF.", variant: "destructive" })
      } finally {
        setIsGenerating(false)
        setActiveReceipt(null)
      }
    }, 100)
  }

  const generateExamPass = async () => {
    setIsGeneratingExamPass(true)
    setTimeout(async () => {
      if (!examPassRef.current) return
      try {
        const canvas = await html2canvas(examPassRef.current, { scale: 2, useCORS: true })
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
        pdf.save(`Exam_Pass_${student?.admissionNumber?.replace(/\//g, '_') || 'Student'}.pdf`)
        toast({ title: "Success", description: "Examination Pass generated." })
      } catch {
        toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" })
      } finally {
        setIsGeneratingExamPass(false)
      }
    }, 100)
  }

  const generateInternshipLetter = async () => {
    setIsGeneratingInternship(true)
    setTimeout(async () => {
      if (!internshipLetterRef.current) return
      try {
        const canvas = await html2canvas(internshipLetterRef.current, { scale: 2, useCORS: true })
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width)
        pdf.save(`Internship_Letter_${student?.admissionNumber?.replace(/\//g, '_') || 'Student'}.pdf`)
        toast({ title: "Success", description: "Internship Letter generated." })
      } catch {
        toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" })
      } finally {
        setIsGeneratingInternship(false)
      }
    }, 100)
  }

  const feeStats = useMemo(() => {
    const totalInvoiced = program ? Number(program.tuitionFee) : 0
    const totalPaid = (payments || []).filter(p => p.type === "Fee").reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balance = Math.max(0, totalInvoiced - totalPaid)
    const isCleared = balance <= 0
    return { totalInvoiced, totalPaid, balance, isCleared }
  }, [program, payments])

  if (isStudentLoading || isProgramLoading || isPaymentsLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Syncing documents...</p>
      </div>
    )
  }

  const paymentReceiptTemplate = schoolDocs?.find(d => d.type === "official_payment_receipt")?.downloadURL
  const examPassTemplate = schoolDocs?.find(d => d.type === "official_exam_pass")?.downloadURL
  const internshipTemplate = schoolDocs?.find(d => d.type === "official_internship_letter")?.downloadURL
  const feeStructureTemplate = schoolDocs?.find(d => d.type === "official_fee_structure")?.downloadURL

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <FileText className="h-6 w-6 text-emerald-600" />
          Document Centre
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Access official institutional records and self-service documents.</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Main Content: Self-Service Documents */}
        <div className="space-y-6">

          {/* Generation section */}
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileCheck2 className="h-3.5 w-3.5" /> On-Demand Generation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Examination Pass",
                  desc: feeStats.isCleared 
                    ? "Required for entry into examination rooms." 
                    : `Locked — Fee clearance required. Current balance: KES ${feeStats.balance.toLocaleString()}`,
                  icon: GraduationCap,
                  color: feeStats.isCleared ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-500",
                  btnColor: feeStats.isCleared ? "text-blue-600 hover:bg-blue-50" : "text-rose-500 hover:bg-rose-50",
                  action: generateExamPass,
                  loading: isGeneratingExamPass,
                  locked: !feeStats.isCleared
                },
                {
                  title: "Internship Request",
                  desc: "Official letter for industrial attachment placement.",
                  icon: Briefcase,
                  color: "bg-indigo-50 text-indigo-600",
                  btnColor: "text-indigo-600 hover:bg-indigo-50",
                  action: generateInternshipLetter,
                  loading: isGeneratingInternship,
                  locked: false
                }
              ].map((doc, i) => (
                <Card key={i} className={`border shadow-sm rounded-xl overflow-hidden transition-colors ${doc.locked ? 'border-rose-100 bg-rose-50/10' : 'border-slate-200 hover:border-slate-300'}`}>
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
                        <p className={`text-xs mt-1 leading-relaxed ${doc.locked ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>{doc.desc}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`mt-3 h-8 px-2 text-xs font-bold ${doc.btnColor}`}
                          onClick={doc.action}
                          disabled={doc.loading || doc.locked}
                        >
                          {doc.loading ? (
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1.5" />
                          )}
                          {doc.locked ? 'Fee Clearance Required' : 'Generate PDF'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Receipts section */}
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
                          onClick={() => downloadDynamicReceipt(p)}
                          disabled={isGenerating && activeReceipt?.id === p.id}
                        >
                          {isGenerating && activeReceipt?.id === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
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
                  <p className="text-sm text-slate-400">No receipts found.</p>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>

      {/* Hidden Render Targets for PDF Generation */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} templateImageUrl={paymentReceiptTemplate} />
        )}
        {student && (
          <ExamPass ref={examPassRef} student={student} program={{ name: student.appliedCourse, code: 'RTTC-01' }} templateImageUrl={feeStructureTemplate || examPassTemplate} />
        )}
        {student && (
          <InternshipLetter ref={internshipLetterRef} student={student} program={{ name: student.appliedCourse, code: 'RTTC-01' }} templateImageUrl={internshipTemplate} />
        )}
      </div>
    </div>
  )
}
