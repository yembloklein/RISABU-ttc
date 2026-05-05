"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, Mail, Phone, GraduationCap, MapPin } from "lucide-react"

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const students = [
    { 
      id: "STU-1001", 
      name: "John Kamau", 
      email: "john.kamau@risabu.ac.ke", 
      phone: "+254 712 345 678",
      course: "Diploma in Information Tech", 
      year: "Year 2",
      status: "Active",
      avatar: "https://picsum.photos/seed/stu1/100/100"
    },
    { 
      id: "STU-1002", 
      name: "Mercy Cherono", 
      email: "m.cherono@risabu.ac.ke", 
      phone: "+254 722 987 654",
      course: "Cert in Business Management", 
      year: "Year 1",
      status: "Active",
      avatar: "https://picsum.photos/seed/stu2/100/100"
    },
    { 
      id: "STU-1003", 
      name: "Felix Maina", 
      email: "f.maina@risabu.ac.ke", 
      phone: "+254 733 111 222",
      course: "Diploma in Electrical Eng", 
      year: "Year 3",
      status: "On Leave",
      avatar: "https://picsum.photos/seed/stu3/100/100"
    },
    { 
      id: "STU-1004", 
      name: "Phyllis Wangui", 
      email: "p.wangui@risabu.ac.ke", 
      phone: "+254 744 555 666",
      course: "Diploma in ICT", 
      year: "Year 2",
      status: "Active",
      avatar: "https://picsum.photos/seed/stu4/100/100"
    },
    { 
      id: "STU-1005", 
      name: "Brian Otieno", 
      email: "b.otieno@risabu.ac.ke", 
      phone: "+254 755 000 999",
      course: "Diploma in Civil Eng", 
      year: "Year 1",
      status: "Inactive",
      avatar: "https://picsum.photos/seed/stu5/100/100"
    },
  ]

  const filteredStudents = students.filter(stu => 
    stu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stu.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stu.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Directory</h1>
        <p className="text-muted-foreground">Manage enrolled students and their profiles</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, ID or course..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <Card key={student.id} className="group hover:border-primary/50 transition-all">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-background group-hover:border-primary/20 transition-all">
                <AvatarImage src={student.avatar} alt={student.name} />
                <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{student.name}</CardTitle>
                <CardDescription className="font-mono text-xs">{student.id}</CardDescription>
                <Badge variant={
                  student.status === "Active" ? "default" :
                  student.status === "On Leave" ? "secondary" : "destructive"
                } className="mt-1">
                  {student.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  <span className="text-foreground">{student.course}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{student.year}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{student.email}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{student.phone}</span>
                </div>
              </div>
              <div className="pt-4 border-t flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">View Profile</Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 flex-1">Send Notice</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
