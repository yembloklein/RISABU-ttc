"use client"

import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { doc, serverTimestamp, collection, query, where, getDocs, limit, setDoc } from "firebase/firestore"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const pathname = usePathname()
  const router = useRouter()
  const [isCheckingRole, setIsCheckingRole] = useState(true)

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (!isUserLoading && !user && !isLoginPage) {
      router.push("/login")
    }
  }, [user, isUserLoading, isLoginPage, router])

  // Strict Administrative Bootstrapping logic
  useEffect(() => {
    const checkRoleAndBootstrap = async () => {
      if (!user || !firestore) {
        setIsCheckingRole(false)
        return
      }

      try {
        // Robust Student Check (Case-insensitive)
        if (user.email) {
          const studentsRef = collection(firestore, "students")
          const emailVariants = [user.email, user.email.toLowerCase()]
          const uniqueVariants = Array.from(new Set(emailVariants))
          
          let studentDoc = null
          for (const emailVar of uniqueVariants) {
            const q = query(studentsRef, where("contactEmail", "==", emailVar), limit(1))
            const snapshot = await getDocs(q)
            if (!snapshot.empty) {
              studentDoc = snapshot.docs[0]
              break
            }
          }

          if (studentDoc) {
            // User is a student, redirect to portal and STOP
            console.log("Student identified, redirecting to portal...")
            router.push("/portal/dashboard")
            return
          }
        }

        // If we reach here, user is likely Staff or Admin
        const userDocRef = doc(firestore, "users", user.uid)
        
        if (user.email === "clainyemblo@gmail.com") {
          const adminRoleRef = doc(firestore, "roles_admin", user.uid)
          // Use direct setDoc to avoid the global error emitter from setDocumentNonBlocking
          try {
            await setDoc(adminRoleRef, {
              email: user.email,
              assignedAt: serverTimestamp(),
            }, { merge: true })

            await setDoc(userDocRef, {
              id: user.uid,
              firebaseUid: user.uid,
              email: user.email,
              firstName: user.displayName?.split(' ')[0] || "Super",
              lastName: user.displayName?.split(' ').slice(1).join(' ') || "Admin",
              role: "Admin",
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }, { merge: true })
          } catch (e) {
            console.warn("Bootstrap: Admin role write failed (likely missing permissions):", e)
          }
        } 
        else {
          const staffRoleRef = doc(firestore, "roles_staff", user.uid)
          
          try {
            // Silently attempt to bootstrap as staff
            // We use setDoc directly instead of setDocumentNonBlocking to avoid triggering the global error popup
            await setDoc(staffRoleRef, {
              email: user.email || "staff@risabu.ac.ke",
              assignedAt: serverTimestamp(),
            }, { merge: true })

            await setDoc(userDocRef, {
              id: user.uid,
              firebaseUid: user.uid,
              email: user.email || "staff@risabu.ac.ke",
              firstName: user.displayName?.split(' ')[0] || "College",
              lastName: user.displayName?.split(' ').slice(1).join(' ') || "Staff",
              role: "Staff",
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }, { merge: true })
          } catch (e) {
            console.warn("Bootstrap: Staff role write failed. This is expected if the user is a student or not authorized staff.", e)
            
            // FALLBACK: If bootstrapping as staff fails, it's highly likely this user 
            // is actually a student (whose record might be missing) or an unauthorized user.
            // Redirect them to the portal dashboard as a safe default.
            router.push("/portal/dashboard")
            return
          }
        }
      } catch (error) {
        console.error("Error bootstrapping role:", error)
      } finally {
        setIsCheckingRole(false)
      }
    }

    if (!isUserLoading) {
      checkRoleAndBootstrap()
    }
  }, [user, firestore, isUserLoading, router])

  if (isUserLoading || (user && isCheckingRole)) {
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
              <span className="text-sm font-medium">{user?.displayName || user?.email?.split('@')[0] || 'College User'}</span>
              <span className="text-xs text-muted-foreground">
                {user?.email === "clainyemblo@gmail.com" ? 'Super Admin' : 'Authorized Staff'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
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
