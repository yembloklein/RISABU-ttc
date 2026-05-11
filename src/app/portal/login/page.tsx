"use client"

import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { useAuth, useFirestore } from "@/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus, LogIn, MailCheck, ShieldAlert } from "lucide-react"
import { Logo } from "@/components/ui/logo"

export default function StudentLogin() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const firestore = useFirestore()

  const urlError = searchParams.get("error")

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address above first, then click Forgot?")
      return
    }
    setResetLoading(true)
    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: any) {
      const code = err?.code
      if (code === "auth/user-not-found") {
        setError("No account found with this email. Please activate your account first.")
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.")
      } else {
        setError("Could not send reset email. Please try again.")
      }
    } finally {
      setResetLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password)
        } catch (signInErr: any) {
          // If login fails, check if this is a valid student attempting first-time login
          if (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") {
            const studentByEmailQuery = query(
              collection(firestore, "students"),
              where("contactEmail", "==", email.toLowerCase()),
              limit(1)
            )
            const emailSnapshot = await getDocs(studentByEmailQuery)
            
            if (emailSnapshot.empty) {
              // Not a registered student email
              throw new Error("This email is not registered in our student records.")
            }

            const studentData = emailSnapshot.docs[0].data()
            if (studentData.admissionNumber === password) {
              // Reg No matches! If they don't have an account, create it.
              // If they DO have an account but used Reg No, signIn would have failed if they changed password.
              try {
                await createUserWithEmailAndPassword(auth, email, password)
              } catch (createErr: any) {
                if (createErr.code === "auth/email-already-in-use") {
                  throw new Error("Account exists. If this is your first time, your password is your Reg No. If you've changed it, please use your new password.")
                }
                throw createErr
              }
            } else {
              // Student found, but password doesn't match Reg No
              throw new Error("Invalid password. First-time users: Your password is your Admission Number (e.g., ADM/2024/001).")
            }
          } else {
            throw signInErr
          }
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.push("/portal/dashboard")
    } catch (err: any) {
      console.error(err)
      const code = err?.code
      const message = err?.message
      
      const friendlyMessages: Record<string, string> = {
        "auth/email-already-in-use": "This email is already registered. Please switch to Sign In instead.",
        "auth/user-not-found": "No account found. First-time users: Your password is your Registration Number.",
        "auth/wrong-password": "Incorrect password. If this is your first time, use your Registration Number.",
        "auth/invalid-credential": "Login failed. Ensure you use the email provided during admission.",
        "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
        "auth/invalid-email": "Please enter a valid email address.",
      }

      // Use custom message if it doesn't look like a Firebase code
      if (message && !message.includes("auth/") && !code) {
        setError(message)
      } else {
        setError(friendlyMessages[code] || message || "Access denied. Ensure you use the correct email and password.")
      }
    } finally {
      setIsLoading(false)
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
            <CardTitle className="text-2xl font-bold text-slate-900">Student Portal</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              {isLogin ? "Use your Admission No as your initial password" : "Create your account using your registered email"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {urlError === "not_student" && (
            <p className="mb-4 text-xs text-destructive font-medium bg-destructive/10 p-3 rounded border border-destructive/20 text-center">
              Access Denied: This email is not linked to an active student record. Please use the email you provided during admission.
            </p>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {resetLoading ? "Sending..." : "Forgot?"}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded text-center">{error}</p>}
            {resetSent && (
              <div className="flex items-start gap-2 text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 p-3 rounded border border-green-500/20">
                <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Password reset email sent! Check your inbox and follow the link to set a new password.</span>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In to Portal
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Activate Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin ? "Need to activate your account? Click here" : "Already activated? Sign In"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
