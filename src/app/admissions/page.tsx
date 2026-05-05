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
  Filter, 
  UserPlus,
  CheckCircle2,
  AlertCircle,
  BookOpen
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
  const [formData, setFormData] = useState({ firstName: "", lastName: "", course: "", email: "", phone: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()
  
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

  const filteredApplications = useMemo(() => {
    return (students || []).filter(app => {
      const matchesSearch = 
        app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.appliedCourse && app.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
        app.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = activeTab === "All" || app.admissionStatus === activeTab;
      
      // We generally only show non-enrolled students in the admissions pipeline
      const isNotEnrolled = app.admissionStatus !== "Enrolled";
      
      return matchesSearch && matchesTab && isNotEnrolled;
    })
  }, [students, searchTerm, activeTab]);

  const handleCreateApplication = () => {
    if (!studentsRef) return;
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.course) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields, including the target course.",
        variant: "destructive"
      });
      return;
    }

    addDocumentNonBlocking(studentsRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactEmail: formData.email,
      contactPhone: formData.phone,
      appliedCourse: formData.course,
      admissionStatus: "Applied",
      admissionDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    setIsCreateOpen(false);
    setFormData({ firstName: "", lastName: "", course: "", email: "", phone: "" });
    toast({ title: "Success", description: "Application submitted successfully." });
  };

  const handleStatusUpdate = (studentId: string, status: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "students", studentId);
    updateDocumentNonBlocking(docRef, {
      admissionStatus: status,
      updatedAt: serverTimestamp(),
    });
    toast({ 
      title: "Status Updated", 
      description: `Student marked as ${status}.` 
    });
  };

  const handleBulkImport = () => {
    if (!studentsRef || !bulkData.trim()) return;

    const lines = bulkData.trim().split('\n');
    let count = 0;

    lines.forEach(line => {
      const [first, last, email, course] = line.split(',').map(s => s.trim());
      if (first && last && email) {
        addDocumentNonBlocking(studentsRef, {
          firstName: first,
          lastName: last,
          contactEmail: email,
          appliedCourse: course || "General",
          admissionStatus: "Applied",
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
    
    const headers = ["ID", "First Name", "Last Name", "Email", "Course", "Status", "Date"];
    const rows = filteredApplications.map(app => [
      app.id,
      app.firstName,
      app.lastName,
      app.contactEmail,
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admissions Hub</h1>
          <p className="text-muted-foreground">Manage the enrollment funnel for prospective students</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={filteredApplications.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Bulk Import Applications</DialogTitle>
                <DialogDescription>
                  Paste comma-separated values (CSV format) below. <br/>
                  Format: <b>FirstName, LastName, Email, Course</b>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <textarea 
                  className="w-full h-48 p-3 text-sm font-mono border rounded-md focus:ring-2 focus:ring-primary outline-none"
                  placeholder="John, Doe, john@example.com, Diploma in ICT&#10;Jane, Smith, jane@example.com, Web Design"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleBulkImport} className="bg-primary">Start Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manual Application Entry</DialogTitle>
                <DialogDescription>
                  Enter prospective student details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="jane.doe@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+254..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Applied Course</Label>
                  <Select 
                    onValueChange={(v) => setFormData({...formData, course: v})}
                    value={formData.course}
                  >
                    <SelectTrigger className="w-full h-10 border-muted-foreground/20">
                      <SelectValue placeholder="Select target course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingPrograms ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : (programs || []).length > 0 ? (
                        programs?.map((program) => (
                          <SelectItem key={program.id} value={program.name}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{program.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          No courses found in catalog.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateApplication} className="bg-primary w-full h-11">Submit Application</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs defaultValue="All" className="w-full md:w-auto" onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Applied">Pending</TabsTrigger>
                <TabsTrigger value="Approved">Approved</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search name or course..." 
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Applicant Name</TableHead>
                <TableHead>Target Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead className="text-right">Process</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading applications...</p>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{app.id.substring(0, 6)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{app.firstName} {app.lastName}</span>
                        <span className="text-xs text-muted-foreground">{app.contactEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <BookOpen className="h-3 w-3 mr-1 text-primary" />
                        {app.appliedCourse || 'General'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        app.admissionStatus === "Approved" ? "default" :
                        app.admissionStatus === "Applied" ? "secondary" :
                        app.admissionStatus === "Rejected" ? "destructive" : "outline"
                      } className="rounded-md">
                        {app.admissionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.admissionDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {app.admissionStatus !== "Approved" && (
                          <Button 
                            size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/10"
                            onClick={() => handleStatusUpdate(app.id, "Approved")}
                            title="Approve"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {app.admissionStatus === "Approved" && (
                           <Button 
                            size="sm" variant="ghost" className="h-8 text-accent hover:bg-accent/10"
                            onClick={() => handleStatusUpdate(app.id, "Enrolled")}
                            title="Complete Enrollment"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {app.admissionStatus !== "Rejected" && (
                          <Button 
                            size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleStatusUpdate(app.id, "Rejected")}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                      <p>No applications found for this filter.</p>
                      {activeTab !== "All" && (
                        <Button variant="link" size="sm" onClick={() => setActiveTab("All")}>
                          View all records
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
