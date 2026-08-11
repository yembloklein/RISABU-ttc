"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { collection, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase"
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function PesapalCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()

  const orderTrackingId = searchParams.get("OrderTrackingId") || searchParams.get("orderTrackingId")
  const merchantRef = searchParams.get("OrderMerchantReference") || searchParams.get("orderMerchantReference")

  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "error">("verifying")
  const [detail, setDetail] = useState<any>(null)

  const paymentsRef = useMemoFirebase(
    () => (firestore && user ? collection(firestore, "payments") : null),
    [firestore, user]
  )

  useEffect(() => {
    if (!orderTrackingId) { setStatus("error"); return }

    const verify = async () => {
      try {
        const res = await fetch(`/api/pesapal/status?orderTrackingId=${orderTrackingId}`)
        const data = await res.json()
        setDetail(data)

        if (data.status === "Completed") {
          // Write payment to Firestore
          if (paymentsRef && user) {
            // Extract studentId from merchantRef: RISABU-<studentId>-<timestamp>
            const parts = (merchantRef || data.merchantReference || "").split("-")
            const studentId = parts.length >= 2 ? parts[1] : ""

            addDocumentNonBlocking(paymentsRef, {
              type: "Fee",
              studentId,
              amount: Number(data.amount),
              paymentMethod: `Pesapal — ${data.paymentMethod || "Online"}`,
              transactionReference: data.confirmationCode || orderTrackingId,
              pesapalTrackingId: orderTrackingId,
              merchantReference: merchantRef || "",
              paymentDate: new Date().toISOString(),
              recordedByUserId: user.uid,
              recordedByUserFirebaseUid: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }
          setStatus("success")
        } else {
          setStatus("failed")
        }
      } catch {
        setStatus("error")
      }
    }

    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTrackingId])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">

          {status === "verifying" && (
            <>
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Verifying Payment</h1>
                <p className="text-sm text-slate-500 mt-1">Please wait while we confirm your payment with Pesapal…</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Payment Successful!</h1>
                <p className="text-sm text-slate-500 mt-1">
                  KES {Number(detail?.amount || 0).toLocaleString()} received via {detail?.paymentMethod || "Pesapal"}.
                </p>
                {detail?.confirmationCode && (
                  <p className="text-xs font-mono bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 mt-2">
                    Ref: {detail.confirmationCode}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                onClick={() => router.push("/portal/finance")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Finance
              </Button>
            </>
          )}

          {(status === "failed" || status === "error") && (
            <>
              <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-rose-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {status === "failed" ? "Payment Not Completed" : "Verification Error"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {status === "failed"
                    ? `Status: ${detail?.status || "Unknown"}. No charge was made. Please try again.`
                    : "We could not verify your payment. If money was deducted, contact the Finance Office with your Pesapal reference."}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => router.push("/portal/finance")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Finance
              </Button>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}

export default function PesapalCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    }>
      <PesapalCallbackContent />
    </Suspense>
  )
}
