
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  ShieldCheck, 
  Mail, 
  UserCog, 
  Loader2, 
  MoreVertical, 
  ShieldAlert,
  Trash2,
  Lock,
  CheckCircle2,
  Plus,
  Briefcase,
  Phone
} from "lucide-react"
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
  DialogTrigger 
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

const DEPARTMENTS = [
  "Administration",
  "Registrar",
  "Finance",
  "ICT & Computing",
  "Engineering",
  "Business Studies",
  "Hospitality",
  "Security",
  "Maintenance"
]

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "",
    role: "Staff", 
    department: "Administration" 
  })
  
  const firestore = useFirestore()
  const { user } = useUser()
  const isAdmin = user?.email === "clainyemblo@gmail.com"

  const usersRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users");
  }, [firestore, user]);

  const { data: users, isLoading } = useCollection(usersRef);

  const filteredStaff = useMemo(() => {
    return (users || []).filter(u => {
      const matchesSearch = 
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm);
      
      return matchesSearch;
    }).sort((a, b) => (a.role === "Admin" ? -1 : 1));
  }, [users, searchTerm]);

  const handleAddEmployee = () => {
    if (!firestore || !isAdmin) return;
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const tempId = `pre-${Date.now()}`;
    const userDocRef = doc(firestore, "users", tempId);

    setDocumentNonBlocking(userDocRef, {
      id: tempId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      department: formData.department,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Employee Added", description: `${formData.firstName} has been recorded in the directory.` });
    setIsCreateOpen(false);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", role: "Staff", department: "Administration" });
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    if (!firestore || !isAdmin) return;
    const docRef = doc(firestore, "users", userId);
    updateDocumentNonBlocking(docRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    });
    toast({
      title: "Role Updated",
      description: `User role changed to ${newRole}.`,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!firestore || !isAdmin) return;
    if (confirm("Are you sure you want to remove this employee record?")) {
      deleteDocumentNonBlocking(doc(firestore, "users", userId));
      toast({
        title: "User Removed",
        description: "The employee record has been removed.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Staff & Employee Directory
          </h1>
          <p className="text-muted-foreground">Manage college employees and organizational departments</p>
        </div>

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Employee</DialogTitle>
                <DialogDescription>
                  Enter the professional details for the new staff member.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fName">First Name</Label>
                    <Input id="fName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lName">Last Name</Label>
                    <Input id="lName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="j.doe@risabu.ac.ke" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+254 700 000 000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEmployee} className="w-full bg-primary">Save Employee Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search staff by name, email, phone or department..." 
          className="pl-10 h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">Retrieving records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <Card key={staff.id} className={`group transition-all hover:shadow-md ${staff.role === 'Admin' ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-background ring-offset-2 ring-offset-muted">
                      <AvatarImage src={`https://picsum.photos/seed/${staff.id}/200/200`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {staff.firstName?.[0]}{staff.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {staff.firstName} {staff.lastName}
                        {staff.role === "Admin" && <ShieldAlert className="h-3.5 w-3.5 text-primary" />}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {staff.email}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {isAdmin && staff.email !== "clainyemblo@gmail.com" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Manage Access</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateRole(staff.id, "Staff")}>
                          <UserCog className="mr-2 h-4 w-4" /> Reset to Staff
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(staff.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4 text-primary/60" />
                      <span>{staff.department || "No Dept. Assigned"}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary/60" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={staff.role === "Admin" ? "default" : "secondary"} className="rounded-md px-2 py-0.5 text-[10px] uppercase font-bold tracking-tight">
                      {staff.role || "Staff"}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Active
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-muted/20 rounded-2xl border-2 border-dashed">
              <h3 className="text-lg font-semibold">No employees found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Your search did not return any records.
              </p>
            </div>
          )}
        </div>
      )}
      
      {!isAdmin && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-start gap-4 p-4">
            <Lock className="h-5 w-5 text-orange-600 mt-1" />
            <div>
              <CardTitle className="text-sm font-bold text-orange-900">Restricted Access</CardTitle>
              <CardDescription className="text-xs text-orange-700">
                You are viewing the employee directory. Only the Super Admin can add new staff or modify roles.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
