"use client"

import { useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Loader2, Info, ClipboardList, Award, Star } from "lucide-react"

const GRADE_CONFIG: Record<string, { points: number; label: string; color: string; bg: string; bar: string }> = {
  "A":  { points: 4.0, label: "Distinction", color: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500" },
  "B+": { points: 3.5, label: "Credit",      color: "text-blue-700",   bg: "bg-blue-50",   bar: "bg-blue-500" },
  "B":  { points: 3.0, label: "Credit",      color: "text-blue-600",   bg: "bg-blue-50",   bar: "bg-blue-400" },
  "C+": { points: 2.5, label: "Pass",        color: "text-amber-700",  bg: "bg-amber-50",  bar: "bg-amber-400" },
  "C":  { points: 2.0, label: "Pass",        color: "text-amber-600",  bg: "bg-amber-50",  bar: "bg-amber-400" },
  "D":  { points: 1.0, label: "Borderline",  color: "text-orange-700", bg: "bg-orange-50", bar: "bg-orange-400" },
  "F":  { points: 0.0, label: "Fail",        color: "text-rose-700",   bg: "bg-rose-50",   bar: "bg-rose-500" },
}

function getGradeConfig(grade: string) {
  return GRADE_CONFIG[grade] || { points: 0, label: "Ungraded", color: "text-slate-500", bg: "bg-slate-100", bar: "bg-slate-300" }
}

function getGpaStatus(gpa: number) {
  if (gpa >= 3.7) return { label: "Distinction", color: "text-emerald-600", bg: "bg-emerald-50" }
  if (gpa >= 3.0) return { label: "Credit", color: "text-blue-600", bg: "bg-blue-50" }
  if (gpa >= 2.0) return { label: "Pass", color: "text-amber-600", bg: "bg-amber-50" }
  return { label: "At Risk", color: "text-rose-600", bg: "bg-rose-50" }
}

export default function GradesPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.id) return null
    return query(collection(firestore, "grades"), where("studentId", "==", student.id))
  }, [firestore, student])
  const { data: grades, isLoading: isGradesLoading } = useCollection(gradesQuery)

  const gpa = useMemo(() => {
    if (!grades || grades.length === 0) return 0
    const total = grades.reduce((acc, g) => acc + (getGradeConfig(g.grade || "F").points), 0)
    return parseFloat((total / grades.length).toFixed(2))
  }, [grades])

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    ;(grades || []).forEach(g => {
      const gr = g.grade || "F"
      dist[gr] = (dist[gr] || 0) + 1
    })
    return dist
  }, [grades])

  if (isStudentLoading || isGradesLoading) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading your grades...</p>
      </div>
    )
  }

  const gpaStatus = getGpaStatus(gpa)
  const total = grades?.length || 0

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <TrendingUp className="h-6 w-6 text-emerald-600" />
          Academic Grades
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {student?.appliedCourse} · {total} unit{total !== 1 ? 's' : ''} graded
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white md:col-span-1">
          <CardContent className="p-4">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${gpaStatus.bg}`}>
              <Star className={`h-4 w-4 ${gpaStatus.color}`} />
            </div>
            <p className="text-xs text-slate-400 font-medium">Cumulative GPA</p>
            <p className={`text-3xl font-bold mt-0.5 ${gpaStatus.color}`}>{gpa.toFixed(2)}</p>
            <p className={`text-xs font-semibold mt-0.5 ${gpaStatus.color}`}>{gpaStatus.label}</p>
            {/* GPA bar — out of 4.0 */}
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${gpaStatus.bg.replace('bg-', 'bg-').replace('-50','')}`}
                style={{ width: `${(gpa / 4.0) * 100}%`, background: gpa >= 3.7 ? '#10b981' : gpa >= 3.0 ? '#3b82f6' : gpa >= 2.0 ? '#f59e0b' : '#ef4444' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Units Graded</p>
            <p className="text-3xl font-bold text-slate-900 mt-0.5">{total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Current record</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Best Grade</p>
            {(() => {
              const best = (grades || []).reduce((b, g) => {
                const pts = getGradeConfig(g.grade || 'F').points
                return pts > (getGradeConfig(b?.grade || 'F').points) ? g : b
              }, null as any)
              const cfg = best ? getGradeConfig(best.grade) : null
              return cfg ? (
                <>
                  <p className={`text-3xl font-bold mt-0.5 ${cfg.color}`}>{best.grade}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{best.name || best.unitName || '—'}</p>
                </>
              ) : <p className="text-xl font-bold text-slate-300 mt-0.5">—</p>
            })()}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Academic Status</p>
            <p className={`text-base font-bold mt-1 ${gpaStatus.color}`}>{gpaStatus.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {gpa >= 2.0 ? "Good standing" : "Needs improvement"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main grades list */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Examination Results</h2>
            </div>

            {total > 0 ? (
              <div className="divide-y divide-slate-100">
                {(grades || []).map((res, i) => {
                  const cfg = getGradeConfig(res.grade || "F")
                  const total = (Number(res.cat) || 0) + (Number(res.exam) || 0)
                  const maxScore = 100
                  const pct = Math.min(100, Math.round((total / maxScore) * 100))
                  return (
                    <div key={res.id || i} className="px-4 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${cfg.bg} ${cfg.color}`}>
                            {res.grade || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{res.name || res.unitName || "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">{res.code || res.unitCode || "—"}</span>
                              {res.semester && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                                  <span className="text-[10px] text-slate-400">{res.semester}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <p className="text-xs text-slate-400">CAT&nbsp;&nbsp;Exam</p>
                            <p className="text-sm font-bold text-slate-700">
                              {res.cat ?? "—"}&nbsp;&nbsp;{res.exam ?? "—"}
                            </p>
                          </div>
                          <div className={`min-w-[52px] text-center px-2 py-1 rounded-lg ${cfg.bg}`}>
                            <p className="text-[9px] font-medium text-slate-400">Total</p>
                            <p className={`text-sm font-bold ${cfg.color}`}>{total}/100</p>
                          </div>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden ml-12">
                        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 ml-12">
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="h-8 w-8 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No examination results yet.</p>
                <p className="text-xs text-slate-400 mt-1">Results will appear here once grades are published.</p>
              </div>
            )}

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <p className="text-[10px] text-slate-500">Official transcripts are available from the Registrar's Office.</p>
            </div>
          </Card>
        </div>

        {/* Grade distribution sidebar */}
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Grade Distribution</h2>
            </div>
            <CardContent className="p-4">
              {total > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(GRADE_CONFIG).map(([letter, cfg]) => {
                    const count = gradeDistribution[letter] || 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={letter} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-6 text-right ${cfg.color}`}>{letter}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No grades recorded</p>
              )}
            </CardContent>
          </Card>

          {/* GPA Scale reference */}
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">GPA Scale</h2>
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                {Object.entries(GRADE_CONFIG).map(([letter, cfg]) => (
                  <div key={letter} className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${cfg.color}`}>{letter}</span>
                    <span className="text-slate-400">{cfg.label}</span>
                    <span className="font-mono font-semibold text-slate-600">{cfg.points.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
