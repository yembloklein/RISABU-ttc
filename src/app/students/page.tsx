
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Directory</h1>
          <p className="text-muted-foreground">Manage and track the academic progress of all enrolled students</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <Tabs defaultValue="Active" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="Active">Active</TabsTrigger>
            <TabsTrigger value="On Leave">On Leave</TabsTrigger>
            <TabsTrigger value="Graduated">Graduated</TabsTrigger>
            <TabsTrigger value="All">All Students</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search name, ADM or course..." 
              className="pl-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 no-print">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">Retrieving student records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 no-print">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <Card key={student.id} className="group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-background group-hover:border-primary/20 transition-all">
                      <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} alt={`${student.firstName} ${student.lastName}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {student.firstName[0]}{student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold leading-none mb-1">{student.firstName} {student.lastName}</CardTitle>
                      <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                        {student.admissionNumber || student.id.substring(0, 8)}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectedStudentId(student.id)}>
                        <UserCircle className="mr-2 h-4 w-4" /> View Full Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>
                        <Edit2 className="mr-2 h-4 w-4 text-primary" /> Edit Record
                      </DropdownMenuItem>
                      {student.status === "Graduated" && (
                        <DropdownMenuItem onClick={() => handlePrintCertificate(student)}>
                          <Award className="mr-2 h-4 w-4 text-primary" /> Print Certificate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handlePrintID(student)}>
                        <Printer className="mr-2 h-4 w-4" /> Print ID Card
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Manage Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "Active")}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Mark Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "On Leave")}>
                        <Clock className="mr-2 h-4 w-4 text-orange-500" /> Put on Leave
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(student.id, "Graduated")}>
                        <GraduationCap className="mr-2 h-4 w-4 text-blue-500" /> Mark Graduated
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={
                      (student.status || "Active") === "Active" ? "default" :
                      (student.status || "Active") === "On Leave" ? "secondary" : 
                      (student.status || "Active") === "Graduated" ? "outline" : "destructive"
                    } className="rounded-md">
                      {student.status || "Active"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5 mr-2 text-primary" />
                      <span className="truncate" title={student.appliedCourse || "General Studies"}>
                        {student.appliedCourse || "General Studies"}
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mr-2" />
                      <span>{student.address || "Nairobi, KE"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 mr-2" />
                      <span className="truncate">{student.contactEmail}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 mr-2" />
                      <span>{student.contactPhone || "No Phone"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Sheet onOpenChange={(open) => { if(!open) setSelectedStudentId(null) }}>
                      <SheetTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          Quick View Details
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
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
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-muted/20 rounded-2xl border-2 border-dashed no-print">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">No students found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                We couldn't find any enrolled students matching your search criteria.
              </p>
              {activeTab !== "All" && (
                <Button variant="link" onClick={() => setActiveTab("All")} className="mt-2 text-primary">
                  View all enrolled students
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Student Record</DialogTitle>
            <DialogDescription>Update the information for this student.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fName">First Name</Label>
                <Input 
                  id="edit-fName" 
                  value={editFormData.firstName} 
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lName">Last Name</Label>
                <Input 
                  id="edit-lName" 
                  value={editFormData.lastName} 
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
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
                  className="font-mono"
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
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editFormData.contactEmail} 
                  onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <Input 
                  id="edit-phone" 
                  value={editFormData.contactPhone} 
                  onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-primary">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
