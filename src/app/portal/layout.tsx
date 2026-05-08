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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  const pageTitle = pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <PortalSidebar student={studentData} />
        <SidebarInset className="flex flex-col bg-transparent">
          <header className="h-16 flex items-center px-8 border-b border-slate-100 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-4 w-full">
              <SidebarTrigger className="text-slate-500 hover:text-slate-900" />
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portal</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest capitalize">{pageTitle}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-10 max-w-7xl">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
