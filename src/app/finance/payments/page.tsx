
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, CreditCard, Banknote, Landmark, Download, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" })

  const firestore = useFirestore()
  const { user } = useUser()

  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  const invoicesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "invoices") : null, [firestore, user])
  
  const { data: payments, isLoading } = useCollection(paymentsRef)
  const { data: invoices } = useCollection(invoicesRef)

  const handleRecordPayment = async () => {
    if (!paymentsRef || !user || !firestore) return;

    const amount = Number(formData.amount)
    const selectedInvoice = (invoices || []).find(i => i.id === formData.invoiceId)
    
    if (!selectedInvoice) return;

    // Record the payment
    addDocumentNonBlocking(paymentsRef, {
      invoiceId: formData.invoiceId,
      studentId: selectedInvoice.studentId,
      amount: amount,
      paymentMethod: formData.method,
      transactionReference: formData.reference,
      paymentDate: new Date().toISOString(),
      recordedByUserId: user.uid,
      recordedByUserFirebaseUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update invoice outstanding balance
    const invoiceDocRef = doc(firestore, "invoices", formData.invoiceId)
    const newOutstanding = Number(selectedInvoice.outstandingAmount) - amount
    
    updateDoc(invoiceDocRef, {
      outstandingAmount: newOutstanding,
      status: newOutstanding <= 0 ? "Paid" : "Partially Paid",
      updatedAt: serverTimestamp()
    })

    setIsDialogOpen(false);
    setFormData({ invoiceId: "", amount: "", method: "M-Pesa", reference: "" });
  };

  const filteredPayments = (payments || []).filter(p => 
    p.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const mpesaTotal = (payments || []).filter(p => p.paymentMethod === "M-Pesa").reduce((acc, p) => acc + Number(p.amount), 0)
  const bankTotal = (payments || []).filter(p => p.paymentMethod === "Bank Transfer").reduce((acc, p) => acc + Number(p.amount), 0)
  const otherTotal = (payments || []).filter(p => p.paymentMethod === "Cash" || p.paymentMethod === "Card").reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payment Records</h1>
          <p className="text-muted-foreground">Log and audit student fee payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Reports
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Payment</DialogTitle>
                <DialogDescription>Log a payment against an issued invoice.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="invoice" className="text-right">Invoice</Label>
                  <Select onValueChange={(v) => setFormData({...formData, invoiceId: v})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {(invoices || []).filter(i => i.status !== "Paid").map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} (Bal: {Number(i.outstandingAmount).toLocaleString()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input 
                    id="amount" type="number" className="col-span-3"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="method" className="text-right">Method</Label>
                  <Select onValueChange={(v) => setFormData({...formData, method: v})} defaultValue="M-Pesa">
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ref" className="text-right">Reference</Label>
                  <Input 
                    id="ref" className="col-span-3"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRecordPayment}>Save Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">M-Pesa Payments</CardTitle>
            <div className="bg-green-100 p-2 rounded text-green-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {mpesaTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <div className="bg-blue-100 p-2 rounded text-blue-700">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {bankTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other Methods</CardTitle>
            <div className="bg-orange-100 p-2 rounded text-orange-700">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {otherTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by reference or invoice ID..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <TableRow key={pay.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(pay.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{pay.invoiceId}</TableCell>
                    <TableCell className="font-semibold text-accent">KES {Number(pay.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pay.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{pay.transactionReference}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No payment records found.
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
