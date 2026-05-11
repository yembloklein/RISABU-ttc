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
  MessageSquare
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
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg bg-white flex items-center justify-center ring-1 ring-slate-100">
            <Logo size={32} />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Student Portal</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
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
                      onClick={() => setOpenMobile(false)}
                      className={`h-11 px-4 rounded-lg transition-all ${isActive
                          ? "bg-emerald-50 text-emerald-600 font-bold"
                          : "text-slate-600 hover:bg-slate-50 font-medium"
                        }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
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
      <SidebarFooter className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 mb-2">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarImage src={student?.profileImage} />
            <AvatarFallback className="bg-slate-200 text-slate-500 font-bold text-xs">
              {student?.firstName?.[0]}{student?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">{student?.firstName} {student?.lastName}</p>
            <p className="text-[10px] font-medium text-slate-500 truncate">{student?.contactEmail}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="h-10 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
