"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, FileText, Video, Download, ExternalLink, GraduationCap, Clock, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function AcademicsPage() {
  const { user } = useUser()
  const firestore = useFirestore()

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

  if (isStudentLoading || isUnitsLoading) {
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
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Active Units</h2>
          <div className="grid grid-cols-1 gap-3">
            {units && units.length > 0 ? (
              units.map((unit) => (
                <Card key={unit.code} className="border shadow-sm rounded-xl overflow-hidden hover:border-blue-200 transition-colors">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-stretch">
                      <div className="p-5 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                            {unit.code}
                          </span>
                          <Badge variant="secondary" className={`text-[10px] font-bold uppercase ${
                            unit.status === "Completed" ? "bg-emerald-50 text-emerald-700" : 
                            unit.status === "In Progress" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"
                          }`}>
                            {unit.status || "Assigned"}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{unit.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Instructor: {unit.instructor || "To be assigned"}</p>
                        
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                            <span>Progress</span>
                            <span>{unit.progress || 0}%</span>
                          </div>
                          <Progress value={unit.progress || 0} className="h-1.5 bg-slate-100" />
                        </div>
                      </div>
                      <div className="bg-slate-50/50 p-3 sm:w-40 flex flex-col justify-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-100">
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
              <div className="py-20 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No units registered for this course yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Resources</h2>
          <Card className="border shadow-sm rounded-xl">
            <CardContent className="p-3 space-y-1">
              {[
                { name: "Academic Calendar", type: "PDF" },
                { name: "Student Handbook", type: "PDF" },
                { name: "Unit Catalog", type: "Link" },
              ].map((res) => (
                <button key={res.name} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 text-slate-400" />
                    {res.name}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{res.type}</span>
                </button>
              ))}
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
