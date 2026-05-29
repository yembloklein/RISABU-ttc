const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(admin)/students/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Stats Dashboard
content = content.replace(
  /<div className="flex flex-col gap-6 no-print animate-in fade-in slide-in-from-bottom-4 duration-700">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Control Bar -->/g,
  `{/* Header & Stats Dashboard */}
      <div className="flex flex-col gap-6 no-print animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Student Management</p>
            <h1 className="text-2xl font-bold text-slate-900">Scholars Directory</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage profiles, track progress, and issue credentials.</p>
          </div>
        </div>

        {/* Minimalist Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-blue-50 p-2 rounded-lg"><UserCircle className="h-4 w-4 text-blue-600" /></div>
                <p className="text-slate-400 font-medium text-xs text-right leading-tight">Total Enrolled</p>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-emerald-50 p-2 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                <p className="text-slate-400 font-medium text-xs text-right leading-tight">Active Now</p>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{stats.active}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-100 p-2 rounded-lg"><Award className="h-4 w-4 text-slate-600" /></div>
                <p className="text-slate-400 font-medium text-xs text-right leading-tight">Graduated</p>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{stats.graduated}</h3>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-orange-50 p-2 rounded-lg"><Clock className="h-4 w-4 text-orange-600" /></div>
                <p className="text-slate-400 font-medium text-xs text-right leading-tight">On Leave</p>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{stats.onLeave}</h3>
            </CardContent>
          </Card>
        </div>
      </div>
      <!-- Control Bar -->`
);

