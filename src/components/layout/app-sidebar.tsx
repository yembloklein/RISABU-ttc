
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  Receipt,
  GraduationCap,
  FileText,
  CreditCard,
  LogOut,
  ShieldCheck
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
  },
  {
    title: "Admissions",
    icon: UserPlus,
    url: "/admissions",
  },
  {
    title: "Students",
    icon: Users,
    url: "/students",
  },
  {
    title: "Courses",
    icon: BookOpen,
    url: "/courses",
  },
  {
    title: "Staff",
    icon: ShieldCheck,
    url: "/staff",
  },
  {
    title: "Finance",
    group: true,
    items: [
      {
        title: "Invoices",
        icon: FileText,
        url: "/finance/invoices",
      },
      {
        title: "Fee Payments",
        icon: CreditCard,
        url: "/finance/fees",
      },
      {
        title: "Expenses",
        icon: Receipt,
        url: "/finance/expenses",
      },
    ],
  },
]

export function AppSidebar() {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden transition-all group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold leading-none text-primary">Risabu</span>
            <span className="text-xs text-muted-foreground">Connect College</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.group) {
                  return (
                    <div key={item.title} className="mt-4 first:mt-0">
                      <SidebarGroupLabel className="px-2 transition-all group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </SidebarGroupLabel>
                      {item.items?.map((subItem) => (
                        <SidebarMenuItem key={subItem.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === subItem.url}
                            tooltip={subItem.title}
                            onClick={() => setOpenMobile(false)}
                          >
                            <Link href={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Link href={item.url!}>
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
