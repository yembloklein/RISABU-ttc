const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', '(admin)', 'staff', 'page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Add stats useMemo before return
const statsMemo = `
  const stats = useMemo(() => {
    return {
      total: (users || []).length,
      active: (users || []).filter(u => u.status !== 'Suspended').length,
      admins: (users || []).filter(u => u.role === 'Admin').length,
      departments: new Set((users || []).map(u => u.department).filter(Boolean)).size
    }
  }, [users])
`;

const exportMatch = code.indexOf('const exportToCSV = () => {');
const returnMatch = code.indexOf('return (', exportMatch);

let topPart = code.substring(0, returnMatch);
// insert statsMemo right before return
topPart = topPart.trimEnd() + '\n\n' + statsMemo + '\n\n';

const newJSX = `  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-64 h-64 -mt-12 -mr-12" />
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" /> Administration
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Staff Directory</h1>
              <p className="text-emerald-100/80 text-lg font-medium max-w-xl leading-relaxed">
                Manage organizational hierarchy, roles, faculty credentials, and system access.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthorizedToManage && (
                <Button variant="outline" onClick={exportToCSV} disabled={filteredStaff.length === 0} className="h-14 px-8 rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all backdrop-blur-md">
                  <Download className="mr-2 h-5 w-5" /> Export Data
                </Button>
              )}
              {isAuthorizedToManage && (
                <Button className="h-14 px-8 bg-white hover:bg-emerald-50 text-emerald-900 font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-5 w-5" /> Add Employee
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-8 relative z-20 px-4 md:px-8">
        {[
          { label: "Total Staff", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Admins", value: stats.admins, icon: ShieldAlert, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Departments", value: stats.departments, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50" }
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden bg-white hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 flex items-center gap-5">
              <div className={\`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 \${stat.bg} \${stat.color}\`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mx-4 md:mx-8">
        <div className="flex items-center bg-slate-50 p-1.5 rounded-xl w-full md:w-auto">
          <Button variant="ghost" size="sm" className={\`h-11 px-8 rounded-lg font-bold text-sm transition-all \${viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}\`} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="mr-2 h-4 w-4" /> Grid
          </Button>
          <Button variant="ghost" size="sm" className={\`h-11 px-8 rounded-lg font-bold text-sm transition-all \${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}\`} onClick={() => setViewMode('list')}>
            <List className="mr-2 h-4 w-4" /> List
          </Button>
        </div>

        <div className="relative flex-1 md:max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search employees..." 
            className="pl-12 h-14 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl font-medium w-full text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 md:px-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-6" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm animate-pulse">Loading Directory...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <div key={staff.id} className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {staff.role === 'Admin' && (
                    <div className="absolute -top-3 -right-3 h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10">
                      <ShieldAlert className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4 ring-4 ring-slate-50">
                      <AvatarFallback className={\`text-3xl font-black \${staff.role === 'Admin' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}\`}>
                        {staff.firstName?.[0]}{staff.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-xl font-black text-slate-900 mb-1">{staff.firstName} {staff.lastName}</h3>
                    <p className="text-sm font-bold text-slate-500 mb-4">{staff.department || "General Staff"}</p>
                    
                    <div className="flex gap-2 w-full">
                      <Button variant="secondary" className="flex-1 rounded-xl h-10 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold" onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }}>
                        Profile
                      </Button>
                      {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-500">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-slate-100 p-2">
                            <DropdownMenuItem onClick={() => handleOpenEdit(staff)} className="rounded-xl font-medium">
                              <Edit2 className="mr-2 h-4 w-4 text-slate-400" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")} className="rounded-xl font-medium">
                              <Lock className="mr-2 h-4 w-4 text-slate-400" /> Toggle Access
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 focus:bg-rose-50 rounded-xl font-medium" onClick={() => handleDeleteUser(staff.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700">No employees found</h3>
                <p className="text-slate-500 font-medium mt-2">Adjust your search or add a new record.</p>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="h-14 font-bold uppercase tracking-wider text-slate-500 text-[11px] pl-6">Employee</TableHead>
                  <TableHead className="h-14 font-bold uppercase tracking-wider text-slate-500 text-[11px]">Department</TableHead>
                  <TableHead className="h-14 font-bold uppercase tracking-wider text-slate-500 text-[11px]">Role</TableHead>
                  <TableHead className="h-14 font-bold uppercase tracking-wider text-slate-500 text-[11px]">Status</TableHead>
                  <TableHead className="h-14 font-bold uppercase tracking-wider text-slate-500 text-[11px] text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id} className="border-slate-50 hover:bg-slate-50/50 group">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className={\`font-black \${staff.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}\`}>
                              {staff.firstName?.[0]}{staff.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">{staff.firstName} {staff.lastName}</span>
                            <span className="text-[11px] font-bold text-slate-500 mt-0.5">{staff.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm font-bold text-slate-700">{staff.department || "General"}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="secondary" className={\`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest \${staff.role === "Admin" ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}\`}>
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className={\`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest \${staff.status === 'Suspended' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}\`}>
                          <span className={\`h-1.5 w-1.5 rounded-full \${staff.status === 'Suspended' ? 'bg-rose-500' : 'bg-emerald-500'}\`}></span>
                          {staff.status === 'Suspended' ? 'Suspended' : 'Active'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <Button variant="ghost" className="h-9 font-bold text-xs text-slate-500 hover:text-slate-900 mr-2 rounded-lg" onClick={() => { setSelectedStaffId(staff.id); setIsViewOpen(true); }}>
                          Details
                        </Button>
                        {isAuthorizedToManage && staff.email !== "clainyemblo@gmail.com" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-slate-100 p-2">
                               <DropdownMenuItem onClick={() => handleOpenEdit(staff)} className="rounded-xl font-medium">
                                <Edit2 className="mr-2 h-4 w-4 text-slate-400" /> Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(staff.id, staff.status === "Active" ? "Suspended" : "Active")} className="rounded-xl font-medium">
                                <Lock className="mr-2 h-4 w-4 text-slate-400" /> Toggle Access
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 focus:bg-rose-50 rounded-xl font-medium" onClick={() => handleDeleteUser(staff.id)}>
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
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold">No records matched your search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {!isAuthorizedToManage && (
        <div className="px-4 md:px-8 mt-4">
          <Card className="border-rose-100 bg-rose-50/50 rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-rose-900 uppercase tracking-tight">Restricted Administrative View</CardTitle>
                <CardDescription className="text-sm font-medium text-rose-700 mt-1">
                  You are viewing the organizational directory. Modification of employee records is limited to authorized Administrators.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Staff Profile Sheet (View) */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto border-0 shadow-2xl p-0">
          {activeStaff && (
            <div className="flex flex-col h-full bg-slate-50">
              <div className="px-8 pt-12 pb-8 flex flex-col items-center text-center bg-white border-b border-slate-100 shadow-sm relative z-10">
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl mb-6">
                  <AvatarFallback className="bg-emerald-600 text-white text-5xl font-black">
                    {activeStaff.firstName?.[0]}{activeStaff.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <SheetTitle className="text-3xl font-black text-slate-900">{activeStaff.firstName} {activeStaff.lastName}</SheetTitle>
                <SheetDescription className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 uppercase font-black text-[10px] px-3">
                    {activeStaff.role}
                  </Badge>
                  • {activeStaff.department || "General Staff"}
                </SheetDescription>
              </div>

              <div className="flex-1 px-8 py-8 space-y-6">
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Employee ID</span>
                      <span className="font-mono text-lg font-black text-emerald-700">{activeStaff.employeeId || activeStaff.id.slice(0,8).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-1 pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Join Date</span>
                      <span className="font-bold text-slate-900">{activeStaff.joinDate || "Not Recorded"}</span>
                    </div>
                    <div className="flex flex-col gap-1 pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</span>
                      <span className="font-bold text-slate-900 truncate">{activeStaff.email}</span>
                    </div>
                    <div className="flex flex-col gap-1 pb-4 border-b border-slate-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</span>
                      <span className="font-bold text-slate-900">{activeStaff.phone || "Not Recorded"}</span>
                    </div>
                    {(activeStaff.qualifications || activeStaff.specialization) && (
                      <div className="flex flex-col gap-1">
                         <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Qualifications</span>
                         <span className="font-bold text-slate-900 leading-snug">{activeStaff.qualifications || activeStaff.specialization}</span>
                      </div>
                    )}
                  </div>
                </div>

                {activeStaff.bio && (
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-3">Biography</span>
                    <p className="text-sm leading-relaxed text-slate-600 font-medium italic">
                      "{activeStaff.bio}"
                    </p>
                  </div>
                )}
              </div>

              {isAuthorizedToManage && (
                <div className="p-6 bg-white border-t border-slate-100 mt-auto">
                  <Button 
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all text-base"
                    onClick={() => { setIsViewOpen(false); handleOpenEdit(activeStaff); }}
                  >
                    Edit Profile Details
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Staff Editor / Create Dialogs */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-[2rem]">
          <div className="bg-emerald-600 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Plus className="w-48 h-48 -mt-12 -mr-12" />
            </div>
            <DialogTitle className="text-3xl font-black relative z-10">Register Employee</DialogTitle>
            <DialogDescription className="text-emerald-50 mt-2 text-base font-medium relative z-10">
              Create a professional record for a new staff member or lecturer.
            </DialogDescription>
          </div>
          <div className="p-10 pt-8 space-y-6 bg-slate-50">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fName" className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name</Label>
                <Input id="fName" className="h-14 bg-white border-slate-200 rounded-2xl font-bold" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lName" className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name</Label>
                <Input id="lName" className="h-14 bg-white border-slate-200 rounded-2xl font-bold" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Work Email</Label>
              <Input id="email" type="email" className="h-14 bg-white border-slate-200 rounded-2xl font-bold" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="j.doe@risabu.ac.ke" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</Label>
              <Input id="phone" className="h-14 bg-white border-slate-200 rounded-2xl font-bold" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+254 700 000 000" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</Label>
                <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                  <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                    <SelectValue placeholder="Select Dept" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept} className="font-medium rounded-xl">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Role</Label>
                <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                  <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Staff" className="font-medium rounded-xl">Standard Staff</SelectItem>
                    <SelectItem value="Admin" className="font-medium rounded-xl">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddEmployee} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl mt-4 shadow-lg shadow-emerald-600/20 text-base transition-all">
              Complete Registration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <div className="bg-slate-900 p-10 text-white">
            <DialogTitle className="text-3xl font-black">Edit Staff Profile</DialogTitle>
            <DialogDescription className="text-slate-400 mt-2 text-base font-medium">
              Updating institutional records for <span className="text-white">{formData.firstName} {formData.lastName}</span>
            </DialogDescription>
          </div>
          <div className="p-10 space-y-6 bg-slate-50">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="h-14 bg-white border-slate-200 rounded-2xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="h-14 bg-white border-slate-200 rounded-2xl font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</Label>
                <Select onValueChange={(v) => setFormData({...formData, department: v})} defaultValue={formData.department}>
                  <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept} className="font-medium rounded-xl">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Role</Label>
                <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                  <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Staff" className="font-medium rounded-xl">Standard Staff</SelectItem>
                    <SelectItem value="Admin" className="font-medium rounded-xl">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Qualifications</Label>
              <Input value={formData.qualifications} onChange={(e) => setFormData({...formData, qualifications: e.target.value})} className="h-14 bg-white border-slate-200 rounded-2xl font-bold" placeholder="e.g. PhD in Computer Science" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Professional Bio</Label>
              <textarea 
                className="w-full min-h-[120px] p-5 text-sm bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium resize-none"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Brief professional background..."
              />
            </div>
            <div className="flex gap-4 pt-6">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-slate-500 border-slate-200">Cancel</Button>
              <Button onClick={handleUpdateStaff} className="flex-[2] h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-xl text-base transition-all">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
`;

const finalContent = topPart + newJSX;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully replaced file content');
