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
  Phone,
  Download,
  AlertCircle,
  LayoutGrid,
  List
} from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Edit2 } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    role: "Staff", 
    department: "Administration",
    employeeId: "",
    status: "Active",
    joinDate: "",
    qualifications: "",
    bio: "",
    specialization: ""
  })
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  
  const firestore = useFirestore()
  const { user } = useUser()

  const usersRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users");
  }, [firestore, user]);

  const { data: users, isLoading } = useCollection(usersRef);

  const activeStaff = useMemo(() => {
    return (users || []).find(u => u.id === selectedStaffId) || null;
  }, [users, selectedStaffId]);

  const currentUserRecord = useMemo(() => {
    return (users || []).find(u => u.id === user?.uid);
  }, [users, user]);

  const isAuthorizedToManage = currentUserRecord?.role === "Admin" || user?.email === "clainyemblo@gmail.com";

  const filteredStaff = useMemo(() => {
    return (users || []).filter(u => {
      const searchStr = `${u.firstName} ${u.lastName} ${u.email} ${u.department} ${u.employeeId}`.toLowerCase()
      return searchStr.includes(searchTerm.toLowerCase());
    }).sort((a, b) => (a.role === "Admin" ? -1 : 1));
  }, [users, searchTerm]);

  const handleAddEmployee = () => {
    if (!firestore || !isAuthorizedToManage) return;
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const employeeId = `RTTC/STF/${Math.floor(1000 + Math.random() * 9000)}`;
    const tempId = `pre-${Date.now()}`;
    const userDocRef = doc(firestore, "users", tempId);

    setDocumentNonBlocking(userDocRef, {
      id: tempId,
      employeeId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      department: formData.department,
      status: "Active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Employee Added", description: `${formData.firstName} has been assigned ID: ${employeeId}` });
    setIsCreateOpen(false);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", role: "Staff", department: "Administration" });
  };

  const handleUpdateStaff = () => {
    if (!firestore || !isAuthorizedToManage || !activeStaff) return;
    
    const docRef = doc(firestore, "users", activeStaff.id);
    updateDocumentNonBlocking(docRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      role: formData.role,
      joinDate: formData.joinDate || "",
      qualifications: formData.qualifications || "",
      bio: formData.bio || "",
      specialization: formData.specialization || "",
      updatedAt: serverTimestamp(),
    });

    toast({ title: "Profile Updated", description: "Record has been saved successfully." });
    setIsEditOpen(false);
  };

  const handleOpenEdit = (staff: any) => {
    setSelectedStaffId(staff.id);
    setFormData({
      firstName: staff.firstName || "",
      lastName: staff.lastName || "",
      email: staff.email || "",
      phone: staff.phone || "",
      role: staff.role || "Staff",
      department: staff.department || "Administration",
      employeeId: staff.employeeId || "",
      status: staff.status || "Active",
      joinDate: staff.joinDate || "",
      qualifications: staff.qualifications || "",
      bio: staff.bio || "",
      specialization: staff.specialization || ""
    });
    setIsEditOpen(true);
  };


  const handleUpdateRole = (userId: string, newRole: string) => {
    if (!firestore || !isAuthorizedToManage) return;
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
    if (!firestore || !isAuthorizedToManage) return;
    if (confirm("Are you sure you want to remove this employee record?")) {
      deleteDocumentNonBlocking(doc(firestore, "users", userId));
      toast({
        title: "User Removed",
        description: "The employee record has been removed.",
      });
    }
  };

  const exportToCSV = () => {
    if (!filteredStaff.length) return;
    
    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Role", "Department"];
    const rows = filteredStaff.map(staff => [
      staff.id,
      staff.firstName,
      staff.lastName,
      staff.email,
      staff.phone || "N/A",
      staff.role || "Staff",
      staff.department || "N/A"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `staff_directory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: "Employee directory has been exported to CSV."
    });
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

        <div className="flex gap-2">
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm mr-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-10 p-0 rounded-lg ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-10 p-0 rounded-lg ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {isAuthorizedToManage && (
            <Button variant="outline" onClick={exportToCSV} disabled={filteredStaff.length === 0} className="rounded-xl">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          )}

          {isAuthorizedToManage && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 px-6">
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                <div className="bg-emerald-600 p-8 text-white">
                  <DialogTitle className="text-2xl font-black">Register Employee</DialogTitle>
                  <DialogDescription className="text-emerald-50 mt-1.5 opacity-90">
                    Create a professional record for a new staff member or lecturer.
                  </DialogDescription>
                </div>
                <div className="p-8 pt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fName" className="text-xs font-bold uppercase text-slate-500">First Name</Label>
                      <Input id="fName" className="h-11 bg-slate-50 border-slate-200" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lName" className="text-xs font-bold uppercase text-slate-500">Last Name</Label>
                      <Input id="lName" className="h-11 bg-slate-50 border-slate-200" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">Work Email</Label>
                    <Input id="email" type="email" className="h-11 bg-slate-50 border-slate-200 font-medium" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="j.doe@risabu.ac.ke" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500">Phone Number</Label>
                    <Input id="phone" className="h-11 bg-slate-50 border-slate-200" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+254 700 000 000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-500">Department</Label>
                      <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
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
                      <Label className="text-xs font-bold uppercase text-slate-500">Access Role</Label>
                      <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Staff">Standard Staff</SelectItem>
                          <SelectItem value="Admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAddEmployee} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl mt-4">
                    Complete Registration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
        <Input 
          placeholder="Search staff by name, email, ID or department..." 
          className="pl-11 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse">Retrieving records...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <Card key={staff.id} className={`group transition-all hover:shadow-lg border shadow-sm rounded-2xl overflow-hidden ${staff.role === 'Admin' ? 'border-emerald-100 bg-emerald-50/20' : 'bg-white'}`}>
                {/* ... existing card content ... */}
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-4 ring-white shadow-md">
                      <AvatarImage src={`https://picsum.photos/seed/${staff.id}/200/200`} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-black">
                        {staff.firstName?.[0]}{staff.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        {staff.firstName} {staff.lastName}
                        {staff.role === "Admin" && <ShieldAlert className="h-4 w-4 text-emerald-600" />}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-slate-400">
                        {staff.employeeId || `ID: ${staff.id.slice(0, 6).toUpperCase()}`}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-slate-100">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-xl border-slate-100">
                        <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Administration</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }} className="rounded-lg">
                          <UserCog className="mr-2 h-4 w-4 text-slate-500" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(staff)} className="rounded-lg">
                          <Edit2 className="mr-2 h-4 w-4 text-slate-500" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")} className="rounded-lg">
                          {staff.status === "Active" ? (
                            <><Lock className="mr-2 h-4 w-4 text-slate-500" /> Suspend Access</>
                          ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Activate Access</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 rounded-lg" onClick={() => handleDeleteUser(staff.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-2 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                      <Mail className="h-4 w-4 text-emerald-600/70" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                      <Briefcase className="h-4 w-4 text-emerald-600/70" />
                      <span>{staff.department || "General Staff"}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                        <Phone className="h-4 w-4 text-emerald-600/70" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <Badge className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-0 shadow-sm ${staff.role === "Admin" ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {staff.role || "Staff"}
                    </Badge>
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight ${staff.status === 'Suspended' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {staff.status === 'Suspended' ? (
                        <><AlertCircle className="h-3.5 w-3.5" /> Suspended</>
                      ) : (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
                      )}
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
      ) : (
        <Card className="border shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="w-[80px] h-12 text-[10px] font-black uppercase tracking-wider text-slate-400 pl-6">Avatar</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-wider text-slate-400">Employee Details</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-wider text-slate-400">Department</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-wider text-slate-400">Access Role</TableHead>
                <TableHead className="h-12 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="h-12 w-[50px] text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id} className="border-slate-100 group">
                    <TableCell className="py-3 pl-6">
                      <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${staff.id}/200/200`} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                          {staff.firstName?.[0]}{staff.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 leading-tight">{staff.firstName} {staff.lastName}</span>
                        <span className="text-[10px] font-mono text-slate-400">{staff.employeeId || staff.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs font-bold text-slate-600">{staff.department || "General"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-0 ${staff.role === "Admin" ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {staff.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${staff.status === 'Suspended' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {staff.status === 'Suspended' ? 'Suspended' : 'Active'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 pr-6 text-right">
                      {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-100">
                             <DropdownMenuItem onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }}>
                              <UserCog className="mr-2 h-4 w-4" /> View Profile
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleOpenEdit(staff)}>
                              <Edit2 className="mr-2 h-4 w-4 text-slate-500" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")}>
                              <Lock className="mr-2 h-4 w-4" /> Toggle Access
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={() => handleDeleteUser(staff.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-bold">No records matched your search.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {!isAuthorizedToManage && (
        <Card className="border-rose-200 bg-rose-50/50 rounded-2xl shadow-sm ring-1 ring-rose-200">
          <CardHeader className="flex flex-row items-start gap-4 p-5">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-rose-900 uppercase tracking-tight">Restricted Administrative View</CardTitle>
              <CardDescription className="text-xs font-medium text-rose-700 leading-relaxed mt-1">
                You are viewing the organizational directory. Modification of employee records, role assignments, and access suspension is strictly limited to authorized Administrators.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Staff Profile Sheet (View) */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto border-0 shadow-2xl p-0">
          {activeStaff && (
            <div className="flex flex-col h-full bg-white">
              <div className="bg-slate-50 px-8 pt-12 pb-8 border-b">
                <div className="flex flex-col items-center text-center gap-4">
                  <Avatar className="h-28 w-28 ring-4 ring-white shadow-xl">
                    <AvatarImage src={`https://picsum.photos/seed/${activeStaff.id}/200/200`} />
                    <AvatarFallback className="bg-emerald-600 text-white text-4xl font-black">
                      {activeStaff.firstName?.[0]}{activeStaff.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-3xl font-black text-slate-900">{activeStaff.firstName} {activeStaff.lastName}</SheetTitle>
                    <SheetDescription className="font-mono text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
                      {activeStaff.employeeId || activeStaff.id}
                    </SheetDescription>
                    <Badge className="mt-3 bg-slate-900 text-white rounded-lg px-4 py-1 text-[10px] font-black uppercase">
                      {activeStaff.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 space-y-10">
                <section>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Professional Identity</h3>
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Department</Label>
                      <p className="text-sm font-black text-slate-900">{activeStaff.department || "Administration"}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Join Date</Label>
                      <p className="text-sm font-black text-slate-900">{activeStaff.joinDate || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Qualifications</Label>
                      <p className="text-sm font-bold text-slate-700">{activeStaff.qualifications || "Not Recorded"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Specialization</Label>
                      <p className="text-sm font-bold text-slate-700">{activeStaff.specialization || "General"}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-600">{activeStaff.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-600">{activeStaff.phone || "No phone linked"}</span>
                    </div>
                  </div>
                </section>

                {activeStaff.bio && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Professional Biography</h3>
                    <p className="text-sm leading-relaxed text-slate-500 font-medium italic">
                      "{activeStaff.bio}"
                    </p>
                  </section>
                )}
              </div>

              <div className="p-8 border-t bg-slate-50 flex gap-3">
                <Button 
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20"
                  onClick={() => { setIsViewOpen(false); handleOpenEdit(activeStaff); }}
                >
                  Edit Professional Profile
                </Button>
                <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-slate-200" onClick={() => setIsViewOpen(false)}>
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Staff Editor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-emerald-600 p-8 text-white">
            <DialogTitle className="text-2xl font-black italic">Edit Staff Profile</DialogTitle>
            <DialogDescription className="text-emerald-50 opacity-80 mt-1">
              Updating institutional records for {formData.firstName} {formData.lastName}
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">First Name</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Last Name</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Department</Label>
                <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Access Role</Label>
                <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Standard Staff</SelectItem>
                    <SelectItem value="Admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Qualifications</Label>
              <Input value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="h-11 bg-slate-50 border-slate-200 rounded-xl" placeholder="e.g. PhD in Computer Science" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Professional Bio</Label>
              <textarea 
                className="w-full min-h-[100px] p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Brief professional background..."
              />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleUpdateStaff} className="flex-2 h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-12 rounded-xl font-black shadow-lg shadow-emerald-600/20">
                Update Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
