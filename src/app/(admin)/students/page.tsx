
"use client"

import { useState, useMemo, useRef } from "react"
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
  Edit2,
  UploadCloud,
  FileSpreadsheet
} from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  DialogTrigger,
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast, useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("Active")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<'id' | 'certificate' | null>(null)
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)

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

  const schoolDocsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "school_documents");
  }, [firestore]);
  
  const { data: schoolDocs } = useCollection(schoolDocsQuery);

  const idTemplateUrl = useMemo(() => schoolDocs?.find((d: any) => d.type === 'official_id_template')?.downloadURL, [schoolDocs]);
  const certificateTemplateUrl = useMemo(() => schoolDocs?.find((d: any) => d.type === 'official_certificate_template')?.downloadURL, [schoolDocs]);

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

  const handleStudentsExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const buffer = evt.target?.result;
          const wb = XLSX.read(buffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (data.length === 0) {
            toast({ title: "Empty File", description: "No data rows found in the spreadsheet.", variant: "destructive" });
            setImporting(false);
            return;
          }

          // Log actual headers for debugging
          const actualHeaders = Object.keys(data[0] as any);
          console.log("Excel headers detected:", actualHeaders);

          let successCount = 0;
          let updateCount = 0;
          let failCount = 0;

          // Helper: find column value using partial-match on cleaned key
          const findVal = (row: any, possibleKeys: string[]): string => {
            const entries = Object.entries(row);
            // 1. Exact clean match
            for (const [key, val] of entries) {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.]/g, '');
              if (possibleKeys.some(pk => cleanKey === pk)) return String(val ?? '');
            }
            // 2. Partial/contains match
            for (const [key, val] of entries) {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.]/g, '');
              if (possibleKeys.some(pk => cleanKey.includes(pk) || pk.includes(cleanKey))) return String(val ?? '');
            }
            return '';
          };

          for (const row of data as any[]) {
            // Use exact confirmed column names first, then fuzzy fallback
            const firstName = row['First Name'] || row['first name'] || row['FIRST NAME'] || findVal(row, ['firstname', 'first', 'fname', 'name', 'studentname', 'fullname', 'names', 'student']);
            const lastName  = row['Last Name']  || row['last name']  || row['LAST NAME']  || findVal(row, ['lastname', 'last', 'surname', 'lname']);
            const admNo     = (row['ADM'] || row['Adm'] || row['adm'] || row['ADM No'] || row['Adm No'] || findVal(row, ['admno', 'adm', 'admissionnumber', 'admission', 'regno', 'registrationnumber', 'studentid']) || '').toString().trim();
            const course    = row['Course'] || row['course'] || row['COURSE'] || findVal(row, ['course', 'program', 'appliedcourse', 'department', 'class']) || 'General Studies';
            const email     = row['Email'] || row['email'] || row['EMAIL'] || findVal(row, ['email', 'emailaddress', 'contactemail', 'mail']);
            const phone     = row['Phone'] || row['phone'] || row['PHONE'] || findVal(row, ['phone', 'phonenumber', 'contact', 'mobile', 'tel']);
            const gender    = row['Gender'] || row['gender'] || row['GENDER'] || findVal(row, ['gender', 'sex']);
            const dob       = row['DOB'] || row['dob'] || row['Date of Birth'] || row['date of birth'] || findVal(row, ['dob', 'dateofbirth', 'birthdate', 'birth']);
            const status    = row['STATUS'] || row['Status'] || row['status'] || findVal(row, ['status', 'state']) || 'Active';
            const address   = row['Address'] || row['address'] || findVal(row, ['address', 'location', 'residence', 'town', 'city']);

            // Debug: log first row to confirm detection
            if (data.indexOf(row) === 0) {
              console.log('First row parsed:', { firstName, lastName, admNo, course, email });
            }

            if (!firstName) {
              console.log('Skipping row (no firstName):', row);
              failCount++;
              continue;
            }

            if (firestore) {
              const studentsCollRef = collection(firestore, "students");
              
              // Find existing by admission number
              const existingStudent = admNo ? (students || []).find(s => s.admissionNumber === admNo) : null;
              
              if (existingStudent) {
                const docRef = doc(firestore, "students", existingStudent.id);
                updateDocumentNonBlocking(docRef, {
                  firstName: firstName.toString(),
                  lastName: lastName.toString(),
                  contactEmail: email.toString(),
                  contactPhone: phone.toString(),
                  address: address || existingStudent.address || '',
                  appliedCourse: course || 'General Studies',
                  gender: gender.toString(),
                  dateOfBirth: dob || existingStudent.dateOfBirth || '',
                  status: status.toString(),
                  admissionStatus: "Enrolled",
                  updatedAt: serverTimestamp(),
                });
                updateCount++;
              } else {
                addDocumentNonBlocking(studentsCollRef, {
                  firstName: firstName.toString(),
                  lastName: lastName.toString(),
                  contactEmail: email.toString(),
                  contactPhone: phone.toString(),
                  address: address || '',
                  appliedCourse: course || 'General Studies',
                  gender: gender.toString(),
                  dateOfBirth: dob || '',
                  status: status.toString(),
                  admissionNumber: admNo,
                  admissionStatus: "Enrolled",
                  admissionDate: new Date().toLocaleDateString('en-GB'),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                successCount++;
              }
            }
          }
          
          toast({
            title: "Import Complete",
            description: `Added ${successCount} new students. Updated ${updateCount} existing. ${failCount > 0 ? 'Skipped ' + failCount + ' invalid rows.' : ''}`,
          });
          setIsImportDialogOpen(false);
        } catch (err) {
          console.error("Excel processing error:", err);
          toast({ title: "Import Error", description: "Failed to parse Excel file. Please ensure it's a valid format.", variant: "destructive" });
        } finally {
          setImporting(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("File reading error:", error);
      toast({ title: "Import Error", description: "Failed to read file.", variant: "destructive" });
      setImporting(false);
      if (e.target) e.target.value = '';
    }
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
            {idTemplateUrl ? (
              <div className="w-[3.375in] h-[2.125in] relative overflow-hidden bg-white print:m-0">
                <img src={idTemplateUrl} className="absolute inset-0 w-full h-full object-cover z-0" crossOrigin="anonymous" />
                
                <div className="absolute z-10 top-[22%] left-[6%] w-[22%] h-[45%] bg-white/20 rounded-md flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-sm border border-white/30">
                  <span className="text-2xl font-black text-slate-800">
                    {activeStudent.firstName?.[0]}{activeStudent.lastName?.[0]}
                  </span>
                </div>
                
                <div className="absolute z-10 top-[25%] left-[32%] text-slate-900">
                  <p className="text-[12px] font-black leading-tight uppercase tracking-tight">{activeStudent.firstName} {activeStudent.lastName}</p>
                  <p className="text-[8px] font-bold text-slate-700 mt-1 uppercase max-w-[120px] leading-tight">{activeStudent.appliedCourse || "General Studies"}</p>
                  <p className="text-[9px] font-mono font-black mt-3 text-emerald-800">{activeStudent.admissionNumber || activeStudent.id.substring(0,8).toUpperCase()}</p>
                </div>
              </div>
            ) : (
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
                <div className="w-20 h-24 bg-primary/10 rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm flex items-center justify-center">
                  <span className="text-3xl font-black text-primary">
                    {activeStudent.firstName?.[0]}{activeStudent.lastName?.[0]}
                  </span>
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
            )}
          </div>
        </div>
      )}

      {activeStudent && printMode === 'certificate' && (
        <div id="certificate-print-container" className="hidden print:block fixed inset-0 bg-white z-[9999]">
          {certificateTemplateUrl ? (
            <div className="w-[11in] h-[8.5in] relative bg-white mx-auto print:m-0">
              <img src={certificateTemplateUrl} className="absolute inset-0 w-full h-full object-cover z-0" crossOrigin="anonymous" />
              
              <div className="absolute z-10 inset-0 flex flex-col items-center justify-center text-center">
                <div className="mt-[2.5in]">
                  <h3 className="text-6xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    {activeStudent.firstName} {activeStudent.lastName}
                  </h3>
                </div>
                
                <div className="mt-[1.2in]">
                  <h4 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                    {activeStudent.appliedCourse || "Professional Certification"}
                  </h4>
                </div>
                
                <div className="absolute bottom-[1in] left-[1.5in]">
                  <span className="font-mono text-[10px] opacity-60 uppercase tracking-[0.2em] text-slate-900">
                    {activeStudent.admissionNumber || activeStudent.id}
                  </span>
                </div>
              </div>
            </div>
          ) : (
          <div className="w-[11in] h-[8.5in] border-[12px] border-primary p-1 bg-white relative">
            <div className="w-full h-full border-[2px] border-primary p-12 flex flex-col items-center justify-between text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-32 -mt-32 rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 -ml-32 -mb-32 rounded-full"></div>
              
              <header className="space-y-6 w-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-slate-100 overflow-hidden">
                    <Logo size={80} />
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
          )}
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
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-500 font-medium text-sm">Total Enrolled</p>
                <div className="bg-blue-50 p-2 rounded-xl"><UserCircle className="h-5 w-5 text-blue-600" /></div>
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{stats.total}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-500 font-medium text-sm">Active Now</p>
                <div className="bg-emerald-50 p-2 rounded-xl"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{stats.active}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-500 font-medium text-sm">Graduated</p>
                <div className="bg-slate-100 p-2 rounded-xl"><Award className="h-5 w-5 text-slate-700" /></div>
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{stats.graduated}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-slate-500 font-medium text-sm">On Leave</p>
                <div className="bg-orange-50 p-2 rounded-xl"><Clock className="h-5 w-5 text-orange-600" /></div>
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{stats.onLeave}</h3>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <Tabs defaultValue="Active" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12 w-full md:w-auto overflow-x-auto justify-start md:justify-center shadow-sm">
            <TabsTrigger value="Active" className="rounded-lg px-6 font-medium h-full data-[state=active]:bg-slate-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500">Active</TabsTrigger>
            <TabsTrigger value="On Leave" className="rounded-lg px-6 font-medium h-full data-[state=active]:bg-slate-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500">On Leave</TabsTrigger>
            <TabsTrigger value="Graduated" className="rounded-lg px-6 font-medium h-full data-[state=active]:bg-slate-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500">Graduated</TabsTrigger>
            <TabsTrigger value="All" className="rounded-lg px-6 font-medium h-full data-[state=active]:bg-slate-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900 text-slate-500">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search students..." 
              className="pl-10 h-12 bg-white border-slate-200 rounded-xl focus-visible:ring-slate-300 shadow-sm w-full transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-xl font-medium shadow-sm bg-slate-900 hover:bg-slate-800 text-white transition-all">
                <UploadCloud className="mr-2 h-4 w-4" /> Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Import Students from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel (.xlsx) or CSV file containing existing student records.
                </DialogDescription>
                <div className="mt-4">
                  <span className="font-semibold text-slate-700">Supported Columns:</span>
                  <ul className="list-disc pl-5 mt-1 text-xs text-slate-600 space-y-1">
                    <li><b>First Name</b> (Required)</li>
                    <li><b>Last Name</b></li>
                    <li><b>Admission Number</b> (or ADM)</li>
                    <li><b>Course</b> (or Program)</li>
                    <li><b>Email</b>, <b>Phone</b>, <b>Gender</b>, <b>DOB</b>, <b>Status</b></li>
                  </ul>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="h-10 w-10 text-slate-400 mb-4" />
                  <Label htmlFor="student-excel-upload" className="cursor-pointer bg-white px-4 py-2 border shadow-sm rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors text-slate-700">
                    {importing ? "Processing..." : "Select Excel File"}
                  </Label>
                  <Input 
                    id="student-excel-upload" 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                    onChange={handleStudentsExcelUpload}
                    disabled={importing}
                  />
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    All imported students will be marked as "Enrolled" automatically.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]" title={student.contactEmail}>{student.contactEmail || "No Email"}</span>
                        <span className="text-xs text-slate-500">{student.contactPhone || "No Phone"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[150px] block" title={student.appliedCourse || "General Studies"}>
                        {student.appliedCourse || "General Studies"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-0 font-medium px-2.5 py-0.5 rounded-full text-xs ${
                        (student.status || "Active") === "Active" ? "bg-emerald-50 text-emerald-700" :
                        (student.status || "Active") === "On Leave" ? "bg-orange-50 text-orange-700" : 
                        (student.status || "Active") === "Graduated" ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700"
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
                                  <AvatarFallback className="text-xl">{activeStudent?.firstName?.[0]}{activeStudent?.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <SheetTitle className="text-2xl font-bold">{activeStudent?.firstName} {activeStudent?.lastName}</SheetTitle>
                                  <SheetDescription className="font-mono text-sm font-bold text-primary">ADM: {activeStudent?.admissionNumber || activeStudent?.id}</SheetDescription>
                                  <Badge className="mt-2">{activeStudent?.status || "Active"}</Badge>
                                </div>
                              </div>
                            </SheetHeader>
                            
                            <Tabs defaultValue="profile" className="mt-4">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="profile">Profile Details</TabsTrigger>
                                <TabsTrigger value="documents">Official Documents</TabsTrigger>
                              </TabsList>

                              <TabsContent value="profile" className="space-y-8 mt-4">
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
                              </TabsContent>

                              <TabsContent value="documents" className="mt-4">
                                <StudentDocumentsList student={activeStudent} />
                              </TabsContent>
                            </Tabs>
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

import { useStorage, useCollection as useCollectionQuery } from "@/firebase"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { addDoc, query, where, deleteDoc } from "firebase/firestore"
import { Download, Trash2, Plus, FileText, AlertTriangle } from "lucide-react"

function StudentDocumentsList({ student }: { student: any }) {
  const firestore = useFirestore()
  const storage = useStorage()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "student_documents"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: documents } = useCollectionQuery(docsQuery)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !student?.id || !firestore) return
    e.target.value = ""

    setUploading(true)
    setProgress(0)

    try {
      const storagePath = `student_documents/${student.id}/official/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed", 
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          (err) => reject(err),
          () => resolve()
        )
      })

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

      await addDoc(collection(firestore, "student_documents"), {
        studentId: student.id,
        category: "admission_letter", // Default to admission letter for this context, or let them choose
        categoryLabel: "Official Admission Letter",
        fileName: file.name,
        fileSize: file.size,
        downloadURL,
        storagePath,
        uploadedAt: serverTimestamp(),
        isOfficial: true // Mark as uploaded by admin
      })

      toast({ title: "Success", description: "Document uploaded to student profile." })
    } catch (error) {
      console.error(error)
      toast({ title: "Upload Failed", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docItem: any) => {
    if(!firestore) return
    try {
      await deleteObject(ref(storage, docItem.storagePath))
      await deleteDoc(doc(firestore, "student_documents", docItem.id))
      toast({ title: "Deleted", description: "Document removed." })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Issued Documents</h4>
        <Button size="sm" variant="outline" className="h-8 gap-2 font-bold" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Plus className="h-3.5 w-3.5" />
          Upload Official File
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      <div className="space-y-2">
        {documents?.filter(d => d.isOfficial).length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
             <p className="text-xs text-slate-400 font-medium">No official documents issued yet.</p>
          </div>
        ) : (
          documents?.filter(d => d.isOfficial).map((docItem) => (
            <div key={docItem.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{docItem.fileName}</p>
                  <p className="text-[10px] text-slate-400">{docItem.categoryLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                  <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(docItem)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {uploading && (
        <div className="space-y-2 pt-2">
          <Progress value={progress} className="h-1" />
          <p className="text-[10px] text-center font-bold text-primary uppercase animate-pulse">{progress}% Uploading...</p>
        </div>
      )}
    </div>
  )
}
