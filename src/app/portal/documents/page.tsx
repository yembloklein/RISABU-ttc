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
  FileArchive,
  ShieldCheck,
  Briefcase
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { PaymentReceipt } from "@/components/payment-receipt"
import { ExamPass } from "@/components/exam-pass"
import { InternshipLetter } from "@/components/internship-letter"

// --- Constants ---
const DOCUMENT_CATEGORIES = [
  {
    key: "admission_letter",
    label: "Admission Letter",
    icon: FileBadge,
    color: "emerald",
    description: "Official admission letter issued by the institution or uploaded by student",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "payment_receipt",
    label: "Payment Receipt",
    icon: Receipt,
    color: "blue",
    description: "Bank slips, M-Pesa messages, or any proof of payment",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "academic_cert",
    label: "Academic Certificate",
    icon: FileCheck2,
    color: "purple",
    description: "Previous certificates, transcripts, or academic records",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "national_id",
    label: "National ID / Passport",
    icon: FileText,
    color: "amber",
    description: "National ID, birth certificate or passport copy",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "other",
    label: "Other Documents",
    icon: FileArchive,
    color: "slate",
    description: "Any other supporting documents",
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  },
]

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
// --- Main Component ---
export default function DocumentsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  // Fetch student record
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(
      collection(firestore, "students"),
      where("contactEmail", "==", user.email),
      limit(1)
    )
  }, [firestore, user])

  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // Fetch School (Official) Documents
  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "school_documents"))
  }, [firestore])

  const { data: schoolDocs } = useCollection(schoolDocsQuery)

  // Upload state (Removed per user request to only have downloads)
  const [activeReceipt, setActiveReceipt] = useState<any>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const examPassRef = useRef<HTMLDivElement>(null)
  const internshipLetterRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingExamPass, setIsGeneratingExamPass] = useState(false)
  const [isGeneratingInternship, setIsGeneratingInternship] = useState(false)

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "payments"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: payments } = useCollection(paymentsQuery)

  const downloadDynamicReceipt = async (payment: any) => {
    setActiveReceipt(payment)
    setIsGenerating(true)
    
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
        toast({ title: "Success", description: "Receipt generated successfully." })
      } catch (e) {
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
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`Exam_Pass_${student?.admissionNumber?.replace(/\//g, '_') || 'Student'}.pdf`)
        toast({ title: "Success", description: "Examination Pass generated successfully." })
      } catch (e) {
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
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`Internship_Letter_${student?.admissionNumber?.replace(/\//g, '_') || 'Student'}.pdf`)
        toast({ title: "Success", description: "Internship Letter generated successfully." })
      } catch (e) {
        toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" })
      } finally {
        setIsGeneratingInternship(false)
      }
    }, 100)
  }

  if (isStudentLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Extract templates
  const paymentReceiptTemplate = schoolDocs?.find(d => d.type === "official_payment_receipt")?.downloadURL
  const examPassTemplate = schoolDocs?.find(d => d.type === "official_exam_pass")?.downloadURL
  const internshipTemplate = schoolDocs?.find(d => d.type === "official_internship_letter")?.downloadURL

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Center</h1>
          <p className="text-slate-500 font-medium mt-1">
            Access official school records and generate your documents instantly.
          </p>
        </div>
      </div>

      {/* Official School Documents Section */}
      {schoolDocs && schoolDocs.filter(d => !d.type?.includes("template")).length > 0 && (
        <div className="animate-in slide-in-from-top duration-500">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Official School Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schoolDocs.filter(d => !d.type?.includes("template")).map((docItem) => {
              const typeBase = docItem.type?.replace('official_', '')
              const Icon = FileText
              return (
                <Card key={docItem.id} className="border-emerald-100 bg-emerald-50/30 shadow-sm rounded-xl overflow-hidden group hover:border-emerald-200 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{docItem.label || docItem.fileName}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Official Record</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 shrink-0" asChild>
                      <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* On-Demand Documents Section */}
      <div className="animate-in slide-in-from-top duration-500">
        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileCheck2 className="h-4 w-4" /> Generate Documents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <Card className="border-blue-100 bg-blue-50/30 shadow-sm rounded-xl overflow-hidden group hover:border-blue-200 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <FileBadge className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">Examination Pass</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Current Semester</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-blue-600 hover:bg-blue-100 shrink-0" 
                onClick={generateExamPass}
                disabled={isGeneratingExamPass}
              >
                {isGeneratingExamPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/30 shadow-sm rounded-xl overflow-hidden group hover:border-blue-200 transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">Internship Letter</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Industrial Attachment</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-blue-600 hover:bg-blue-100 shrink-0" 
                onClick={generateInternshipLetter}
                disabled={isGeneratingInternship}
              >
                {isGeneratingInternship ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* My Receipts Section */}
      <div className="animate-in slide-in-from-top duration-500">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4" /> Payment Receipts
        </h2>
        
        {!payments || payments.length === 0 ? (
          <Card className="border shadow-sm rounded-xl">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Payments Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Your payment receipts will appear here once transactions are recorded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...payments]
              .sort((a, b) => {
                const aTime = a.paymentDate?.toMillis?.() || new Date(a.paymentDate || 0).getTime()
                const bTime = b.paymentDate?.toMillis?.() || new Date(b.paymentDate || 0).getTime()
                return bTime - aTime
              })
              .map((payment) => (
                <Card key={payment.id} className="border shadow-sm rounded-xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Receipt className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        Receipt: {payment.transactionReference}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[9px] h-4 px-1.5 font-bold uppercase border-0">
                          KES {payment.amount?.toLocaleString()}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-medium uppercase">
                          {payment.paymentMethod}
                        </span>
                        {payment.paymentDate && (
                          <span className="text-[10px] text-slate-400">
                            · {new Date(payment.paymentDate.toDate ? payment.paymentDate.toDate() : payment.paymentDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                        disabled={isGenerating && activeReceipt?.id === payment.id}
                        onClick={() => downloadDynamicReceipt(payment)}
                      >
                        {isGenerating && activeReceipt?.id === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Hidden Render Targets for PDF Generation */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        {activeReceipt && (
          <PaymentReceipt ref={receiptRef} student={student} payment={activeReceipt} templateImageUrl={paymentReceiptTemplate} />
        )}
        {student && (
          <ExamPass ref={examPassRef} student={student} program={{ name: student.appliedCourse, code: 'RTTC-01' }} templateImageUrl={examPassTemplate} />
        )}
        {student && (
          <InternshipLetter ref={internshipLetterRef} student={student} program={{ name: student.appliedCourse, code: 'RTTC-01' }} templateImageUrl={internshipTemplate} />
        )}
      </div>
    </div>
  )
}
