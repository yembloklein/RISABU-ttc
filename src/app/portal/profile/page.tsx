"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query, where, limit, doc, updateDoc } from "firebase/firestore"
import { updatePassword } from "firebase/auth"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, Mail, Phone, MapPin, ShieldCheck, Camera, Save, Loader2, Landmark, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()

  // Fetch Student Data
  const studentQuery = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null
    return query(collection(firestore, "students"), where("contactEmail", "==", user.email), limit(1))
  }, [firestore, user])
  
  const { data: studentsData, isLoading: isStudentLoading } = useCollection(studentQuery)
  const student = studentsData?.[0]

  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPassUpdating, setIsPassUpdating] = useState(false)

  useEffect(() => {
    if (student) {
      setPhone(student.contactPhone || "")
      setAddress(student.address || "")
    }
  }, [student])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firestore || !student?.id) return

    setIsUpdating(true)
    try {
      const studentRef = doc(firestore, "students", student.id)
      await updateDoc(studentRef, {
        contactPhone: phone,
        address: address,
        updatedAt: new Date().toISOString()
      })
      toast({
        title: "Profile Updated",
        description: "Your contact information has been successfully updated.",
      })
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Update Failed",
        description: "An error occurred while updating your profile.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser || !newPassword) return

    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      })
      return
    }

    setIsPassUpdating(true)
    try {
      await updatePassword(auth.currentUser, newPassword)
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      })
      setNewPassword("")
    } catch (error: any) {
      console.error("Pass update error:", error)
      let msg = "An error occurred. You may need to sign out and in again to change your password."
      if (error.code === "auth/requires-recent-login") {
        msg = "For security reasons, you must have recently signed in to change your password. Please sign out and sign in again."
      }
      toast({
        title: "Update Failed",
        description: msg,
        variant: "destructive"
      })
    } finally {
      setIsPassUpdating(false)
    }
  }

  if (isStudentLoading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-200" /></div>
  }

  if (!student) return null

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 border shadow-sm">
          <AvatarFallback className="bg-slate-100 text-slate-400 text-xl font-bold">
            {student.firstName?.[0]}{student.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {student.firstName} {student.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm font-medium text-slate-500">{student.appliedCourse}</p>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <p className="text-sm font-medium text-slate-500">ID: {student.admissionNumber || "Pending"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50 pb-4 px-6">
              <CardTitle className="text-base font-bold text-slate-900">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Email Address</Label>
                    <Input value={student.contactEmail} disabled className="bg-slate-50 text-slate-500 font-medium h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Phone Number</Label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254..." 
                      className="font-medium h-10" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Physical Address</Label>
                  <Input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="City, Street" 
                    className="font-medium h-10" 
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 h-10">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-xl overflow-hidden border-amber-100">
            <CardHeader className="border-b bg-amber-50/30 pb-4 px-6">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">New Password</Label>
                  <Input 
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters" 
                    className="font-medium h-10" 
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    If this is your first login, we recommend changing your initial Admission Number password.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={isPassUpdating || !newPassword} className="bg-slate-900 hover:bg-slate-800 font-bold px-6 h-10">
                    {isPassUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Guardian</h2>
          <Card className="border shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Guardian</p>
                <p className="text-sm font-bold text-slate-900">{student.guardianName || "N/A"}</p>
                <p className="text-xs font-medium text-slate-500">{student.guardianRelationship || "Guardian"}</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contact</p>
                <p className="text-sm font-semibold text-slate-900">{student.guardianPhone || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
