"use client"

import { useState, useMemo, useEffect } from "react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Download,
  Upload,
  UserCheck,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Users,
  Clock,
  IdCard,
  User,
  CreditCard,
  UserPlus
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function AdmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkData, setBulkData] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#new') {
      setIsCreateOpen(true)
      // Clean up the hash so it doesn't stay in the URL
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Enhanced Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    course: "",
    email: "",
    phone: "",
    nationalId: "",
    dob: "",
    guardianName: "",
    guardianPhone: "",
    gender: "Not Specified",
    admissionFee: "1000",
    idFee: "500",
    paymentMethod: "Cash"
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const paymentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "payments");
  }, [firestore, user]);

  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "students");
  }, [firestore, user]);

  const programsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "programs");
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);
  const { data: programs, isLoading: isLoadingPrograms } = useCollection(programsRef);

  // Statistics
  const stats = useMemo(() => {
    const list = students || []
    return {
      pending: list.filter(s => s.admissionStatus === "Pending").length,
      admitted: list.filter(s => s.admissionStatus === "Admitted").length,
      rejected: list.filter(s => s.admissionStatus === "Rejected").length,
      enrolled: list.filter(s => s.admissionStatus === "Enrolled").length
    }
  }, [students])

  const filteredApplications = useMemo(() => {
    return (students || []).filter(app => {
      const matchesSearch =
        app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.appliedCourse && app.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
        app.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTab = activeTab === "All" || app.admissionStatus === activeTab;

      const isNotEnrolled = app.admissionStatus !== "Enrolled";

      return matchesSearch && matchesTab && isNotEnrolled;
    }).sort((a, b) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.admissionDate).getTime() - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.admissionDate).getTime());
  }, [students, searchTerm, activeTab]);

  const generateAdmissionNumber = () => {
    const currentYear = new Date().getFullYear();
    const enrolledThisYear = (students || []).filter(s =>
      s.admissionStatus === "Enrolled" &&
      s.admissionNumber?.endsWith(`/${currentYear}`)
    );

    const nextSerial = enrolledThisYear.length + 1;
    const paddedSerial = nextSerial.toString().padStart(3, '0');

    return `RTTC/${paddedSerial}/${currentYear}`;
  };

  const handleCreateApplication = async () => {
    if (!studentsRef) return;

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.course || !formData.nationalId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields, including National ID.",
        variant: "destructive"
      });
      return;
    }

    try {
      const studentDoc: any = await addDocumentNonBlocking(studentsRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dob,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        appliedCourse: formData.course,
        nationalId: formData.nationalId,
        gender: formData.gender,
        admissionStatus: "Pending",
        admissionDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (studentDoc && studentDoc.id && paymentsRef && user) {
        const studentId = studentDoc.id;

        // Log Admission Fee
        const admFee = Number(formData.admissionFee);
        if (admFee > 0) {
          addDocumentNonBlocking(paymentsRef, {
            type: "AdmissionFee",
            studentId: studentId,
            amount: admFee,
            paymentMethod: formData.paymentMethod,
            transactionReference: `ADM-${Date.now().toString().slice(-6)}`,
            paymentDate: new Date().toISOString(),
            description: "Application & Admission Fee",
            recordedByUserId: user.uid,
            recordedByUserFirebaseUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Log ID Card Fee
        const idFee = Number(formData.idFee);
        if (idFee > 0) {
          addDocumentNonBlocking(paymentsRef, {
            type: "IDCardFee",
            studentId: studentId,
            amount: idFee,
            paymentMethod: formData.paymentMethod,
            transactionReference: `ID-${Date.now().toString().slice(-6)}`,
            paymentDate: new Date().toISOString(),
            description: "ID Card Processing Fee",
            recordedByUserId: user.uid,
            recordedByUserFirebaseUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      setIsCreateOpen(false);
      setCurrentStep(1);
      setFormData({
        firstName: "", lastName: "", course: "", email: "", phone: "", nationalId: "", dob: "", guardianName: "", guardianPhone: "",
        gender: "Not Specified", admissionFee: "1000", idFee: "500", paymentMethod: "Cash"
      });
      toast({ title: "Success", description: "Application submitted and fees processed successfully." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit application.", variant: "destructive" });
    }
  };

  const handleStatusUpdate = (studentId: string, status: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, "students", studentId);

    const updateData: any = {
      admissionStatus: status,
      updatedAt: serverTimestamp(),
    };

    if (status === "Enrolled") {
      const student = (students || []).find(s => s.id === studentId);
      if (student && !student.admissionNumber) {
        const admNo = generateAdmissionNumber();
        updateData.admissionNumber = admNo;
        updateData.status = "Active";

        toast({
          title: "Enrollment Finalized \uD83C\uDF89",
          description: `Scholar officially enrolled with Admission Number: ${admNo}`
        });
      }
    } else if (status === "Admitted") {
      toast({ title: "Admission Offered", description: `An admission letter has logically been issued to the applicant.` });
    } else {
      toast({ title: "Status Updated", description: `Student application marked as ${status}.` });
    }

    updateDocumentNonBlocking(docRef, updateData);
  };

  const handleBulkImport = () => {
    if (!studentsRef || !bulkData.trim()) return;

    const lines = bulkData.trim().split('\n');
    let count = 0;

    lines.forEach(line => {
      const [first, last, email, phone, course] = line.split(',').map(s => s.trim());
      if (first && last && email) {
        addDocumentNonBlocking(studentsRef, {
          firstName: first,
          lastName: last,
          contactEmail: email,
          contactPhone: phone || "",
          appliedCourse: course || "General",
          admissionStatus: "Pending",
          admissionDate: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        count++;
      }
    });

    toast({ title: "Bulk Import", description: `Successfully imported ${count} applications.` });
    setIsBulkOpen(false);
    setBulkData("");
  };

  const exportToCSV = () => {
    if (!filteredApplications.length) return;

    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Course", "Status", "Date"];
    const rows = filteredApplications.map(app => [
      app.id,
      app.firstName,
      app.lastName,
      app.contactEmail,
      app.contactPhone || "N/A",
      app.appliedCourse || "N/A",
      app.admissionStatus,
      app.admissionDate
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `admissions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Admissions Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Admissions Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the enrollment funnel for prospective scholars</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={exportToCSV} disabled={filteredApplications.length === 0} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 rounded-lg text-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 rounded-lg text-sm">
                <Upload className="mr-2 h-4 w-4" />Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border border-slate-200 shadow-lg rounded-xl p-0 overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-100">
                <DialogTitle className="text-lg font-bold text-slate-900">Bulk Import Applications</DialogTitle>
                <DialogDescription className="mt-1.5 text-sm text-slate-500">
                  Paste comma-separated values (CSV format) below. <br />
                  Format: <span className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded text-xs">FirstName, LastName, Email, Phone, Course</span>
                </DialogDescription>
              </div>
              <div className="p-6 bg-white">
                <textarea
                  className="w-full h-48 p-4 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                  placeholder="John, Doe, john@example.com, 0712345678, Diploma in ICT&#10;Jane, Smith, jane@example.com, 0798765432, Web Design"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter className="p-6 pt-0 bg-white">
                <Button onClick={handleBulkImport} className="w-full bg-emerald-600 text-white rounded-lg h-10 font-medium hover:bg-emerald-700">Start Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg h-9 px-4 text-sm transition-all">
                <Plus className="mr-2 h-4 w-4" /> New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] border border-slate-200 shadow-2xl shadow-slate-900/10 rounded-2xl p-0 overflow-hidden">
              <div className="bg-slate-50 p-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-200/50">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">New Scholar Application</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5 font-medium">
                      Register a new student into the admission funnel.
                    </DialogDescription>
                  </div>
                </div>

                {/* Modern Stepper */}
                <div className="mt-6 flex items-center justify-between relative px-2">
                  <div className="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-10 rounded-full" />
                  <div className="absolute left-6 top-4 h-0.5 bg-emerald-500 -z-10 rounded-full transition-all duration-500" style={{ width: `calc(${(currentStep - 1) * 50}% - 12px)` }} />
                  
                  {[
                    { step: 1, label: 'Profile', icon: User },
                    { step: 2, label: 'Academics', icon: BookOpen },
                    { step: 3, label: 'Fees', icon: CreditCard }
                  ].map(s => (
                    <div key={s.step} className="flex flex-col items-center gap-2 bg-slate-50 relative z-10 px-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= s.step ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep >= s.step ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white min-h-[360px]">
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">Applicant Details</h4>
                      <p className="text-xs text-slate-500 font-medium">Provide the student's personal information. National ID is required.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">First Name</Label>
                        <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="e.g. Klein" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">Last Name</Label>
                        <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="e.g. Koech" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-semibold text-slate-700">Gender</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, gender: v })} value={formData.gender}>
                          <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 focus:ring-emerald-500">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dob" className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                        <Input id="dob" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nationalId" className="text-xs font-semibold text-slate-700">National ID / Passport <span className="text-rose-500">*</span></Label>
                        <Input id="nationalId" value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} placeholder="Required" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Applicant Phone</Label>
                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="e.g. 0712345678" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="applicant@example.com" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">Guardian & Course Selection</h4>
                      <p className="text-xs text-slate-500 font-medium">Emergency contacts and the intended program of study.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="guardianName" className="text-xs font-semibold text-slate-700">Guardian Name</Label>
                          <Input id="guardianName" value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} placeholder="e.g. John Doe" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guardianPhone" className="text-xs font-semibold text-slate-700">Guardian Phone</Label>
                          <Input id="guardianPhone" value={formData.guardianPhone} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} placeholder="e.g. 0712345678" className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500" />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <Label htmlFor="course" className="text-xs font-semibold text-slate-700">Target Course</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, course: v })} value={formData.course}>
                          <SelectTrigger className="h-11 bg-emerald-50/30 border-slate-200 focus:ring-emerald-500 font-medium">
                            <SelectValue placeholder="Select intended program..." />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingPrograms ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                              </div>
                            ) : (programs || []).length > 0 ? (
                              programs?.map((program) => (
                                <SelectItem key={program.id} value={program.name}>
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <BookOpen className="h-4 w-4 text-emerald-600" />
                                    <span>{program.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-400 italic">
                                No courses available.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">Initial Fees Collection</h4>
                      <p className="text-xs text-slate-500 font-medium">Record upfront payments for admission and ID processing.</p>
                    </div>
                    <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-5">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="admissionFee" className="text-xs font-bold text-emerald-900">Admission Fee (KES)</Label>
                          <Input id="admissionFee" type="number" value={formData.admissionFee} onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })} className="h-10 bg-white border-emerald-200 focus-visible:ring-emerald-500 font-mono text-sm shadow-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="idFee" className="text-xs font-bold text-emerald-900">ID Card Fee (KES)</Label>
                          <Input id="idFee" type="number" value={formData.idFee} onChange={(e) => setFormData({ ...formData, idFee: e.target.value })} className="h-10 bg-white border-emerald-200 focus-visible:ring-emerald-500 font-mono text-sm shadow-sm" />
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-emerald-100/50">
                        <Label htmlFor="paymentMethod" className="text-xs font-bold text-emerald-900">Payment Method</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })} value={formData.paymentMethod}>
                          <SelectTrigger className="h-10 bg-white border-emerald-200 focus:ring-emerald-500 shadow-sm">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="p-6 pt-0 bg-white flex flex-row items-center justify-between sm:justify-between w-full">
                {currentStep > 1 ? (
                  <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} className="h-11 px-6 rounded-xl text-sm border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">Back</Button>
                ) : <div />}

                {currentStep < 3 ? (
                  <Button onClick={() => setCurrentStep(prev => prev + 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-8 text-sm font-bold shadow-lg shadow-emerald-600/20">Next Step</Button>
                ) : (
                  <Button onClick={handleCreateApplication} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-8 text-sm font-bold shadow-lg shadow-emerald-600/20">
                    Submit Application
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Awaiting Review",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50"
          },
          {
            label: "Admitted (Pending Enrollment)",
            value: stats.admitted,
            icon: UserCheck,
            color: "text-blue-600",
            bg: "bg-blue-50"
          },
          {
            label: "Total Enrolled",
            value: stats.enrolled,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
          }
        ].map((kpi, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4">
               <div className="flex items-start justify-between gap-2 mb-2">
                 <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                   <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                 </div>
                 <p className="text-xs text-slate-400 text-right leading-tight">{kpi.label}</p>
               </div>
               <p className={`text-2xl font-bold leading-tight text-slate-900`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs defaultValue="All" onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-100 p-1 h-auto min-h-9 rounded-lg flex-wrap">
              <TabsTrigger value="All" className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">All Applicants</TabsTrigger>
              <TabsTrigger value="Pending" className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">Pending</TabsTrigger>
              <TabsTrigger value="Admitted" className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Admitted</TabsTrigger>
              <TabsTrigger value="Rejected" className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-sm">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search applications..."
              className="pl-9 h-9 border-slate-200 rounded-lg text-sm focus-visible:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">ID</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Applicant Profile</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Intended Program</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-500 h-10 text-xs pr-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm text-slate-500">Fetching applications...</p>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="pl-5 py-3">
                      <span className="font-mono text-xs font-medium text-slate-500">
                        #{app.id.substring(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                          {app.firstName[0]}{app.lastName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-slate-900">{app.firstName} {app.lastName}</span>
                          <span className="text-xs text-slate-500">{app.contactEmail} {app.contactPhone && `• ${app.contactPhone}`}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <BookOpen className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        {app.appliedCourse || 'General'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className={`border-0 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        app.admissionStatus === "Admitted" ? "bg-blue-50 text-blue-700" :
                        app.admissionStatus === "Pending" ? "bg-amber-50 text-amber-700" :
                        app.admissionStatus === "Rejected" ? "bg-rose-50 text-rose-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {app.admissionStatus}
                      </Badge>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Applied: {app.admissionDate}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-5 py-3">
                      <div className="flex justify-end gap-2">
                        {app.admissionStatus === "Pending" && (
                          <>
                            <Button
                              size="sm" className="h-8 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium px-3 text-xs border-0 rounded-md"
                              onClick={() => handleStatusUpdate(app.id, "Admitted")}
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Admit
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-2 rounded-md"
                              onClick={() => handleStatusUpdate(app.id, "Rejected")}
                              title="Reject Application"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {app.admissionStatus === "Admitted" && (
                          <Button
                            size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 text-xs rounded-md shadow-sm"
                            onClick={() => handleStatusUpdate(app.id, "Enrolled")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalize
                          </Button>
                        )}
                        {app.admissionStatus === "Rejected" && (
                          <Button
                            size="sm" variant="outline" className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 px-3 text-xs font-medium rounded-md"
                            onClick={() => handleStatusUpdate(app.id, "Pending")}
                          >
                            Revert
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-6 w-6 text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No applications found.</p>
                      {activeTab !== "All" && (
                        <Button variant="link" size="sm" onClick={() => setActiveTab("All")} className="text-emerald-600 p-0 h-auto mt-1 text-xs">
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
