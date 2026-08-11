"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/ui/logo"
import { useAuth, useUser, initiateEmailSignIn } from "@/firebase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      initiateEmailSignIn(auth, email, password)
    } catch (err: any) {
      setError(err.message || "Authentication failed")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-[400px] shadow-xl border-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-white p-2 rounded-2xl w-fit shadow-lg ring-1 ring-slate-100 overflow-hidden">
            <Logo size={64} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Risabu Technical Training College</CardTitle>
            <CardDescription>Sign in to access the College ERP</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@risabu.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 rounded-full font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <a href="/portal/login" className="text-xs text-slate-400 hover:text-primary transition-colors">
              Are you a student? Student Portal
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
