"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, MoreHorizontal, UserCheck, XCircle } from "lucide-react"

export default function AdmissionsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const applications = [
    { id: "APP-001", name: "Alice Mwangi", course: "Diploma in ICT", date: "2024-03-01", status: "Pending" },
    { id: "APP-002", name: "Robert Ochieng", course: "Certificate in Business", date: "2024-03-02", status: "Under Review" },
    { id: "APP-003", name: "Sarah Kemboi", course: "Diploma in Engineering", date: "2024-03-02", status: "Approved" },
    { id: "APP-004", name: "David Mutua", course: "Diploma in ICT", date: "2024-03-03", status: "Rejected" },
  ]

  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.course.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admissions Management</h1>
          <p className="text-muted-foreground">Process and track new student applications</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Student Application</DialogTitle>
              <DialogDescription>
                Enter the details of the prospective student to start the admission process.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Full Name</Label>
                <Input id="name" placeholder="John Doe" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course" className="text-right">Course</Label>
                <Input id="course" placeholder="Select Course" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Submit Application</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search applications..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">App ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Course Applied</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs font-semibold">{app.id}</TableCell>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>{app.course}</TableCell>
                    <TableCell>{app.date}</TableCell>
                    <TableCell>
                      <Badge variant={
                        app.status === "Approved" ? "default" :
                        app.status === "Pending" ? "secondary" :
                        app.status === "Rejected" ? "destructive" : "outline"
                      }>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No applications found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
