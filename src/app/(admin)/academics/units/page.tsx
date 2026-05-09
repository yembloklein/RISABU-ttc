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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, Search, Edit2, Trash2, Loader2, GraduationCap, Code, User } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function ManageUnitsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    courseName: "",
    instructor: "",
    status: "Active"
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const unitsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "units") : null, [firestore, user])
  const coursesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "programs") : null, [firestore, user])
  
  const { data: units, isLoading: loadingUnits } = useCollection(unitsRef)
  const { data: courses } = useCollection(coursesRef)

  const filteredUnits = useMemo(() => {
    return (units || []).filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.courseName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [units, searchTerm])

  const handleOpenDialog = (unit: any = null) => {
    if (unit) {
      setEditingUnitId(unit.id)
      setFormData({
        name: unit.name,
        code: unit.code,
        courseName: unit.courseName,
        instructor: unit.instructor || "",
        status: unit.status || "Active"
      })
    } else {
      setEditingUnitId(null)
      setFormData({ name: "", code: "", courseName: "", instructor: "", status: "Active" })
    }
    setIsDialogOpen(true)
  }

  const handleSaveUnit = async () => {
    if (!formData.name || !formData.code || !formData.courseName || !unitsRef) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" })
      return
    }

    const data = {
      ...formData,
      progress: editingUnitId ? undefined : 0, // Set initial progress to 0 for new units
      updatedAt: serverTimestamp(),
    }

    try {
      if (editingUnitId) {
        const docRef = doc(firestore!, "units", editingUnitId)
        await updateDocumentNonBlocking(docRef, data)
        toast({ title: "Updated", description: "Unit updated successfully." })
      } else {
        await addDocumentNonBlocking(unitsRef, {
          ...data,
          progress: 0,
          createdAt: serverTimestamp(),
        })
        toast({ title: "Created", description: "New unit added successfully." })
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteUnit = (id: string) => {
    if (!firestore || !confirm("Are you sure you want to delete this unit?")) return
    const docRef = doc(firestore, "units", id)
    deleteDocumentNonBlocking(docRef)
    toast({ title: "Deleted", description: "Unit removed from catalog." })
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Manage Units</h1>
          <p className="text-slate-500 font-medium">Configure subjects and modules for academic programs</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg rounded-full h-11 px-6 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
            <div className="bg-slate-50 p-6 border-b">
              <DialogTitle className="text-xl font-bold text-slate-900">{editingUnitId ? "Edit Unit" : "Register New Unit"}</DialogTitle>
              <DialogDescription className="mt-1">
                Define a module and associate it with a course.
              </DialogDescription>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Unit Code</Label>
                  <div className="relative">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="e.g. WD101" 
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="pl-9 h-11 bg-slate-50 border-slate-200 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Course</Label>
                  <Select value={formData.courseName} onValueChange={(v) => setFormData({...formData, courseName: v})}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {(courses || []).map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Unit Name</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="e.g. Advanced JavaScript" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="pl-9 h-11 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructor</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="e.g. Mr. Smith" 
                      value={formData.instructor}
                      onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                      className="pl-9 h-11 bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button 
                onClick={handleSaveUnit} 
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg"
              >
                {editingUnitId ? "Update Unit" : "Register Unit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search by code, name, or course..." 
          className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-100">
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Unit Code</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Unit Name</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Associated Course</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider">Instructor</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 uppercase text-[11px] tracking-wider text-center">Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUnits ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                    <TableCell className="py-4 font-mono font-bold text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs">{unit.code}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-bold text-slate-900">{unit.name}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700 font-bold uppercase text-[10px] px-2 py-0.5">
                        {unit.courseName}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{unit.instructor || "Not assigned"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge className={`border-0 font-bold uppercase text-[9px] px-2 py-0.5 ${
                        unit.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {unit.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleOpenDialog(unit)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteUnit(unit.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="h-8 w-8 text-slate-100" />
                      <p>No units found matching your search.</p>
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