// We need a more robust replacement strategy for the whole file. 
// Let's just do a series of exact string replacements for key classes.
const replacements = [
  // Stats row wrapper
  [/<Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">/g, '<Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">'],
  [/<CardContent className="p-5">/g, '<CardContent className="p-4">'],
  [/<h3 className="text-4xl font-bold text-slate-900">/g, '<h3 className="text-2xl font-bold text-slate-900">'],
  
  // Headers
  [/<h1 className="text-4xl font-black tracking-tight text-slate-900">/g, '<p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Student Management</p>\n            <h1 className="text-2xl font-bold text-slate-900">'],
  [/<p className="text-muted-foreground mt-1 font-medium text-lg">/g, '<p className="text-sm text-slate-500 mt-0.5">'],

  // Tabs
  [/<TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12 w-full md:w-auto overflow-x-auto justify-start md:justify-center shadow-sm">/g, '<TabsList className="bg-slate-100 p-1 rounded-lg h-9 w-full md:w-auto overflow-x-auto justify-start md:justify-center">'],
  [/className="rounded-lg px-6 font-medium h-full data-\[state=active\]:bg-slate-100 data-\[state=active\]:shadow-none data-\[state=active\]:text-slate-900 text-slate-500"/g, 'className="rounded-md px-3 text-xs font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 text-slate-500"'],
  
  // Search & Import
  [/<Input \n              placeholder="Search students..." \n              className="pl-10 h-12 bg-white border-slate-200 rounded-xl focus-visible:ring-slate-300 shadow-sm w-full transition-all"/g, '<Input \n              placeholder="Search students..." \n              className="pl-9 h-9 border-slate-200 rounded-lg text-sm focus-visible:ring-emerald-500 w-full"'],
  [/<Search className="absolute left-3.5 top-1\/2 -translate-y-1\/2 h-4 w-4 text-slate-400" \/>/g, '<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />'],
  [/<Button className="h-12 px-6 rounded-xl font-medium shadow-sm bg-slate-900 hover:bg-slate-800 text-white transition-all">/g, '<Button className="h-9 px-4 rounded-lg text-sm font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all">'],

  // Dialogs
  [/<DialogContent className="sm:max-w-\[425px\]">/g, '<DialogContent className="sm:max-w-[425px] border border-slate-200 shadow-lg rounded-xl">'],
  [/<DialogTitle>Import Students from Excel<\/DialogTitle>/g, '<DialogTitle className="text-lg font-bold text-slate-900">Import Students from Excel</DialogTitle>'],
  [/<DialogDescription>/g, '<DialogDescription className="text-sm text-slate-500 mt-1">'],
  
  // Tables
  [/<Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden no-print">/g, '<Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden no-print bg-white"><div className="overflow-x-auto">'],
  [/<\/Table>\n        <\/Card>/g, '<\/Table>\n        </div>\n        </Card>'],
  [/<TableHeader className="bg-slate-50">/g, '<TableHeader className="bg-slate-50/50">'],
  [/<TableRow>\n                <TableHead className="w-\[300px\]">Student Info<\/TableHead>\n                <TableHead>Contact Details<\/TableHead>\n                <TableHead>Program<\/TableHead>\n                <TableHead>Status<\/TableHead>\n                <TableHead className="text-right">Actions<\/TableHead>\n              <\/TableRow>/g, '<TableRow className="border-slate-100 hover:bg-transparent">\n                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5 w-[280px]">Student Info</TableHead>\n                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Contact Details</TableHead>\n                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Program</TableHead>\n                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Status</TableHead>\n                <TableHead className="text-right font-semibold text-slate-500 h-10 text-xs pr-5">Actions</TableHead>\n              </TableRow>'],
  [/<TableRow key={student.id} className="group hover:bg-slate-50\/50">/g, '<TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">'],
  
  // Table Cells
  [/<TableCell>/g, '<TableCell className="py-3">'],
  [/<TableCell className="text-right">/g, '<TableCell className="text-right pr-5 py-3">'],
  
  // Avatars to rounded-lg initials
  [/<Avatar className="h-10 w-10 border border-slate-200 rounded-md">\n                          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold rounded-md">\n                            {student.firstName\[0\]}{student.lastName\[0\]}\n                          <\/AvatarFallback>\n                        <\/Avatar>/g, '<div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">\n                          {student.firstName[0]}{student.lastName[0]}\n                        </div>'],

  // Sheet
  [/<Button \n                              variant="ghost" \n                              size="sm"\n                              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 rounded-md"/g, '<Button \n                              variant="ghost" \n                              size="sm"\n                              className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 rounded-md"'],
  [/<SheetContent className="sm:max-w-\[500px\] overflow-y-auto text-left">/g, '<SheetContent className="sm:max-w-[500px] overflow-y-auto text-left border-l border-slate-200">'],
  [/<SheetHeader className="pb-6">/g, '<SheetHeader className="pb-6 border-b border-slate-100">'],
  [/<Avatar className="h-20 w-20 border-4 border-primary\/10">\n                                  <AvatarFallback className="text-xl">{activeStudent\?\.firstName\?\.\[0\]}{activeStudent\?\.lastName\?\.\[0\]}<\/AvatarFallback>\n                                <\/Avatar>/g, '<div className="h-16 w-16 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-2xl shrink-0">\n                                  {activeStudent?.firstName?.[0]}{activeStudent?.lastName?.[0]}\n                                </div>'],
  [/<SheetTitle className="text-2xl font-bold">/g, '<SheetTitle className="text-xl font-bold text-slate-900">'],
  [/<SheetDescription className="font-mono text-sm font-bold text-primary">/g, '<SheetDescription className="font-mono text-xs font-bold text-emerald-600 mt-0.5">'],
  
  // Badges
  [/<Badge className="mt-2">/g, '<Badge variant="outline" className={`mt-2 border-0 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${\n                                    (activeStudent?.status || "Active") === "Active" ? "bg-emerald-50 text-emerald-700" :\n                                    (activeStudent?.status || "Active") === "On Leave" ? "bg-orange-50 text-orange-700" : \n                                    (activeStudent?.status || "Active") === "Graduated" ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700"\n                                  }`}>'],
  
  // Inner Tabs
  [/<TabsList className="grid w-full grid-cols-2">/g, '<TabsList className="bg-slate-100 p-1 rounded-lg w-full grid grid-cols-2 h-9">'],
  [/<TabsTrigger value="profile">/g, '<TabsTrigger value="profile" className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">'],
  [/<TabsTrigger value="documents">/g, '<TabsTrigger value="documents" className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">'],
  
  // Typography inside sheet
  [/<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">/g, '<h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">'],
  [/<UserCircle className="h-4 w-4 text-primary" \/>/g, '<UserCircle className="h-4 w-4 text-emerald-600" />'],
  [/<GraduationCap className="h-4 w-4 text-primary" \/>/g, '<GraduationCap className="h-4 w-4 text-emerald-600" />'],
  [/<Phone className="h-4 w-4 text-primary" \/>/g, '<Phone className="h-4 w-4 text-emerald-600" />'],
  
  [/<div className="grid grid-cols-2 gap-4 bg-muted\/30 p-4 rounded-xl text-sm">/g, '<div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm">'],
  [/<div className="space-y-3 bg-muted\/30 p-4 rounded-xl text-sm">/g, '<div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm">'],
  [/<label className="text-xs text-muted-foreground block">/g, '<label className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold mb-0.5">'],
  [/<p className="font-bold text-primary">/g, '<p className="font-bold text-emerald-600">'],
  [/<span className="text-muted-foreground">/g, '<span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">'],
  [/<span className="font-medium">/g, '<span className="font-medium text-slate-900">'],
  [/<p className="font-medium">/g, '<p className="font-medium text-slate-900">'],
  
  // Sheet buttons
  [/<Button className="flex-1 bg-primary" onClick={\(\) => handlePrintID\(activeStudent\)}>/g, '<Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10" onClick={() => handlePrintID(activeStudent)}>'],
  [/<Button \n                                      variant="outline" \n                                      className="flex-1"\n                                      onClick={\(\) => handleOpenEditDialog\(activeStudent\)}\n                                    >/g, '<Button \n                                      variant="outline" \n                                      className="flex-1 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 h-10"\n                                      onClick={() => handleOpenEditDialog(activeStudent)}\n                                    >'],
  [/<Button className="w-full bg-accent hover:bg-accent\/90" onClick={\(\) => handlePrintCertificate\(activeStudent\)}>/g, '<Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-10 mt-1" onClick={() => handlePrintCertificate(activeStudent)}>'],
  
  // Print Template colors
  [/border-\[3px\] border-primary/g, 'border-[3px] border-emerald-700'],
  [/bg-primary/g, 'bg-emerald-700'],
  [/text-primary/g, 'text-emerald-700'],
  [/bg-primary\/10/g, 'bg-emerald-50'],
  [/border-primary\/20/g, 'border-emerald-100'],
  [/border-primary\/10/g, 'border-emerald-100'],
  [/bg-primary\/\[0.03\]/g, 'bg-emerald-50/30'],
  [/border-primary\/30/g, 'border-emerald-700/30'],
  
  // Edit Dialog
  [/<DialogContent className="sm:max-w-\[600px\]">/g, '<DialogContent className="sm:max-w-[600px] border border-slate-200 shadow-lg rounded-xl">'],
  [/<DialogTitle>Edit Student Record<\/DialogTitle>/g, '<DialogTitle className="text-lg font-bold text-slate-900">Edit Student Record</DialogTitle>'],
  [/<DialogDescription>Update the full professional profile for this scholar.<\/DialogDescription>/g, '<DialogDescription className="text-sm text-slate-500 mt-1">Update the full professional profile for this scholar.</DialogDescription>'],
  [/<DialogFooter className="bg-muted\/30 p-4 -mx-6 -mb-6 border-t mt-4">/g, '<DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">'],
  [/<Button variant="outline" onClick={\(\) => setIsEditDialogOpen\(false\)}>Cancel<\/Button>/g, '<Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-lg h-10 border-slate-200">Cancel</Button>'],
  [/<Button onClick={handleSaveEdit} className="bg-primary px-8">Update Scholar Record<\/Button>/g, '<Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10 px-8">Update Scholar Record</Button>'],
  
  // Form Inputs
  [/<Label htmlFor="edit-fName">/g, '<Label htmlFor="edit-fName" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-lName">/g, '<Label htmlFor="edit-lName" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-adm">/g, '<Label htmlFor="edit-adm" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-dob">/g, '<Label htmlFor="edit-dob" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-email">/g, '<Label htmlFor="edit-email" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-phone">/g, '<Label htmlFor="edit-phone" className="text-xs font-medium text-slate-700">'],
  [/<Label htmlFor="edit-address">/g, '<Label htmlFor="edit-address" className="text-xs font-medium text-slate-700">'],
  [/<Label>Academic Status<\/Label>/g, '<Label className="text-xs font-medium text-slate-700">Academic Status</Label>'],
  [/<Label>Gender<\/Label>/g, '<Label className="text-xs font-medium text-slate-700">Gender</Label>'],
  [/className="font-mono font-bold text-emerald-700"/g, 'className="font-mono font-bold text-emerald-600 h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"'],
  [/className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"/g, 'className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"'], // duplicate handle
  
  // Fix input tags without className
  [/placeholder="e.g. Jane"\n                \/>/g, 'placeholder="e.g. Jane"\n                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n                />'],
  [/placeholder="e.g. Doe"\n                \/>/g, 'placeholder="e.g. Doe"\n                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n                />'],
  [/onChange={\(e\) => setEditFormData\({...editFormData, dateOfBirth: e.target.value}\)}\n                \/>/g, 'onChange={(e) => setEditFormData({...editFormData, dateOfBirth: e.target.value})}\n                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n                />'],
  [/placeholder="jane.doe@example.com"\n                \/>/g, 'placeholder="jane.doe@example.com"\n                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n                />'],
  [/placeholder="\+254..."\n                \/>/g, 'placeholder="+254..."\n                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n                />'],
  [/placeholder="e.g. Nairobi, Westlands"\n              \/>/g, 'placeholder="e.g. Nairobi, Westlands"\n                className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"\n              />'],
  
  // Select triggers
  [/<SelectTrigger>/g, '<SelectTrigger className="h-10 border-slate-200 focus:ring-emerald-500 rounded-lg">'],

  // Student Documents List
  [/<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Issued Documents<\/h4>/g, '<h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Issued Documents</h4>'],
  [/<Button size="sm" variant="outline" className="h-8 gap-2 font-bold" onClick={\(\) => fileInputRef.current\?\.click\(\)} disabled={uploading}>/g, '<Button size="sm" variant="outline" className="h-8 gap-1.5 font-medium border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>'],
  [/<div className="h-8 w-8 rounded-lg bg-emerald-700\/10 flex items-center justify-center text-emerald-700">/g, '<div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">'],
  [/<p className="text-xs font-bold text-slate-900 truncate max-w-\[180px\]">/g, '<p className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">'],
  [/<Button size="icon" variant="ghost" className="h-7 w-7" asChild>/g, '<Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md" asChild>'],
  [/<Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={\(\) => handleDelete\(docItem\)}>/g, '<Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md" onClick={() => handleDelete(docItem)}>'],
  [/<Progress value={progress} className="h-1" \/>/g, '<Progress value={progress} className="h-1.5 [&>div]:bg-emerald-500" />'],
  [/<p className="text-\[10px\] text-center font-bold text-emerald-700 uppercase animate-pulse">/g, '<p className="text-[10px] text-center font-bold text-emerald-600 uppercase animate-pulse">'],
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

// Special case for the empty document item
content = content.replace(
  /<div className="h-8 w-8 rounded-lg bg-primary\/10 flex items-center justify-center text-primary">/g,
  '<div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">'
);
content = content.replace(
  /<p className="text-\[10px\] text-center font-bold text-primary uppercase animate-pulse">/g,
  '<p className="text-[10px] text-center font-bold text-emerald-600 uppercase animate-pulse">'
);

fs.writeFileSync(filePath, content);
console.log("Rewrite completed.");
