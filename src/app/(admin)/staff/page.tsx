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
  List,
  Users
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


  const stats = useMemo(() => {
    return {
      total: (users || []).length,
      active: (users || []).filter(u => u.status !== 'Suspended').length,
      admins: (users || []).filter(u => u.role === 'Admin').length,
      departments: new Set((users || []).map(u => u.department).filter(Boolean)).size
    }
  }, [users])

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Staff & Employee Directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage college employees, roles, and access</p>
        </div>
        
        <div className="flex gap-3">
          {isAuthorizedToManage && (
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredStaff.length === 0} className="h-9">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          )}
          {isAuthorizedToManage && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Admins", value: stats.admins, icon: ShieldAlert, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Departments", value: stats.departments, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50" }
        ].map((stat, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <Button variant="ghost" size="sm" className={`h-8 px-4 rounded-md text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Grid
          </Button>
          <Button variant="ghost" size="sm" className={`h-8 px-4 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} onClick={() => setViewMode('list')}>
            <List className="mr-2 h-3.5 w-3.5" /> List
          </Button>
        </div>

        <div className="relative flex-1 md:max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search employees..." 
            className="pl-9 h-10 bg-slate-50 border border-slate-200 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-lg text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
            <p className="text-slate-500 text-sm">Loading Directory...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <div key={staff.id} className="group relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                  {staff.role === 'Admin' && (
                    <div className="absolute top-3 right-3 h-6 w-6 bg-emerald-50 rounded-full flex items-center justify-center">
                      <ShieldAlert className="h-3 w-3 text-emerald-600" />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-16 w-16 mb-3">
                      <AvatarFallback className={`text-lg font-bold ${staff.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {staff.firstName?.[0]}{staff.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-base font-bold text-slate-900 mb-0.5">{staff.firstName} {staff.lastName}</h3>
                    <p className="text-xs text-slate-500 mb-4">{staff.department || "General Staff"}</p>
                    
                    <div className="flex gap-2 w-full mt-auto">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-medium" onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }}>
                        Profile
                      </Button>
                      {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200 p-1">
                            <DropdownMenuItem onClick={() => handleOpenEdit(staff)} className="text-xs">
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-400" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")} className="text-xs">
                              <Lock className="mr-2 h-3.5 w-3.5 text-slate-400" /> Toggle Access
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs text-rose-600 focus:bg-rose-50" onClick={() => handleDeleteUser(staff.id)}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Users className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-medium text-slate-900">No employees found</h3>
                <p className="text-slate-500 text-sm mt-1">Adjust your search or add a new record.</p>
              </div>
            )}
          </div>
        ) : (
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="font-semibold text-slate-500 text-xs pl-4">Employee</TableHead>
                  <TableHead className="font-semibold text-slate-500 text-xs">Department</TableHead>
                  <TableHead className="font-semibold text-slate-500 text-xs">Role</TableHead>
                  <TableHead className="font-semibold text-slate-500 text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-slate-500 text-xs text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id} className="border-slate-100 hover:bg-slate-50 group">
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs font-bold ${staff.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                              {staff.firstName?.[0]}{staff.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{staff.firstName} {staff.lastName}</span>
                            <span className="text-xs text-slate-500">{staff.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-slate-700">{staff.department || "General"}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="secondary" className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${staff.role === "Admin" ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium ${staff.status === 'Suspended' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {staff.status === 'Suspended' ? 'Suspended' : 'Active'}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 pr-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900 mr-2" onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }}>
                          Details
                        </Button>
                        {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200 p-1">
                               <DropdownMenuItem onClick={() => handleOpenEdit(staff)} className="text-xs">
                                <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-400" /> Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")} className="text-xs">
                                <Lock className="mr-2 h-3.5 w-3.5 text-slate-400" /> Toggle Access
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 focus:bg-rose-50 text-xs" onClick={() => handleDeleteUser(staff.id)}>
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">No records matched your search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {!isAuthorizedToManage && (
        <div className="mt-4">
          <Card className="border-rose-100 bg-rose-50/50 rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 p-4">
              <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-rose-900">Restricted Administrative View</CardTitle>
                <CardDescription className="text-xs text-rose-700 mt-0.5">
                  Modification of employee records is limited to authorized Administrators.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Staff Profile Sheet (View) */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="sm:max-w-[420px] overflow-y-auto border-l shadow-2xl p-0">
          {activeStaff && (
            <div className="flex flex-col h-full bg-white">
              <div className="px-6 pt-10 pb-6 flex flex-col items-center text-center gap-3 border-b border-slate-100">
                <Avatar className="h-20 w-20 border border-slate-200">
                  <AvatarFallback className="bg-emerald-50 text-emerald-600 text-2xl font-bold">
                    {activeStaff.firstName?.[0]}{activeStaff.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl font-bold text-slate-900">{activeStaff.firstName} {activeStaff.lastName}</SheetTitle>
                  <SheetDescription className="text-sm text-slate-500 mt-1">
                    {activeStaff.role} · {activeStaff.department || "General Staff"}
                  </SheetDescription>
                </div>
              </div>

              <div className="flex-1 px-6 py-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Employee ID</span>
                    <span className="font-mono text-sm text-slate-900">{activeStaff.employeeId || activeStaff.id.slice(0,8).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Join Date</span>
                    <span className="text-sm text-slate-900">{activeStaff.joinDate || "Not Recorded"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Email Address</span>
                    <span className="text-sm text-slate-900">{activeStaff.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Phone Number</span>
                    <span className="text-sm text-slate-900">{activeStaff.phone || "Not Recorded"}</span>
                  </div>
                  {(activeStaff.qualifications || activeStaff.specialization) && (
                    <div className="flex flex-col gap-1">
                       <span className="text-xs font-medium text-slate-500">Qualifications</span>
                       <span className="text-sm text-slate-900">{activeStaff.qualifications || activeStaff.specialization}</span>
                    </div>
                  )}
                </div>

                {activeStaff.bio && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 block mb-1">Biography</span>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {activeStaff.bio}
                    </p>
                  </div>
                )}
              </div>

              {isAuthorizedToManage && (
                <div className="p-6 border-t border-slate-100 mt-auto">
                  <Button 
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg"
                    onClick={() => { setIsViewOpen(false); handleOpenEdit(activeStaff); }}
                  >
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Staff Editor / Create Dialogs */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-xl">
          <div className="bg-emerald-600 p-6 text-white">
            <DialogTitle className="text-xl font-bold">Register Employee</DialogTitle>
            <DialogDescription className="text-emerald-50 mt-1 text-sm">
              Create a new staff member record.
            </DialogDescription>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fName" className="text-xs font-medium text-slate-700">First Name</Label>
                <Input id="fName" className="h-10" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lName" className="text-xs font-medium text-slate-700">Last Name</Label>
                <Input id="lName" className="h-10" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700">Work Email</Label>
              <Input id="email" type="email" className="h-10" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="j.doe@risabu.ac.ke" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium text-slate-700">Phone Number</Label>
              <Input id="phone" className="h-10" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+254..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Department</Label>
                <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Access Role</Label>
                <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Standard Staff</SelectItem>
                    <SelectItem value="Admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddEmployee} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg mt-2">
              Complete Registration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription className="text-slate-400 mt-1 text-sm">
              Updating records for {formData.firstName} {formData.lastName}
            </DialogDescription>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">First Name</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Last Name</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Department</Label>
                <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Access Role</Label>
                <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Standard Staff</SelectItem>
                    <SelectItem value="Admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Qualifications</Label>
              <Input value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="h-10" placeholder="e.g. PhD in CS" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Professional Bio</Label>
              <textarea 
                className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Brief professional background..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-10">Cancel</Button>
              <Button onClick={handleUpdateStaff} className="flex-[2] h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
