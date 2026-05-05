"use client"

import { useUser } from "@/firebase"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/toaster"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (!isUserLoading && !user && !isLoginPage) {
      router.push("/login")
    }
  }, [user, isUserLoading, isLoginPage, router])

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
              <span className="text-xs text-muted-foreground">{user?.isAnonymous ? 'Guest Admin' : 'Super Admin'}</span>
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
