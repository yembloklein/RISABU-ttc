"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
import { Search, Plus, Filter, MoreHorizontal, UserCheck, XCircle, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"

export default function AdmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ firstName: "", lastName: "", course: "", email: "" })
  
  const firestore = useFirestore()
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "students");
  }, [firestore]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const filteredApplications = (students || []).filter(app => 
    app.admissionStatus !== "Enrolled" && // Only show prospective/pending ones in admissions
    (app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.appliedCourse && app.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const handleCreateApplication = () => {
    if (!studentsRef) return;
    
    addDocumentNonBlocking(studentsRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      contactEmail: formData.email,
      appliedCourse: formData.course,
      admissionStatus: "Applied",
      admissionDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    setIsDialogOpen(false);
    setFormData({ firstName: "", lastName: "", course: "", email: "" });
  };

  const handleStatusUpdate = (studentId: string, status: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "students", studentId);
    updateDocumentNonBlocking(docRef, {
      admissionStatus: status,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admissions Management</h1>
          <p className="text-muted-foreground">Process and track new student applications</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Student Application</DialogTitle>
              <DialogDescription>
                Enter the details of the prospective student to start the admission process.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course" className="text-right">Course</Label>
                <Input 
                  id="course" 
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                  placeholder="Diploma in ICT" className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com" className="col-span-3" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateApplication} className="bg-primary">Submit Application</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search applications..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">App ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Course Applied</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs font-semibold">{app.id.substring(0, 8)}</TableCell>
                    <TableCell className="font-medium">{app.firstName} {app.lastName}</TableCell>
                    <TableCell>{app.appliedCourse || 'N/A'}</TableCell>
                    <TableCell>{app.admissionDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        app.admissionStatus === "Approved" ? "default" :
                        app.admissionStatus === "Applied" ? "secondary" :
                        app.admissionStatus === "Rejected" ? "destructive" : "outline"
                      }>
                        {app.admissionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" variant="ghost" className="h-8 w-8 text-primary"
                          onClick={() => handleStatusUpdate(app.id, "Approved")}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                          onClick={() => handleStatusUpdate(app.id, "Rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No applications found matching your search.
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
