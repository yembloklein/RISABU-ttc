"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  LogOut,
  User,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  FileText
} from "lucide-react"
import { Logo } from "@/components/ui/logo"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const portalMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/portal/dashboard",
  },
  {
    title: "Academics",
    icon: BookOpen,
    url: "/portal/academics",
  },
  {
    title: "Grades",
    icon: ClipboardList,
    url: "/portal/grades",
  },
  {
    title: "Finance",
    icon: Wallet,
    url: "/portal/finance",
  },
  {
    title: "Documents",
    icon: FileText,
    url: "/portal/documents",
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    url: "/portal/attendance",
  },
  {
    title: "Support",
    icon: MessageSquare,
    url: "/portal/support",
  },
  {
    title: "Profile",
    icon: User,
    url: "/portal/profile",
  },
]


export function PortalSidebar({ student }: { student: any }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const auth = useAuth()

  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Logout failed", err))
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-100">
            <Logo size={40} className="p-0.5" />
          </div>
          <div className="flex flex-col overflow-hidden transition-all group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold leading-none text-primary">Student</span>
            <span className="text-xs text-muted-foreground">Portal Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalMenuItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
