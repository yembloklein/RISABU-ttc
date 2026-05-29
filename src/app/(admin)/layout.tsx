"use client"

import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Bell } from "lucide-react"
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
        const { getDoc } = await import("firebase/firestore")
        const userDocRef = doc(firestore, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        // 1. Is the user explicitly registered as Staff or Admin in the `users` collection?
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          if (userData.role === "Admin" || user.email === "clainyemblo@gmail.com") {
            const adminRoleRef = doc(firestore, "roles_admin", user.uid)
            await setDoc(adminRoleRef, { email: user.email, assignedAt: serverTimestamp() }, { merge: true })
          } else {
            const staffRoleRef = doc(firestore, "roles_staff", user.uid)
            await setDoc(staffRoleRef, { email: user.email, assignedAt: serverTimestamp() }, { merge: true })
          }
          setIsCheckingRole(false)
          return
        }

        // 2. Superadmin fallback (if clainyemblo@gmail.com logs in for the first time)
        if (user.email === "clainyemblo@gmail.com") {
          const adminRoleRef = doc(firestore, "roles_admin", user.uid)
          await setDoc(adminRoleRef, { email: user.email, assignedAt: serverTimestamp() }, { merge: true })
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email,
            firstName: "Super",
            lastName: "Admin",
            role: "Admin",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true })
          setIsCheckingRole(false)
          return
        }

        // 3. User is NOT staff. Are they a student?
        if (user.email) {
          const studentsRef = collection(firestore, "students")
          
          // Query multiple exact-match variations (case sensitivity in Firestore)
          const emailVariants = [
            user.email, 
            user.email.toLowerCase(), 
            user.email.trim(), 
            user.email.trim().toLowerCase()
          ]
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

        // 4. Unauthorized User (Neither Staff nor Student)
        console.warn("Unauthorized access attempt. Logging out.")
        const { getAuth, signOut } = await import("firebase/auth")
        const auth = getAuth()
        await signOut(auth)
        router.push("/login?error=unauthorized")
        
      } catch (error) {
        console.error("Error bootstrapping role:", error)
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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 px-6 sticky top-0 bg-white/80 backdrop-blur-lg z-10 shadow-sm">
          <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <div className="flex-1 hidden md:block"></div>
          <div className="flex flex-1 md:flex-none items-center justify-end gap-3">
            <button className="h-8 w-8 rounded-full bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'College User'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none mt-0.5 ${
                  user?.email === 'clainyemblo@gmail.com'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {user?.email === "clainyemblo@gmail.com" ? '✦ Super Admin' : 'Staff'}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
