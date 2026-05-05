"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { GraduationCap, Loader2, Key } from "lucide-react"
import { useAuth, useUser, initiateAnonymousSignIn, initiateEmailSignIn } from "@/firebase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      initiateEmailSignIn(auth, email, password)
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
      setLoading(false)
    }
  }

  const handleGuestSignIn = () => {
    setLoading(true)
    initiateAnonymousSignIn(auth)
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-[400px] shadow-xl border-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-2xl w-fit shadow-lg">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Risabu Connect</CardTitle>
            <CardDescription>Sign in to access the College ERP</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@risabu.ac.ke" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/20">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-muted px-2 text-muted-foreground">Demo Access</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGuestSignIn} disabled={loading}>
            <Key className="mr-2 h-4 w-4" /> Sign in as Guest Admin
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
