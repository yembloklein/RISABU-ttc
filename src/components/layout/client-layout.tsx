
"use client"

import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { doc, serverTimestamp } from "firebase/firestore"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (!isUserLoading && !user && !isLoginPage) {
      router.push("/login")
    }
  }, [user, isUserLoading, isLoginPage, router])

  // Administrative Bootstrapping logic
  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, "users", user.uid)
      
      // Auto-bootstrap Admin Role for specific email
      if (user.email === "clainyemblo@gmail.com") {
        const adminRoleRef = doc(firestore, "roles_admin", user.uid)
        setDocumentNonBlocking(adminRoleRef, {
          email: user.email,
          assignedAt: serverTimestamp(),
        }, { merge: true })

        setDocumentNonBlocking(userDocRef, {
          id: user.uid,
          firebaseUid: user.uid,
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || "Admin",
          lastName: user.displayName?.split(' ').slice(1).join(' ') || "User",
          role: "Admin",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } 
      // Auto-bootstrap Staff Role for Guest/Other users to ensure app visibility
      else {
        const staffRoleRef = doc(firestore, "roles_staff", user.uid)
        setDocumentNonBlocking(staffRoleRef, {
          email: user.email || "guest@risabu.ac.ke",
          assignedAt: serverTimestamp(),
        }, { merge: true })

        setDocumentNonBlocking(userDocRef, {
          id: user.uid,
          firebaseUid: user.uid,
          email: user.email || "guest@risabu.ac.ke",
          firstName: "Guest",
          lastName: "Staff",
          role: "Staff",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    }
  }, [user, firestore])

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Initializing Risabu Connect...</p>
        </div>
      </div>
    )
  }

  if (!user && !isLoginPage) {
    return null
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <Toaster />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                <li>Risabu Connect</li>
                <li className="before:content-['/'] before:mr-2">ERP</li>
                <li className="before:content-['/'] before:mr-2 capitalize">{pathname.split('/').pop() || 'Dashboard'}</li>
              </ol>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user?.displayName || user?.email?.split('@')[0] || 'Admin User'}</span>
              <span className="text-xs text-muted-foreground">{user?.isAnonymous ? 'Guest Staff' : 'Authorized User'}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </div>
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
