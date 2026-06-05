"use client"

import { useState, useEffect, useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import {
  BookOpen, FileText, Download, GraduationCap, Clock,
  Loader2, CheckCircle2, PlusCircle, PlayCircle, BookMarked
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

// ── Cloudinary download URL helper ────────────────────────────────────────────
function getDownloadUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url
  return url.replace(/\/upload\//, "/upload/fl_attachment/")
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AcademicsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()

  const [isStudentLoading, setIsStudentLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)

  // Fetch student record
  useEffect(() => {
    async function fetchStudent() {
      if (!firestore || !user?.email) return
      try {
        const q = query(
          collection(firestore, "students"),
          where("contactEmail", "==", user.email),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!snap.empty) setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } catch (e) {
        console.error(e)
      } finally {
        setIsStudentLoading(false)
      }
    }
    fetchStudent()
  }, [user, firestore])

  // Queries
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    return query(collection(firestore, "units"), where("courseName", "==", student.appliedCourse))
  }, [firestore, student])
  const { data: units, isLoading: isUnitsLoading } = useCollection(unitsQuery)

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.appliedCourse) return null
    // Fetch all resources — filter client-side to support cross-course visibleTo array
    return collection(firestore, "academic_resources")
  }, [firestore, student])
  const { data: allResources, isLoading: isResourcesLoading } = useCollection(resourcesQuery)

  // Filter resources: show if student's course matches courseName OR is in visibleTo array
  const resources = useMemo(() => {
    if (!allResources || !student?.appliedCourse) return []
    return allResources.filter((r: any) => {
      if (r.visibleTo && Array.isArray(r.visibleTo)) {
        return r.visibleTo.includes(student.appliedCourse)
      }
      return r.courseName === student.appliedCourse
    })
  }, [allResources, student])

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "unit_registrations"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: registrations, isLoading: isRegistrationsLoading } = useCollection(registrationsQuery)

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
      toast({ title: "Unit Registered", description: `You are now registered for ${unit.name}.` })
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" })
    }
  }

  if (isStudentLoading || isUnitsLoading || isResourcesLoading || isRegistrationsLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your academic profile...</p>
      </div>
    )
  }

  const registeredUnitIds = new Set((registrations || []).map((r: any) => r.unitId))
  const availableUnits = (units || []).filter((u: any) => !registeredUnitIds.has(u.id))
  const totalUnits = (registrations || []).length
  const avgProgress = totalUnits > 0
    ? Math.round((registrations || []).reduce((s: number, r: any) => s + (r.progress || 0), 0) / totalUnits)
    : 0

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <GraduationCap className="h-6 w-6 text-emerald-600" />
          Academics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {student?.appliedCourse
            ? `${student.appliedCourse} · ${totalUnits} unit${totalUnits !== 1 ? "s" : ""} registered`
            : "Manage your course units and learning resources"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Programme", value: student?.appliedCourse || "—", icon: BookMarked, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Registered Units", value: totalUnits, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s, i) => (
          <Card key={i} className="border border-slate-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{s.label}</p>
                <p className="text-base font-bold text-slate-900 truncate leading-tight mt-0.5">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Units */}
        <div className="lg:col-span-2 space-y-6">

          {/* Registered Units */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              My Registered Units
            </h2>
            <div className="space-y-2">
              {(registrations || []).length > 0 ? (
                (registrations || []).map((reg: any) => (
                  <div key={reg.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{reg.unitName}</p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">{reg.unitCode}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {reg.status || "Registered"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Progress</span>
                        <span className="text-emerald-600">{reg.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${reg.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No units registered yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Register from the list below to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Units */}
          {availableUnits.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-blue-500" />
                Available to Register
              </h2>
              <div className="space-y-2">
                {availableUnits.map((unit: any) => (
                  <div
                    key={unit.id}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-emerald-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{unit.name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {unit.code}{unit.instructor ? ` · ${unit.instructor}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shrink-0"
                      onClick={() => handleRegisterUnit(unit)}
                    >
                      <PlusCircle className="h-3 w-3 mr-1.5" /> Register
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Course Materials + Support */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-500" />
            Course Materials
          </h2>
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {(resources || []).length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {(resources || []).map((res: any) => (
                    <a
                      key={res.id}
                      href={getDownloadUrl(res.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        res.type === "Video" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {res.type === "Video"
                          ? <PlayCircle className="h-4 w-4" />
                          : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate leading-tight">{res.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{res.type}</p>
                      </div>
                      <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="h-7 w-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No materials uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic Support CTA */}
          <div className="bg-emerald-600 rounded-xl p-5 text-white">
            <h4 className="text-sm font-bold mb-1">Academic Support</h4>
            <p className="text-xs text-emerald-50 leading-relaxed mb-4">
              Need help with your units? Our instructors are available to assist.
            </p>
            <Button
              size="sm"
              className="w-full bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-semibold h-9 rounded-lg"
              onClick={() => router.push("/portal/support")}
            >
              Open Support Ticket
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
