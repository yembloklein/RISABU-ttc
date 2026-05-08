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
  User
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Admissions Hub</h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage the enrollment funnel for prospective scholars</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportToCSV} disabled={filteredApplications.length === 0} className="rounded-full shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full shadow-sm">
                <Upload className="mr-2 h-4 w-4" />Import Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
              <div className="bg-slate-50 p-6 border-b">
                <DialogTitle className="text-xl font-bold text-slate-900">Bulk Import Applications</DialogTitle>
                <DialogDescription className="mt-1.5">
                  Paste comma-separated values (CSV format) below. <br />
                  Format: <span className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded text-xs">FirstName, LastName, Email, Phone, Course</span>
                </DialogDescription>
              </div>
              <div className="p-6 bg-white">
                <textarea
                  className="w-full h-48 p-4 text-sm font-mono border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-inner"
                  placeholder="John, Doe, john@example.com, 0712345678, Diploma in ICT&#10;Jane, Smith, jane@example.com, 0798765432, Web Design"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter className="p-6 pt-0 bg-white">
                <Button onClick={handleBulkImport} className="w-full bg-slate-900 text-white rounded-xl h-11 font-bold hover:bg-slate-800">Start Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg rounded-full px-6 transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
              <div className="bg-slate-50 p-6 border-b">
                <DialogTitle className="text-xl font-bold text-slate-900">Application Entry</DialogTitle>
                <DialogDescription className="mt-1.5 flex items-center justify-between">
                  <span>Register New Student</span>
                  <span className="font-bold text-blue-600">Step {currentStep} of 3</span>
                </DialogDescription>

                {/* Progress Bar */}
                <div className="mt-4 flex gap-2">
                  <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                </div>
              </div>

              <div className="p-6 bg-white min-h-[380px]">
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">1. Applicant Profile</h4>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs font-bold uppercase text-slate-500">First Name</Label>
                        <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="e.g. Klein" className="h-11 bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs font-bold uppercase text-slate-500">Last Name</Label>
                        <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="e.g. Koech" className="h-11 bg-slate-50 border-slate-200" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-bold uppercase text-slate-500">Gender</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, gender: v })} value={formData.gender}>
                          <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dob" className="text-xs font-bold uppercase text-slate-500">Date of Birth</Label>
                        <Input id="dob" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="h-11 bg-slate-50 border-slate-200" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="nationalId" className="text-xs font-bold uppercase text-slate-500">National ID / Passport <span className="text-rose-500">*</span></Label>
                        <Input id="nationalId" value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} placeholder="Required" className="h-11 bg-slate-50 border-rose-100 focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500">Applicant Phone</Label>
                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="e.g. 0712345678" className="h-11 bg-slate-50 border-slate-200" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">Email Address</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="applicant@example.com" className="h-11 bg-slate-50 border-slate-200" />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">2. Guardian & Academics</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="guardianName" className="text-xs font-bold uppercase text-slate-500">Guardian Name</Label>
                          <Input id="guardianName" value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} placeholder="e.g. John Doe" className="h-11 bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guardianPhone" className="text-xs font-bold uppercase text-slate-500">Guardian Phone</Label>
                          <Input id="guardianPhone" value={formData.guardianPhone} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} placeholder="e.g. 0712345678" className="h-11 bg-slate-50 border-slate-200" />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <Label htmlFor="course" className="text-xs font-bold uppercase text-slate-500">Target Course</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, course: v })} value={formData.course}>
                          <SelectTrigger className="h-12 bg-blue-50/50 border-blue-200">
                            <SelectValue placeholder="Select intended program..." />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingPrograms ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              </div>
                            ) : (programs || []).length > 0 ? (
                              programs?.map((program) => (
                                <SelectItem key={program.id} value={program.name}>
                                  <div className="flex items-center gap-2 font-medium">
                                    <BookOpen className="h-4 w-4 text-blue-500" />
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
                  <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">3. Upfront Application Fees</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="admissionFee" className="text-xs font-bold uppercase text-slate-500">Admission Fee (KES)</Label>
                          <Input id="admissionFee" type="number" value={formData.admissionFee} onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })} className="h-11 bg-emerald-50/50 border-emerald-200 font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="idFee" className="text-xs font-bold uppercase text-slate-500">ID Card Fee (KES)</Label>
                          <Input id="idFee" type="number" value={formData.idFee} onChange={(e) => setFormData({ ...formData, idFee: e.target.value })} className="h-11 bg-emerald-50/50 border-emerald-200 font-bold" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod" className="text-xs font-bold uppercase text-slate-500">Payment Method</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })} value={formData.paymentMethod}>
                          <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
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
                  <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} className="h-11 px-6 rounded-xl font-bold">Back</Button>
                ) : <div />}

                {currentStep < 3 ? (
                  <Button onClick={() => setCurrentStep(prev => prev + 1)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-8 font-bold">Next Step</Button>
                ) : (
                  <Button onClick={handleCreateApplication} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 font-bold shadow-md shadow-blue-600/20">
                    Submit Application
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-amber-50/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="h-20 w-20 -mt-2 -mr-2 text-amber-900" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Awaiting Review</p>
            <div className="text-3xl font-black text-amber-950">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-blue-50/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserCheck className="h-20 w-20 -mt-2 -mr-2 text-blue-900" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Admitted (Pending Enrollment)</p>
            <div className="text-3xl font-black text-blue-950">{stats.admitted}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-emerald-50/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="h-20 w-20 -mt-2 -mr-2 text-emerald-900" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Total Enrolled</p>
            <div className="text-3xl font-black text-emerald-950">{stats.enrolled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-0 ring-1 ring-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs defaultValue="All" onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-slate-200/50 p-1 h-10 rounded-full">
              <TabsTrigger value="All" className="rounded-full px-4 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">All Applicants</TabsTrigger>
              <TabsTrigger value="Pending" className="rounded-full px-4 text-xs font-bold data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 data-[state=active]:shadow-sm">Pending Review</TabsTrigger>
              <TabsTrigger value="Admitted" className="rounded-full px-4 text-xs font-bold data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm">Admitted</TabsTrigger>
              <TabsTrigger value="Rejected" className="rounded-full px-4 text-xs font-bold data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800 data-[state=active]:shadow-sm">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email or course..."
              className="pl-9 h-10 bg-white border-slate-200 rounded-full text-sm focus-visible:ring-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-slate-100">
                <TableHead className="font-bold text-slate-500 h-12 w-[80px] pl-6">ID</TableHead>
                <TableHead className="font-bold text-slate-500 h-12">Applicant Profile</TableHead>
                <TableHead className="font-bold text-slate-500 h-12">Intended Program</TableHead>
                <TableHead className="font-bold text-slate-500 h-12">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-500 h-12 pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500 font-medium">Fetching applications...</p>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                    <TableCell className="pl-6 py-4">
                      <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        #{app.id.substring(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm ring-1 ring-slate-200/50">
                          {app.firstName[0]}{app.lastName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{app.firstName} {app.lastName}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{app.contactEmail} {app.contactPhone && `• ${app.contactPhone}`}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center text-sm font-semibold text-slate-700">
                        <BookOpen className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        {app.appliedCourse || 'General'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`border-0 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 ${app.admissionStatus === "Admitted" ? "bg-blue-100 text-blue-700" :
                        app.admissionStatus === "Pending" ? "bg-amber-100 text-amber-700" :
                          app.admissionStatus === "Rejected" ? "bg-rose-100 text-rose-700" :
                            "bg-slate-100 text-slate-700"
                        }`}>
                        {app.admissionStatus}
                      </Badge>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">
                        Applied: {app.admissionDate}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                        {app.admissionStatus === "Pending" && (
                          <>
                            <Button
                              size="sm" className="h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold px-3 border-0"
                              onClick={() => handleStatusUpdate(app.id, "Admitted")}
                            >
                              <UserCheck className="h-4 w-4 mr-1" /> Offer Admission
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-2"
                              onClick={() => handleStatusUpdate(app.id, "Rejected")}
                              title="Reject Application"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {app.admissionStatus === "Admitted" && (
                          <Button
                            size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 shadow-sm"
                            onClick={() => handleStatusUpdate(app.id, "Enrolled")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize Enrollment
                          </Button>
                        )}
                        {app.admissionStatus === "Rejected" && (
                          <Button
                            size="sm" variant="ghost" className="h-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600 px-3 text-xs font-bold"
                            onClick={() => handleStatusUpdate(app.id, "Pending")}
                          >
                            Revert Status
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium">No applications found in this category.</p>
                      {activeTab !== "All" && (
                        <Button variant="link" size="sm" onClick={() => setActiveTab("All")} className="text-blue-600">
                          Clear filters
                        </Button>
                      )}
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
