"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage } from "@/firebase"
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs, orderBy } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, FileText, Video, Download, ExternalLink, GraduationCap, Clock, Loader2, FileSpreadsheet, CheckCircle2, PlusCircle, UploadCloud, FileUp, Send } from "lucide-react"
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

export default function AcademicsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const { toast } = useToast()

  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [targetUnit, setTargetUnit] = useState<any>(null)

  // 1. Fetch Student Data
  useEffect(() => {
    async function fetchStudent() {
      if (!firestore || !user?.email) return
      try {
        const q = query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsStudentLoading(false)
      }
    }
    fetchStudent()
  }, [user, firestore])

  // 2. Fetch Units Data
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "units"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  
  const { data: units, isLoading: isUnitsLoading } = useCollection(unitsQuery)

  // 3. Fetch Resources Data
  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "academic_resources"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  
  const { data: resources, isLoading: isResourcesLoading } = useCollection(resourcesQuery)

  // 4. Fetch Student Unit Registrations
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "unit_registrations"), where("studentId", "==", student.id))
  }, [firestore, student])

  const { data: registrations, isLoading: isRegistrationsLoading } = useCollection(registrationsQuery)

  // 5. Fetch Student Submissions
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

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !targetUnit || !student?.id || !storage || !user) {
      toast({ title: "Error", description: "Please select a file to upload.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Upload to Firebase Storage
      const fileName = `${Date.now()}_${selectedFile.name}`
      const storagePath = `submissions/${student.id}/${fileName}`
      const storageRef = ref(storage, storagePath)
      
      const uploadResult = await uploadBytes(storageRef, selectedFile)
      const downloadUrl = await getDownloadURL(uploadResult.ref)

      // 2. Record in Firestore
      await addDoc(collection(firestore!, "submissions"), {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.contactEmail,
        studentFirebaseUid: user.uid,
        unitId: targetUnit.unitId,
        unitCode: targetUnit.unitCode,
        unitName: targetUnit.unitName,
        fileName: selectedFile.name,
        fileUrl: downloadUrl,
        storagePath: storagePath,
        status: "Pending",
        submittedAt: serverTimestamp(),
      })

      toast({ title: "Assignment Submitted", description: "Your work has been uploaded to cloud storage successfully." })
      setSubmitDialogOpen(false)
      setSelectedFile(null)
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isStudentLoading || isUnitsLoading || isResourcesLoading || isRegistrationsLoading || isSubmissionsLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Academics</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your course units and access learning resources.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">My Registered Units</h2>
            <div className="grid grid-cols-1 gap-4">
              {registrations && registrations.length > 0 ? (
                registrations.map((reg) => (
                  <Card key={reg.id} className="border-0 shadow-sm rounded-2xl overflow-hidden ring-1 ring-slate-200 hover:ring-emerald-200 transition-all bg-white">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-stretch">
                        <div className="p-6 flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              {reg.unitCode}
                            </span>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 shadow-none border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {reg.status || "Registered"}
                            </Badge>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 leading-tight">{reg.unitName}</h3>
                          
                          {/* Submission Status & Feedback */}
                          {(() => {
                            const submission = (studentSubmissions || []).find(s => s.unitId === reg.unitId);
                            if (!submission) return null;
                            return (
                              <div className="mt-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment Status</span>
                                  <Badge className={`border-0 text-[9px] font-black uppercase px-2.5 py-0.5 shadow-none ${
                                    submission.status === 'Graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {submission.status}
                                  </Badge>
                                </div>
                                {submission.feedback && (
                                  <div className="pt-3 border-t border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Instructor Feedback</p>
                                    <p className="text-xs text-slate-600 italic font-medium leading-relaxed">"{submission.feedback}"</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span>Course Progress</span>
                              <span>{reg.progress || 0}%</span>
                            </div>
                            <Progress value={reg.progress || 0} className="h-2 bg-slate-100" />
                          </div>
                        </div>
                        <div className="bg-slate-50/30 p-4 sm:w-48 flex flex-col justify-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100">
                          <Dialog open={submitDialogOpen && targetUnit?.id === reg.id} onOpenChange={(open) => {
                            setSubmitDialogOpen(open)
                            if (open) {
                              setTargetUnit(reg)
                              setSelectedFile(null)
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-10 justify-start text-xs font-black uppercase tracking-tight border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl shadow-sm">
                                <Send className="h-3.5 w-3.5 mr-2" /> Submit Work
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] border-0 shadow-2xl rounded-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight">Submit Assignment</DialogTitle>
                                <DialogDescription className="font-medium text-slate-500">
                                  Upload your work for <strong>{reg.unitName}</strong>.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 relative group hover:border-emerald-400 transition-all">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <UploadCloud className="h-12 w-12 text-slate-300 group-hover:text-emerald-500 mb-3" />
                                <span className="text-xs font-bold text-slate-600 px-6 text-center">
                                  {selectedFile ? selectedFile.name : "Select your assignment file"}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">PDF, ZIP, or DOCX (Max 10MB)</span>
                              </div>
                              <DialogFooter className="mt-4">
                                <Button 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl shadow-lg shadow-emerald-100"
                                  onClick={handleSubmitAssignment}
                                  disabled={isSubmitting || !selectedFile}
                                >
                                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileUp className="h-5 w-5 mr-2" />}
                                  {isSubmitting ? "UPLOADING..." : "CONFIRM SUBMISSION"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="h-10 justify-start text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">
                            <FileText className="h-3.5 w-3.5 mr-2" /> Course Notes
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 justify-start text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">
                            <Video className="h-3.5 w-3.5 mr-2" /> Video Lessons
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
                  <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">You haven't registered for any units yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Available to Register</h2>
            <div className="grid grid-cols-1 gap-3">
              {units && units.filter(u => !(registrations || []).some(r => r.unitId === u.id)).length > 0 ? (
                units.filter(u => !(registrations || []).some(r => r.unitId === u.id)).map((unit) => (
                  <Card key={unit.id} className="border-0 shadow-sm rounded-2xl overflow-hidden ring-1 ring-slate-200 hover:ring-emerald-200 transition-all bg-white">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.code}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.instructor || "Faculty"}</span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900">{unit.name}</h3>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-10 px-6 rounded-xl shadow-md shadow-emerald-100"
                        onClick={() => handleRegisterUnit(unit)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> REGISTER
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-10 text-center border-2 border-dashed rounded-3xl bg-slate-50/50">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No new units available for registration.</p>
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Course Materials</h2>
          <Card className="border-0 shadow-sm rounded-3xl overflow-hidden ring-1 ring-slate-200 bg-white">
            <CardContent className="p-0">
              {resources && resources.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {resources.map((res) => (
                    <a 
                      key={res.id} 
                      href={res.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 hover:bg-slate-50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          res.type === 'Assignment' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {res.type === 'Assignment' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1 leading-tight">{res.title}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{res.type}</span>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-all group-hover:scale-110" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm font-black text-slate-300 uppercase italic">No materials yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          
          <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-emerald-500 rounded-full opacity-50 transition-transform group-hover:scale-150" />
            <h4 className="text-lg font-black uppercase tracking-tight mb-2 relative z-10">Academic Support</h4>
            <p className="text-xs text-emerald-50 font-medium leading-relaxed mb-6 relative z-10">Need help with your units? Our instructors are here to guide you.</p>
            <Button size="lg" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-black rounded-xl shadow-lg relative z-10 transition-transform hover:-translate-y-1">
              OPEN SUPPORT TICKET
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
