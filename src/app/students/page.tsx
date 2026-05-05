
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
  Printer
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("Active")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"

  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "students");
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const filteredStudents = useMemo(() => {
    return (students || []).filter(stu => {
      // We only show enrolled students in the directory
      if (stu.admissionStatus !== "Enrolled") return false;

      const matchesSearch = 
        stu.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stu.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stu.appliedCourse && stu.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

  const handlePrintID = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable ID Card Component (Hidden in UI, visible on Print) */}
      {selectedStudent && (
        <div id="id-card-print-container" className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-[3.375in] h-[2.125in] border-2 border-primary rounded-xl overflow-hidden flex flex-col relative bg-white shadow-none">
              {/* Card Header */}
              <div className="bg-primary p-2 flex items-center gap-2">
                <div className="bg-white p-1 rounded-md">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white uppercase leading-none">Risabu Technical</span>
                  <span className="text-[8px] text-white/80 leading-none">Training College</span>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="flex p-3 gap-3 flex-1">
                <div className="w-20 h-24 bg-muted rounded-md overflow-hidden border">
                  <img 
                    src={`https://picsum.photos/seed/${selectedStudent.id}/200/200`} 
                    alt="Photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-1 gap-1">
                  <div className="mb-1">
                    <span className="text-[7px] text-muted-foreground uppercase block">Student Name</span>
                    <span className="text-sm font-bold leading-tight block">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  </div>
                  <div>
                    <span className="text-[7px] text-muted-foreground uppercase block">Course</span>
                    <span className="text-[10px] font-medium leading-tight block truncate max-w-[120px]">
                      {selectedStudent.appliedCourse || "General Studies"}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-auto">
                    <div>
                      <span className="text-[7px] text-muted-foreground uppercase block">ID Number</span>
                      <span className="text-[9px] font-mono font-bold block">{selectedStudent.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[7px] text-muted-foreground uppercase block">Admitted</span>
                      <span className="text-[9px] font-bold block">{selectedStudent.admissionDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t px-3 py-1 flex justify-between items-center bg-muted/20">
                <span className="text-[7px] font-medium text-muted-foreground italic">Authorized Institutional ID</span>
                <div className="w-16 h-4 border-b border-black/30"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold">Student Directory</h1>
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
              placeholder="Search name, ID or course..." 
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
                      <CardDescription className="font-mono text-[10px] uppercase tracking-wider">{student.id.substring(0, 8)}</CardDescription>
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
                      <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                        <UserCircle className="mr-2 h-4 w-4" /> View Full Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" /> Email Student
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
                    <Badge variant="outline" className="bg-muted/30">Year 1</Badge>
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
                    <Sheet onOpenChange={(open) => { if(!open) setSelectedStudent(null) }}>
                      <SheetTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setSelectedStudent(student)}
                        >
                          Quick View Details
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                        <SheetHeader className="pb-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-4 border-primary/10">
                              <AvatarImage src={`https://picsum.photos/seed/${selectedStudent?.id}/200/200`} />
                              <AvatarFallback className="text-xl">{selectedStudent?.firstName?.[0]}{selectedStudent?.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <SheetTitle className="text-2xl font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</SheetTitle>
                              <SheetDescription className="font-mono text-xs">Student ID: {selectedStudent?.id}</SheetDescription>
                              <Badge className="mt-2">{selectedStudent?.status || "Active"}</Badge>
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
                                <p className="font-medium">{selectedStudent?.firstName} {selectedStudent?.lastName}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block">Date of Birth</label>
                                <p className="font-medium">{selectedStudent?.dateOfBirth || "12-05-2002"}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block">Gender</label>
                                <p className="font-medium">{selectedStudent?.gender || "Not Specified"}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block">Address</label>
                                <p className="font-medium">{selectedStudent?.address || "Mombasa Road, Nairobi"}</p>
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
                                <p className="font-medium">{selectedStudent?.appliedCourse || "Diploma in Graphics Design"}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block">Admission Date</label>
                                <p className="font-medium">{selectedStudent?.admissionDate}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block">Academic Year</label>
                                <p className="font-medium">2024 - 2025</p>
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
                                <span className="font-medium">{selectedStudent?.contactEmail}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Phone Number</span>
                                <span className="font-medium">{selectedStudent?.contactPhone || "+254 700 000000"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Emergency Contact</span>
                                <span className="font-medium">Parent/Guardian</span>
                              </div>
                            </div>
                          </section>
                          
                          <div className="flex gap-2 pt-6">
                            <Button className="flex-1 bg-primary" onClick={handlePrintID}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print ID Card
                            </Button>
                            <Button variant="outline" className="flex-1">Edit Records</Button>
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
                We couldn't find any enrolled students matching your search criteria or the selected status filter.
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
    </div>
  )
}
