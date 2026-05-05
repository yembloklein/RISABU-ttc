"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, Mail, Phone, GraduationCap, MapPin, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const firestore = useFirestore()
  const studentsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "students");
  }, [firestore]);

  const { data: students, isLoading } = useCollection(studentsRef);

  const filteredStudents = (students || []).filter(stu => 
    stu.admissionStatus === "Enrolled" && // Only show enrolled students
    (stu.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stu.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stu.appliedCourse && stu.appliedCourse.toLowerCase().includes(searchTerm.toLowerCase())) ||
    stu.id.toLowerCase().includes(searchTerm.toLowerCase()))
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <Card key={student.id} className="group hover:border-primary/50 transition-all">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background group-hover:border-primary/20 transition-all">
                    <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} alt={`${student.firstName} ${student.lastName}`} />
                    <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{student.firstName} {student.lastName}</CardTitle>
                    <CardDescription className="font-mono text-xs">{student.id.substring(0, 8)}</CardDescription>
                    <Badge variant={
                      student.status === "Active" ? "default" :
                      student.status === "On Leave" ? "secondary" : "destructive"
                    } className="mt-1">
                      {student.status || "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      <span className="text-foreground">{student.appliedCourse || student.course || "General Studies"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{student.year || "Year 1"}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{student.contactEmail}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{student.contactPhone || "N/A"}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">View Profile</Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 flex-1">Send Notice</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border border-dashed">
              <p className="text-muted-foreground">No enrolled students found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
