"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList, Plus, Search, Trash2, Loader2, CalendarDays,
  BookOpen, AlertCircle, CheckCircle2, Clock, Paperclip, X, Download
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function AdminAssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)

  const [form, setForm] = useState({
    title: "",
    instructions: "",
    unitId: "",
    courseName: "",
    dueDate: "",
    maxFileSizeMb: "10",
    allowedTypes: "PDF, DOCX, ZIP",
  })

  const firestore = useFirestore()
  const { user } = useUser()

  const assignmentsRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, "assignments") : null,
    [firestore, user]
  )
  const unitsRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, "units") : null,
    [firestore, user]
  )
  const coursesRef = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, "programs") : null,
    [firestore, user]
  )

  const { data: assignments, isLoading } = useCollection(assignmentsRef)
  const { data: units } = useCollection(unitsRef)
  const { data: courses } = useCollection(coursesRef)

  const filtered = useMemo(() => {
    return (assignments || []).filter(a =>
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.courseName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [assignments, searchTerm])

  const handleUnitChange = (unitId: string) => {
    const unit = (units || []).find(u => u.id === unitId)
    setForm(f => ({ ...f, unitId, unitName: unit?.name || "", unitCode: unit?.code || "" }))
  }

  const handleSave = async () => {
    if (!form.title || !form.unitId || !form.courseName || !form.dueDate) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" })
      return
    }
    if (!assignmentsRef) return
    setIsSaving(true)
    try {
      const unit = (units || []).find(u => u.id === form.unitId)

      // Upload attachment to Cloudinary if provided
      let attachmentUrl = ""
      let attachmentName = ""
      let attachmentPublicId = ""
      if (attachmentFile) {
        setIsUploadingAttachment(true)
        const fd = new FormData()
        fd.append("file", attachmentFile)
        fd.append("folder", "assignments")
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Attachment upload failed") }
        const result = await res.json()
        attachmentUrl = result.fileUrl
        attachmentName = attachmentFile.name
        attachmentPublicId = result.publicId
        setIsUploadingAttachment(false)
      }

      await addDoc(assignmentsRef, {
        title: form.title,
        instructions: form.instructions,
        unitId: form.unitId,
        unitName: unit?.name || "",
        unitCode: unit?.code || "",
        courseName: form.courseName,
        dueDate: form.dueDate,
        maxFileSizeMb: Number(form.maxFileSizeMb),
        allowedTypes: form.allowedTypes,
        status: "Active",
        createdBy: user?.email || "Admin",
        createdAt: serverTimestamp(),
        ...(attachmentUrl && { attachmentUrl, attachmentName, attachmentPublicId }),
      })
      toast({ title: "Assignment Created", description: `"${form.title}" is now visible to students.` })
      setIsDialogOpen(false)
      setAttachmentFile(null)
      setForm({ title: "", instructions: "", unitId: "", courseName: "", dueDate: "", maxFileSizeMb: "10", allowedTypes: "PDF, DOCX, ZIP" })
    } catch (e: any) {
      setIsUploadingAttachment(false)
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (assignment: any) => {
    if (!firestore || !confirm(`Delete "${assignment.title}"? Students will lose access to this assignment.`)) return
    try {
      await deleteDoc(doc(firestore, "assignments", assignment.id))
      toast({ title: "Deleted", description: "Assignment removed." })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date()

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Academic Management</p>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage assignments for students to submit work against.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg h-10 px-6">
              <Plus className="mr-2 h-4 w-4" /> New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] border border-slate-200 shadow-lg rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Create Assignment</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">
                Students will see this on their Assignments page with a deadline countdown.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Assignment Title <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g. Typography & Layout Project"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Instructions / Brief</Label>
                <Textarea
                  placeholder="Describe what students should do, what to include, formatting requirements, etc."
                  value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  className="min-h-[100px] border-slate-200 focus-visible:ring-emerald-500 rounded-lg text-sm"
                />
              </div>

              {/* Unit + Course */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Unit <span className="text-rose-500">*</span></Label>
                  <Select value={form.unitId} onValueChange={handleUnitChange}>
                    <SelectTrigger className="h-10 border-slate-200 rounded-lg">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(units || []).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.code} – {u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Target Course <span className="text-rose-500">*</span></Label>
                  <Select value={form.courseName} onValueChange={v => setForm(f => ({ ...f, courseName: v }))}>
                    <SelectTrigger className="h-10 border-slate-200 rounded-lg">
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

              {/* Due Date + File size */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Due Date <span className="text-rose-500">*</span></Label>
                  <Input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="h-10 border-slate-200 rounded-lg focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Max File Size (MB)</Label>
                  <Input
                    type="number"
                    value={form.maxFileSizeMb}
                    onChange={e => setForm(f => ({ ...f, maxFileSizeMb: e.target.value }))}
                    min={1} max={50}
                    className="h-10 border-slate-200 rounded-lg focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Allowed types */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Allowed File Types</Label>
                <Input
                  value={form.allowedTypes}
                  onChange={e => setForm(f => ({ ...f, allowedTypes: e.target.value }))}
                  placeholder="e.g. PDF, DOCX, ZIP"
                  className="h-10 border-slate-200 rounded-lg focus-visible:ring-emerald-500"
                />
              </div>

              {/* Assignment Attachment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Assignment File <span className="text-slate-400 font-normal">(optional — students will be able to download this)</span></Label>
                <div className="relative">
                  {attachmentFile ? (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-emerald-300 bg-emerald-50">
                      <Paperclip className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium text-emerald-800 flex-1 truncate">{attachmentFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachmentFile(null)}
                        className="shrink-0 text-emerald-500 hover:text-rose-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-all">
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                      />
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">Attach file (PDF, DOCX, ZIP, etc.)</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t border-slate-100 mt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploadingAttachment}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm"
              >
                {(isSaving || isUploadingAttachment) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {isUploadingAttachment ? "Uploading file..." : isSaving ? "Creating..." : "Publish Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by title, unit or course..."
          className="pl-9 h-10 rounded-lg bg-white border-slate-200 shadow-sm text-sm focus-visible:ring-emerald-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 h-10 text-xs pl-5">Assignment</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Unit / Course</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Due Date</TableHead>
                <TableHead className="font-semibold text-slate-500 h-10 text-xs">Status</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                filtered.map(a => (
                  <TableRow key={a.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{a.title}</p>
                          <p className="text-[10px] text-slate-400">{a.allowedTypes} · max {a.maxFileSizeMb}MB</p>
                          {a.attachmentUrl && (
                            <a
                              href={a.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold hover:underline mt-0.5"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              {a.attachmentName || "Attachment"}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-xs font-semibold text-slate-800">{a.unitName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.courseName}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        <span className={`text-xs font-medium ${isOverdue(a.dueDate) ? "text-rose-600" : "text-slate-700"}`}>
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {isOverdue(a.dueDate) ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Closed</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm">
                    <ClipboardList className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p>No assignments created yet.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
