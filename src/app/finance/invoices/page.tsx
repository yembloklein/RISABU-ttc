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
import { Search, FilePlus, Download, Filter, MoreHorizontal, Loader2 } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser } from "@/firebase"
import { collection, serverTimestamp } from "firebase/firestore"

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ studentId: "", amount: "", description: "" })
  
  const firestore = useFirestore()
  const { user } = useUser()

  const invoicesRef = useMemoFirebase(() => firestore ? collection(firestore, "invoices") : null, [firestore])
  const studentsRef = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore])
  
  const { data: invoices, isLoading } = useCollection(invoicesRef)
  const { data: students } = useCollection(studentsRef)

  const filteredInvoices = (invoices || []).filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateInvoice = () => {
    if (!invoicesRef || !user) return;
    
    const amount = Number(formData.amount)
    const invNumber = `INV-${Date.now().toString().slice(-6)}`
    
    addDocumentNonBlocking(invoicesRef, {
      id: invNumber, // Using simple ID for this prototype
      studentId: formData.studentId,
      invoiceNumber: invNumber,
      totalAmount: amount,
      outstandingAmount: amount,
      status: "Issued",
      description: formData.description,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days due
      recordedByUserFirebaseUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    setIsDialogOpen(false);
    setFormData({ studentId: "", amount: "", description: "" });
  };

  const totalBilled = (invoices || []).reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0)
  const totalOutstanding = (invoices || []).reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0)
  const totalCollected = totalBilled - totalOutstanding

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track student fee invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <FilePlus className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Generate a bill for a student.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="student" className="text-right">Student</Label>
                  <Select onValueChange={(v) => setFormData({...formData, studentId: v})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {(students || []).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount (KES)</Label>
                  <Input 
                    id="amount" type="number" className="col-span-3"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">Description</Label>
                  <Input 
                    id="desc" className="col-span-3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateInvoice}>Generate Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Billed</CardTitle>
            <div className="text-2xl font-bold text-primary">KES {totalBilled.toLocaleString()}</div>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Collected</CardTitle>
            <div className="text-2xl font-bold text-accent">KES {totalCollected.toLocaleString()}</div>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Outstanding</CardTitle>
            <div className="text-2xl font-bold text-destructive">KES {totalOutstanding.toLocaleString()}</div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search invoice number or description..." 
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
                <TableHead>Invoice ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{inv.description}</TableCell>
                    <TableCell>KES {Number(inv.totalAmount).toLocaleString()}</TableCell>
                    <TableCell>{inv.issueDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        inv.status === "Paid" ? "default" :
                        inv.status === "Issued" ? "secondary" : "destructive"
                      }>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No invoices found.
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
