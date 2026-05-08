
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  GraduationCap, 
  MapPin, 
  Loader2, 
  MoreVertical, 
  UserCircle, 
  Calendar, 
  BookOpen,
  CheckCircle2,
  Clock,
  UserX,
  Printer,
  Award,
  FileBadge,
  Edit2
} from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("Active")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<'id' | 'certificate' | null>(null)
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({
    firstName: "",
    lastName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    appliedCourse: "",
    gender: "",
    dateOfBirth: "",
    status: "",
    admissionNumber: ""
  })

  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"

  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "students");
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const activeStudent = useMemo(() => {
    return (students || []).find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    return (students || []).filter(stu => {
      if (stu.admissionStatus !== "Enrolled") return false;

      const matchesSearch = 
        stu.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stu.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stu.appliedCourse && stu.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stu.admissionNumber && stu.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        stu.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const currentStatus = stu.status || "Active";
      const matchesTab = activeTab === "All" || currentStatus === activeTab;

      return matchesSearch && matchesTab;
    })
  }, [students, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const enrolled = (students || []).filter(s => s.admissionStatus === "Enrolled");
    return {
      total: enrolled.length,
      active: enrolled.filter(s => (s.status || "Active") === "Active").length,
      graduated: enrolled.filter(s => s.status === "Graduated").length,
      onLeave: enrolled.filter(s => s.status === "On Leave").length,
    }
  }, [students]);

  const handleUpdateStatus = (studentId: string, newStatus: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "students", studentId);
    updateDocumentNonBlocking(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    toast({
      title: "Status Updated",
      description: `Student status changed to ${newStatus}.`,
    });
  };

  const handleOpenEditDialog = (student: any) => {
    setSelectedStudentId(student.id)
    setEditFormData({
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      contactEmail: student.contactEmail || "",
      contactPhone: student.contactPhone || "",
      address: student.address || "",
      appliedCourse: student.appliedCourse || "",
      gender: student.gender || "",
      dateOfBirth: student.dateOfBirth || "",
      status: student.status || "Active",
      admissionNumber: student.admissionNumber || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!firestore || !selectedStudentId) return;
    
    const docRef = doc(firestore, "students", selectedStudentId);
    updateDocumentNonBlocking(docRef, {
      ...editFormData,
      updatedAt: serverTimestamp(),
    });
    
    toast({
      title: "Profile Updated",
      description: "The student record has been successfully updated.",
    });
    
    setIsEditDialogOpen(false);
  };

  const handlePrintID = (student: any) => {
    setSelectedStudentId(student.id);
    setPrintMode('id');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintCertificate = (student: any) => {
    setSelectedStudentId(student.id);
    setPrintMode('certificate');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
      {activeStudent && printMode === 'id' && (
        <div id="id-card-print-container" className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-[3.375in] h-[2.125in] border-[3px] border-primary rounded-xl overflow-hidden flex flex-col relative bg-white shadow-none">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>
              <div className="bg-primary p-2 flex items-center gap-3 pl-4">
                <div className="bg-white p-1 rounded-md shadow-sm">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase leading-none tracking-tight">Risabu Technical</span>
                  <span className="text-[8px] text-white/90 leading-none font-medium">Training College</span>
                </div>
                <div className="ml-auto">
                   <span className="text-[7px] font-bold text-white/50 uppercase">Student ID</span>
                </div>
              </div>
              <div className="flex p-3 gap-4 flex-1 pl-4">
                <div className="w-20 h-24 bg-muted rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm">
                  <img 
                    src={`https://picsum.photos/seed/${activeStudent.id}/200/200`} 
                    alt="Photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-1 gap-1 py-1">
                  <div className="mb-1">
                    <span className="text-[6px] text-primary font-bold uppercase block tracking-wider">Full Name</span>
                    <span className="text-sm font-bold leading-tight block text-slate-900">{activeStudent.firstName} {activeStudent.lastName}</span>
                  </div>
                  <div>
                    <span className="text-[6px] text-primary font-bold uppercase block tracking-wider">Program of Study</span>
                    <span className="text-[9px] font-semibold leading-tight block truncate max-w-[130px] text-slate-700">
                      {activeStudent.appliedCourse || "General Studies"}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-auto">
                    <div>
                      <span className="text-[6px] text-primary font-bold uppercase block tracking-wider">Reg. No</span>
                      <span className="text-[9px] font-mono font-bold block text-slate-900">{activeStudent.admissionNumber || activeStudent.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[6px] text-primary font-bold uppercase block tracking-wider">Issue Date</span>
                      <span className="text-[9px] font-bold block text-slate-900">{activeStudent.admissionDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-primary/10 px-4 py-1.5 flex justify-between items-center bg-primary/[0.03]">
                <span className="text-[6px] font-bold text-primary/60 italic">Official Institutional Identity Card</span>
                <div className="flex flex-col items-end">
                   <div className="w-16 h-4 border-b border-primary/30"></div>
                   <span className="text-[5px] text-primary/40 font-bold uppercase mt-0.5">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStudent && printMode === 'certificate' && (
        <div id="certificate-print-container" className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <div className="w-[11in] h-[8.5in] border-[12px] border-primary p-1 bg-white relative">
            <div className="w-full h-full border-[2px] border-primary p-12 flex flex-col items-center justify-between text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-32 -mt-32 rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 -ml-32 -mb-32 rounded-full"></div>
              
              <header className="space-y-6 w-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-primary p-5 rounded-2xl shadow-xl border-4 border-white">
                    <GraduationCap className="h-14 w-14 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-5xl font-black text-primary uppercase tracking-tighter">Risabu Technical</h1>
                    <h2 className="text-2xl font-bold text-slate-600 uppercase tracking-[0.3em]">Training College</h2>
                  </div>
                </div>
              </header>

              <main className="space-y-10 flex-1 flex flex-col justify-center w-full max-w-4xl">
                <div className="space-y-3">
                  <span className="text-2xl font-serif italic text-primary/70">This is to certify that</span>
                  <div className="relative inline-block w-full">
                    <h3 className="text-7xl font-black text-slate-900 py-6 tracking-tight relative z-10">
                      {activeStudent.firstName} {activeStudent.lastName}
                    </h3>
                  </div>
                </div>

                <div className="space-y-6">
                  <span className="text-xl font-medium text-slate-500 uppercase tracking-widest">has successfully fulfilled the prescribed requirements for the award of</span>
                  <div className="bg-primary/5 py-8 px-16 rounded-3xl border-2 border-primary/20 inline-block shadow-inner">
                    <h4 className="text-4xl font-black text-primary uppercase tracking-tight">
                      {activeStudent.appliedCourse || "Professional Certification"}
                    </h4>
                  </div>
                </div>
              </main>

              <footer className="w-full flex justify-around items-end pt-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-56 border-b-4 border-primary/20 h-16 flex items-end justify-center pb-2 italic text-slate-400">
                    <span className="font-mono text-[10px] opacity-40 uppercase tracking-[0.2em]">{activeStudent.admissionNumber || activeStudent.id}</span>
                  </div>
                  <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Registrar</span>
                </div>
                
                <div className="relative group">
                  <div className="w-40 h-40 border-[6px] border-primary/10 rounded-full flex items-center justify-center bg-primary/[0.02]">
                    <div className="w-32 h-32 border-2 border-dashed border-primary/30 rounded-full flex items-center justify-center">
                      <FileBadge className="h-20 w-20 text-primary/40" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="w-56 border-b-4 border-primary/20 h-16"></div>
                  <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">Principal</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Header & Stats Dashboard */}
      <div className="flex flex-col gap-6 no-print animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Scholars Directory</h1>
            <p className="text-muted-foreground mt-1 font-medium text-lg">Manage profiles, track progress, and issue credentials.</p>
          </div>
        </div>

        {/* Minimalist Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 w-full bg-blue-500"></div>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Total Enrolled</p>
                <UserCircle className="h-4 w-4 text-blue-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 w-full bg-emerald-500"></div>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Active Now</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{stats.active}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 w-full bg-slate-800"></div>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Graduated Alumni</p>
                <Award className="h-4 w-4 text-slate-800" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{stats.graduated}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 w-full bg-orange-500"></div>
            <CardContent className="p-5 flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">On Leave</p>
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">{stats.onLeave}</h3>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print bg-white p-2 rounded-2xl shadow-sm ring-1 ring-slate-200">
        <Tabs defaultValue="Active" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100/50 p-1 rounded-xl h-12 w-full md:w-auto overflow-x-auto justify-start md:justify-center">
            <TabsTrigger value="Active" className="rounded-lg px-4 md:px-6 font-bold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Active</TabsTrigger>
            <TabsTrigger value="On Leave" className="rounded-lg px-4 md:px-6 font-bold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">On Leave</TabsTrigger>
            <TabsTrigger value="Graduated" className="rounded-lg px-4 md:px-6 font-bold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Graduated</TabsTrigger>
            <TabsTrigger value="All" className="rounded-lg px-4 md:px-6 font-bold h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full md:w-auto gap-3 px-2 md:px-0">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name, ADM, or course..." 
              className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500 shadow-inner w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 no-print">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-6" />
          <p className="text-slate-500 font-bold animate-pulse tracking-wide uppercase text-sm">Retrieving Database...</p>
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden no-print">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[300px]">Student Info</TableHead>
                <TableHead>Contact Details</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="group hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200 rounded-md">
                          <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} />
                          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold rounded-md">
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">{student.firstName} {student.lastName}</div>
                          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{student.admissionNumber || student.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-xs text-slate-600">
                          <Mail className="h-3 w-3 mr-1.5 text-slate-400" />
                          <span className="truncate max-w-[150px]" title={student.contactEmail}>{student.contactEmail}</span>
                        </div>
                        <div className="flex items-center text-xs text-slate-600">
                          <Phone className="h-3 w-3 mr-1.5 text-slate-400" />
                          <span>{student.contactPhone || "No Phone"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <BookOpen className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        <span className="truncate max-w-[150px]" title={student.appliedCourse || "General Studies"}>
                          {student.appliedCourse || "General Studies"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-sm ${
                        (student.status || "Active") === "Active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        (student.status || "Active") === "On Leave" ? "border-orange-200 text-orange-700 bg-orange-50" : 
                        (student.status || "Active") === "Graduated" ? "border-slate-300 text-slate-700 bg-slate-50" : "border-rose-200 text-rose-700 bg-rose-50"
                      }`}>
                        {student.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Sheet onOpenChange={(open) => { if(!open) setSelectedStudentId(null) }}>
                          <SheetTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 rounded-md"
                              onClick={() => setSelectedStudentId(student.id)}
                            >
                              View Profile
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-[500px] overflow-y-auto text-left">
                            <SheetHeader className="pb-6">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20 border-4 border-primary/10">
                                  <AvatarImage src={`https://picsum.photos/seed/${activeStudent?.id}/200/200`} />
                                  <AvatarFallback className="text-xl">{activeStudent?.firstName?.[0]}{activeStudent?.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <SheetTitle className="text-2xl font-bold">{activeStudent?.firstName} {activeStudent?.lastName}</SheetTitle>
                                  <SheetDescription className="font-mono text-sm font-bold text-primary">ADM: {activeStudent?.admissionNumber || activeStudent?.id}</SheetDescription>
                                  <Badge className="mt-2">{activeStudent?.status || "Active"}</Badge>
                                </div>
                              </div>
                            </SheetHeader>
                            
                            <div className="space-y-8 mt-4">
                              <section>
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                  <UserCircle className="h-4 w-4 text-primary" />
                                  Personal Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl text-sm">
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Full Name</label>
                                    <p className="font-medium">{activeStudent?.firstName} {activeStudent?.lastName}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Date of Birth</label>
                                    <p className="font-medium">{activeStudent?.dateOfBirth || "Not Recorded"}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Gender</label>
                                    <p className="font-medium">{activeStudent?.gender || "Not Specified"}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Address</label>
                                    <p className="font-medium">{activeStudent?.address || "Nairobi, Kenya"}</p>
                                  </div>
                                </div>
                              </section>

                              <section>
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-primary" />
                                  Academic Profile
                                </h3>
                                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl text-sm">
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground block">Enrolled Course</label>
                                    <p className="font-medium">{activeStudent?.appliedCourse || "General Studies"}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Admission Date</label>
                                    <p className="font-medium">{activeStudent?.admissionDate}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground block">Admission Number</label>
                                    <p className="font-bold text-primary">{activeStudent?.admissionNumber || "Pending"}</p>
                                  </div>
                                </div>
                              </section>

                              <section>
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-primary" />
                                  Contact & Emergency
                                </h3>
                                <div className="space-y-3 bg-muted/30 p-4 rounded-xl text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Primary Email</span>
                                    <span className="font-medium">{activeStudent?.contactEmail}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Phone Number</span>
                                    <span className="font-medium">{activeStudent?.contactPhone || "N/A"}</span>
                                  </div>
                                </div>
                              </section>
                              
                              <div className="flex flex-col gap-2 pt-6">
                                <div className="flex gap-2">
                                  <Button className="flex-1 bg-primary" onClick={() => handlePrintID(activeStudent)}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print ID Card
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => handleOpenEditDialog(activeStudent)}
                                  >
                                    Edit Records
                                  </Button>
                                </div>
                                {activeStudent?.status === "Graduated" && (
                                  <Button className="w-full bg-accent hover:bg-accent/90" onClick={() => handlePrintCertificate(activeStudent)}>
                                    <Award className="h-4 w-4 mr-2" />
                                    Print Graduation Certificate
                                  </Button>
                                )}
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-md">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-lg border-slate-200">
                            <DropdownMenuLabel className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(student)} className="font-medium cursor-pointer text-sm">
                              <Edit2 className="mr-2 h-4 w-4 text-slate-500" /> Edit Profile
                            </DropdownMenuItem>
                            {student.status === "Graduated" && (
                              <DropdownMenuItem onClick={() => handlePrintCertificate(student)} className="font-medium cursor-pointer text-sm">
                                <Award className="mr-2 h-4 w-4 text-slate-500" /> Print Certificate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handlePrintID(student)} className="font-medium cursor-pointer text-sm">
                              <Printer className="mr-2 h-4 w-4 text-slate-500" /> Print ID Card
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "Active")} className="font-medium cursor-pointer text-sm">
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Set as Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "On Leave")} className="font-medium cursor-pointer text-sm">
                              <Clock className="mr-2 h-4 w-4 text-orange-500" /> Set On Leave
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "Graduated")} className="font-medium cursor-pointer text-sm">
                              <GraduationCap className="mr-2 h-4 w-4 text-slate-600" /> Set Graduated
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                        <UserX className="h-8 w-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No Scholars Found</h3>
                      <p className="text-sm max-w-sm mx-auto mb-4">
                        We couldn't find any enrolled students matching your criteria. Try adjusting your search filters.
                      </p>
                      {activeTab !== "All" && (
                        <Button variant="outline" onClick={() => setActiveTab("All")} className="bg-white">
                          View All Students
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Student Record</DialogTitle>
            <DialogDescription>Update the full professional profile for this scholar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fName">First Name</Label>
                <Input 
                  id="edit-fName" 
                  value={editFormData.firstName} 
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  placeholder="e.g. Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lName">Last Name</Label>
                <Input 
                  id="edit-lName" 
                  value={editFormData.lastName} 
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  placeholder="e.g. Doe"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-adm">Admission Number</Label>
                <Input 
                  id="edit-adm" 
                  value={editFormData.admissionNumber} 
                  onChange={(e) => setEditFormData({...editFormData, admissionNumber: e.target.value})}
                  className="font-mono font-bold text-primary"
                  placeholder="RTTC/000/202X"
                />
              </div>
              <div className="space-y-2">
                <Label>Academic Status</Label>
                <Select 
                  onValueChange={(v) => setEditFormData({...editFormData, status: v})} 
                  value={editFormData.status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Graduated">Graduated</SelectItem>
                    <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  onValueChange={(v) => setEditFormData({...editFormData, gender: v})} 
                  value={editFormData.gender}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input 
                  id="edit-dob" 
                  type="date"
                  value={editFormData.dateOfBirth} 
                  onChange={(e) => setEditFormData({...editFormData, dateOfBirth: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editFormData.contactEmail} 
                  onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                  placeholder="jane.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <Input 
                  id="edit-phone" 
                  value={editFormData.contactPhone} 
                  onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                  placeholder="+254..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Home Address / Location</Label>
              <Input 
                id="edit-address" 
                value={editFormData.address} 
                onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                placeholder="e.g. Nairobi, Westlands"
              />
            </div>
          </div>
          <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 border-t mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-primary px-8">Update Scholar Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
