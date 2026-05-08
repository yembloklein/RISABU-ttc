
"use client"

import { useState, useMemo } from "react"
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileBarChart,
  Calendar,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Info,
  DollarSign,
  Users,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminFinancialTrendSummary, type AdminFinancialTrendSummaryOutput } from "@/ai/flows/admin-financial-trend-summary"
import { adminUnusualExpenseDetection, type AdminUnusualExpenseDetectionOutput } from "@/ai/flows/admin-unusual-expense-detection"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection } from "firebase/firestore"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

export default function FinancialReportsPage() {
  const [loadingAI, setLoadingAI] = useState(false)
  const [summary, setSummary] = useState<AdminFinancialTrendSummaryOutput | null>(null)
  const [selectedAnomalyIndex, setSelectedAnomalyIndex] = useState<number | null>(null)
  const [anomalyResult, setAnomalyResult] = useState<AdminUnusualExpenseDetectionOutput | null>(null)
  const [analyzingAnomaly, setAnalyzingAnomaly] = useState(false)

  const firestore = useFirestore()
  const { user } = useUser()
  
  const expensesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "expenses") : null, [firestore, user])
  const paymentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "payments") : null, [firestore, user])
  const invoicesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "invoices") : null, [firestore, user])
  const studentsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, "students") : null, [firestore, user])
  
  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesRef)
  const { data: payments, isLoading: loadingPayments } = useCollection(paymentsRef)
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesRef)
  const { data: students } = useCollection(studentsRef)

  // Sustainability Logic (Revenue vs. Expenses)
  const financialBalance = useMemo(() => {
    const totalRev = (payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const totalExp = (expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
    const net = totalRev - totalExp
    
    return {
      totalRev,
      totalExp,
      net,
      ratio: totalExp > 0 ? (totalRev / totalExp).toFixed(2) : "0"
    }
  }, [payments, expenses])

  // Debtors Aging (Arrears)
  const topDebtors = useMemo(() => {
    const debtMap: Record<string, number> = {}
    
    ;(invoices || []).forEach(inv => {
      debtMap[inv.studentId] = (debtMap[inv.studentId] || 0) + (Number(inv.outstandingAmount) || 0)
    })

    return Object.entries(debtMap)
      .map(([studentId, amount]) => {
        const student = (students || []).find(s => s.id === studentId)
        return {
          id: studentId,
          name: student ? `${student.firstName} ${student.lastName}` : "Unknown Student",
          course: student?.appliedCourse || "N/A",
          amount
        }
      })
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [invoices, students])

  // Chart Data for Sustainability
  const pieData = [
    { name: "Revenue", value: financialBalance.totalRev, fill: "hsl(var(--primary))" },
    { name: "Expenses", value: financialBalance.totalExp, fill: "hsl(var(--destructive))" },
  ]

  const handleGenerateAISummary = async () => {
    if (!expenses) return
    setLoadingAI(true)
    
    // Grouping for AI
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const cur = expenses.filter(e => {
      const d = new Date(e.expenseDate)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    
    try {
      const result = await adminFinancialTrendSummary({
        currentPeriodData: {
          periodDescription: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          expenses: cur.map(e => ({ category: e.categoryId || 'General', amount: Number(e.amount) }))
        },
        previousPeriodData: {
          periodDescription: "Historical Baseline",
          expenses: expenses.map(e => ({ category: e.categoryId || 'General', amount: Number(e.amount) }))
        },
        currency: "KES"
      })
      setSummary(result)
    } catch (error) {
      console.error("AI Generation failed", error)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleAnalyzeAnomaly = async (index: number) => {
    if (!expenses) return;
    setSelectedAnomalyIndex(index)
    setAnomalyResult(null)
    setAnalyzingAnomaly(true)
    
    const historical = expenses.filter((_, i) => i !== index).map(e => ({
      category: e.categoryId || 'General',
      amount: Number(e.amount),
      date: e.expenseDate,
      description: e.description
    }))

    const newExp = {
      category: expenses[index].categoryId || 'General',
      amount: Number(expenses[index].amount),
      date: expenses[index].expenseDate,
      description: expenses[index].description
    }

    try {
      const result = await adminUnusualExpenseDetection({
        historicalExpenses: historical,
        newExpense: newExp
      })
      setAnomalyResult(result)
    } catch (error) {
      console.error("Anomaly audit failed", error)
    } finally {
      setAnalyzingAnomaly(false)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileBarChart className="h-8 w-8 text-primary" />
            Financial Audit & Strategy
          </h1>
          <p className="text-muted-foreground">Comprehensive reporting and institutional health analysis.</p>
        </div>
        <Button 
          onClick={handleGenerateAISummary} 
          disabled={loadingAI || !expenses?.length}
          variant="secondary"
          className="shadow-sm border border-primary/20"
        >
          {loadingAI ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
          Run AI Strategic Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Core Financial Health */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none ring-1 ring-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Sustainability Ratio
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{financialBalance.ratio}x</div>
                  <p className="text-xs text-muted-foreground mt-1">Revenue coverage vs Expenses</p>
                </div>
                <div className="h-[80px] w-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={25}
                        outerRadius={35}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-sm bg-destructive/[0.02]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Outstanding Arrears
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  KES {( (invoices || []).reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0) ).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total uncollected student fees</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Critical Collection List
              </CardTitle>
              <CardDescription>Top 5 students with the highest outstanding balances</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                {topDebtors.length > 0 ? (
                  topDebtors.map((debtor, i) => (
                    <div key={debtor.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-bold text-sm">{debtor.name}</p>
                        <p className="text-xs text-muted-foreground">{debtor.course}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-destructive">KES {debtor.amount.toLocaleString()}</p>
                        <Badge variant="outline" className="text-[10px] h-4">Pending</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground italic text-sm">
                    No active arrears detected.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Strategic Results */}
          {summary && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{summary.summaryTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/80">{summary.overallSummary}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.keyInsights.map((insight, idx) => (
                  <Card key={idx} className="border-none ring-1 ring-border bg-card">
                    <CardContent className="p-4 flex gap-4">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-xs font-medium leading-relaxed">{insight}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Risk Auditor */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="sticky top-24 shadow-lg border-none ring-1 ring-border overflow-hidden">
            <div className="bg-orange-500/10 p-4 border-b border-orange-500/20">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                AI Expenditure Audit
              </CardTitle>
            </div>
            <CardContent className="p-0">
              <div className="p-4 bg-muted/30 flex items-start gap-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <p>Select an expense to audit its legitimacy against institutional patterns.</p>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {expenses && expenses.length > 0 ? (
                    expenses.slice(0, 10).map((expense, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnalyzeAnomaly(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedAnomalyIndex === idx ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-[10px] uppercase text-muted-foreground">{expense.categoryId}</span>
                          <span className="text-xs font-bold">KES {Number(expense.amount).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] font-medium line-clamp-1">{expense.description}</p>
                      </button>
                    ))
                  ) : (
                    <div className="py-20 text-center text-xs text-muted-foreground">No records to audit.</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            {selectedAnomalyIndex !== null && (
              <CardFooter className="bg-muted/30 p-4 border-t">
                {analyzingAnomaly ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-[10px] font-bold uppercase text-primary">Running Audit...</span>
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : anomalyResult ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">AI Assessment</span>
                      {anomalyResult.isUnusual ? (
                        <Badge variant="destructive" className="h-5 text-[10px]">Anomalous</Badge>
                      ) : (
                        <Badge variant="default" className="h-5 text-[10px] bg-green-600">Typical</Badge>
                      )}
                    </div>
                    <p className="text-[11px] italic leading-relaxed text-foreground/80 bg-background p-2 rounded border">
                      "{anomalyResult.reason}"
                    </p>
                  </div>
                ) : null}
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
