"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser, useFirestore } from "@/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar"
import { PortalSidebar } from "@/components/layout/portal-sidebar"
import { Loader2, ChevronRight } from "lucide-react"
import { NotificationBell } from "@/components/portal/notification-bell"

export default function PortalLayout({ children }: { children: React.ReactNode }) {

  const { user } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const [studentData, setStudentData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  const isLoginPage = pathname === "/portal/login"

  useEffect(() => {
    async function checkAccess() {
      if (isLoginPage) {
        setIsLoading(false)
        return
      }

      if (!user) {
        router.push("/portal/login")
        return
      }

      if (firestore && user.email) {
        try {
          const q = query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
          const snap = await getDocs(q)
          if (snap.empty) {
            router.push("/portal/login")
          } else {
            setStudentData({ id: snap.docs[0].id, ...snap.docs[0].data() })
          }
        } catch (e) {
          console.error(e)
        } finally {
          setIsLoading(false)
        }
      }
    }
    checkAccess()
  }, [user, firestore, router, isLoginPage])

  if (isLoading && !isLoginPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>

    )
  }

  if (isLoginPage) return <>{children}</>

  const pageTitle = pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"

  return (
    <SidebarProvider>
      <PortalSidebar student={studentData} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                <li>Risabu Connect</li>
                <li className="before:content-['/'] before:mr-2">Portal</li>
                <li className="before:content-['/'] before:mr-2 capitalize">{pageTitle}</li>
              </ol>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell studentId={studentData?.id} />
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium">{studentData?.firstName} {studentData?.lastName}</span>
              <span className="text-xs text-muted-foreground">
                {studentData?.appliedCourse || 'Enrolled Student'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(studentData?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}{(studentData?.lastName?.[0] || '').toUpperCase()}
            </div>
          </div>
        </header>
        <main className="p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
