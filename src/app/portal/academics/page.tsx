"use client"
import { useState } from "react"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, addDoc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, FileText, Video, Download, ExternalLink, GraduationCap, Clock, Loader2, FileSpreadsheet, CheckCircle2, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
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
import { UploadCloud, FileUp, Send } from "lucide-react"



export default function AcademicsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [targetUnit, setTargetUnit] = useState<any>(null)

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !targetUnit || !student?.id) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Upload file
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('studentId', student.id)
      formData.append('unitId', targetUnit.unitId)

      const response = await fetch('/api/assignments/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Upload failed")

      // 2. Record in Firestore
      await addDoc(collection(firestore!, "submissions"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        unitId: targetUnit.unitId,
        unitCode: targetUnit.unitCode,
        unitName: targetUnit.unitName,
        fileName: selectedFile.name,
        fileUrl: result.fileUrl,
        status: "Pending",
        submittedAt: serverTimestamp(),
      })

      toast({ title: "Assignment Submitted", description: "Your work has been uploaded successfully." })
      setSubmitDialogOpen(false)
      setSelectedFile(null)
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }



  // Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  // Fetch Program Data
  const programQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "programs"), where("name", "==", student.appliedCourse), limit(1))
  }, [firestore, student])
  
  const { data: programsData } = useCollection(programQuery)
  const program = programsData?.[0]

  // 3. Fetch Units Data (Real-time)
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "units"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  
  const { data: units, isLoading: isUnitsLoading } = useCollection(unitsQuery)

  // 4. Fetch Resources Data
  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "academic_resources"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  
  const { data: resources, isLoading: isResourcesLoading } = useCollection(resourcesQuery)

  // 5. Fetch Student Unit Registrations
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "unit_registrations"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: registrations, isLoading: isRegistrationsLoading } = useCollection(registrationsQuery)

  // 6. Fetch Student Submissions
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "submissions"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: studentSubmissions, isLoading: isSubmissionsLoading } = useCollection(submissionsQuery)

  const handleRegisterUnit = async (unit: any) => {

    if (!firestore || !student?.id) return
    
    try {
      await addDoc(collection(firestore, "unit_registrations"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        unitId: unit.id,
        unitCode: unit.code,
        unitName: unit.name,
        courseName: student.appliedCourse,
        status: "Registered",
        progress: 0,
        registeredAt: serverTimestamp(),
      })
      toast({ title: "Success", description: `Registered for ${unit.name} successfully.` })
    } catch (error: any) {

      toast({ title: "Registration Failed", description: error.message, variant: "destructive" })
    }
  }

  if (isStudentLoading || isUnitsLoading || isResourcesLoading || isRegistrationsLoading || isSubmissionsLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }




  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academics</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your course units and access learning resources.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">My Registered Units</h2>
            <div className="grid grid-cols-1 gap-4">
              {registrations && registrations.length > 0 ? (
                registrations.map((reg) => (
                  <Card key={reg.id} className="border shadow-sm rounded-xl overflow-hidden hover:border-blue-200 transition-colors bg-white">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-stretch">
                        <div className="p-5 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                              {reg.unitCode}
                            </span>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {reg.status || "Registered"}
                            </Badge>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{reg.unitName}</h3>
                          
                          {/* Submission Status & Feedback */}
                          {(() => {
                            const submission = (studentSubmissions || []).find(s => s.unitId === reg.unitId);
                            if (!submission) return null;
                            return (
                              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assignment Status</span>
                                  <Badge className={`border-0 text-[9px] font-black uppercase px-2 py-0.5 shadow-none ${
                                    submission.status === 'Graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {submission.status}
                                  </Badge>
                                </div>
                                {submission.feedback && (
                                  <div className="pt-2 border-t border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Instructor Feedback</p>
                                    <p className="text-xs text-slate-600 italic leading-relaxed">"{submission.feedback}"</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="mt-4 space-y-1.5">

                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Progress</span>
                              <span>{reg.progress || 0}%</span>
                            </div>
                            <Progress value={reg.progress || 0} className="h-1.5 bg-slate-100" />
                          </div>
                        </div>
                        <div className="bg-slate-50/50 p-3 sm:w-40 flex flex-col justify-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-100">
                          <Dialog open={submitDialogOpen && targetUnit?.id === reg.id} onOpenChange={(open) => {
                            setSubmitDialogOpen(open)
                            if (open) {
                              setTargetUnit(reg)
                              setSelectedFile(null)
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 justify-start text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Send className="h-3 w-3 mr-2" /> Submit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Submit Assignment</DialogTitle>
                                <DialogDescription>
                                  Upload your work for <strong>{reg.unitName}</strong>.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative group hover:border-blue-400 transition-colors">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <UploadCloud className="h-10 w-10 text-slate-300 group-hover:text-blue-500 mb-2" />
                                <span className="text-xs font-bold text-slate-500">
                                  {selectedFile ? selectedFile.name : "Select your assignment file"}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">PDF, ZIP, or DOCX (Max 10MB)</span>
                              </div>
                              <DialogFooter>
                                <Button 
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                  onClick={handleSubmitAssignment}
                                  disabled={isSubmitting || !selectedFile}
                                >
                                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                                  {isSubmitting ? "Uploading..." : "Confirm Submission"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="h-8 justify-start text-[11px] font-bold">
                            <FileText className="h-3 w-3 mr-2" /> Notes
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 justify-start text-[11px] font-bold">
                            <Video className="h-3 w-3 mr-2" /> Videos
                          </Button>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed rounded-xl bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">You haven't registered for any units yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Available to Register</h2>
            <div className="grid grid-cols-1 gap-3">
              {units && units.filter(u => !(registrations || []).some(r => r.unitId === u.id)).length > 0 ? (
                units.filter(u => !(registrations || []).some(r => r.unitId === u.id)).map((unit) => (
                  <Card key={unit.id} className="border shadow-sm rounded-xl overflow-hidden hover:border-blue-200 transition-colors">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{unit.code}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{unit.instructor || "Staff"}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{unit.name}</h3>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 rounded-lg shadow-sm"
                        onClick={() => handleRegisterUnit(unit)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Register
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-6 text-center border border-dashed rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No new units available for registration.</p>
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Course Materials</h2>
          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {resources && resources.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {resources.map((res) => (
                    <a 
                      key={res.id} 
                      href={res.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          res.type === 'Assignment' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                        }`}>
                          {res.type === 'Assignment' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1">{res.title}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{res.type}</span>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-400">No materials uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          
          <div className="bg-blue-600 rounded-xl p-6 text-white shadow-sm">
            <h4 className="text-base font-bold mb-2">Academic Support</h4>
            <p className="text-xs text-blue-100 leading-relaxed mb-4">Need help with your units? Connect with our tutoring center for guidance.</p>
            <Button size="sm" className="w-full bg-white text-blue-600 hover:bg-white/90 font-bold">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
