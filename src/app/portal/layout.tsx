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
import { Loader2, ChevronRight, User as UserIcon, LogOut } from "lucide-react"
import { NotificationBell } from "@/components/portal/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/toaster"

export default function PortalLayout({ children }: { children: React.ReactNode }) {

  const { user } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const [studentData, setStudentData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  const isLoginPage = pathname === "/portal/login"

  const handleLogout = async () => {
    try {
      const { getAuth, signOut } = await import("firebase/auth")
      await signOut(getAuth())
      router.push("/portal/login")
    } catch (e) {
      console.error("Logout failed", e)
    }
  }

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
          const emailVariants = [
            user.email, 
            user.email.toLowerCase(), 
            user.email.trim(), 
            user.email.trim().toLowerCase()
          ]
          const uniqueVariants = Array.from(new Set(emailVariants))
          
          let studentDoc = null
          for (const emailVar of uniqueVariants) {
            const q = query(collection(firestore, "students"), where("contactEmail", "==", emailVar), limit(1))
            const snap = await getDocs(q)
            if (!snap.empty) {
              studentDoc = snap.docs[0]
              break
            }
          }

          if (!studentDoc) {
            router.push("/portal/login")
          } else {
            setStudentData({ id: studentDoc.id, ...studentDoc.data() })
            setIsLoading(false)
          }
        } catch (e) {
          console.error(e)
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

  return (
    <SidebarProvider>
      <PortalSidebar student={studentData} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <NotificationBell studentId={studentData?.id} />
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium">{studentData?.firstName} {studentData?.lastName}</span>
              <span className="text-xs text-muted-foreground">
                {studentData?.appliedCourse || 'Enrolled Student'}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold hover:bg-primary/20 transition-colors cursor-pointer outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary">
                  {(studentData?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}{(studentData?.lastName?.[0] || '').toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/portal/profile")} className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Update Details</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
