"use client"

import { useState } from "react"
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  BrainCircuit,
  Calendar,
  RefreshCcw,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminFinancialTrendSummary, type AdminFinancialTrendSummaryOutput } from "@/ai/flows/admin-financial-trend-summary"
import { adminUnusualExpenseDetection, type AdminUnusualExpenseDetectionOutput } from "@/ai/flows/admin-unusual-expense-detection"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AdminFinancialTrendSummaryOutput | null>(null)
  const [selectedAnomalyIndex, setSelectedAnomalyIndex] = useState<number | null>(null)
  const [anomalyResult, setAnomalyResult] = useState<AdminUnusualExpenseDetectionOutput | null>(null)
  const [analyzingAnomaly, setAnalyzingAnomaly] = useState(false)

  const firestore = useFirestore()
  const expensesRef = useMemoFirebase(() => firestore ? collection(firestore, "expenses") : null, [firestore])
  const { data: realExpenses } = useCollection(expensesRef)

  const handleGenerateSummary = async () => {
    if (!realExpenses) return;
    setLoading(true)
    
    // Group expenses by category for the AI
    const categorized = realExpenses.reduce((acc: any, exp) => {
      const cat = exp.categoryId || 'General'
      acc[cat] = (acc[cat] || 0) + (Number(exp.amount) || 0)
      return acc
    }, {})

    const currentPeriodExpenses = Object.entries(categorized).map(([category, amount]) => ({
      category,
      amount: amount as number
    }))

    try {
      const result = await adminFinancialTrendSummary({
        currentPeriodData: {
          periodDescription: "Current Records",
          expenses: currentPeriodExpenses
        },
        previousPeriodData: {
          periodDescription: "Baseline (Empty)",
          expenses: []
        },
        currency: "KES"
      })
      setSummary(result)
    } catch (error) {
      console.error("Failed to generate summary", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeAnomaly = async (index: number) => {
    if (!realExpenses) return;
    setSelectedAnomalyIndex(index)
    setAnalyzingAnomaly(true)
    
    const historical = realExpenses.filter((_, i) => i !== index).map(e => ({
      category: e.categoryId || 'General',
      amount: Number(e.amount),
      date: e.expenseDate,
      description: e.description
    }))

    const newExp = {
      category: realExpenses[index].categoryId || 'General',
      amount: Number(realExpenses[index].amount),
      date: realExpenses[index].expenseDate,
      description: realExpenses[index].description
    }

    try {
      const result = await adminUnusualExpenseDetection({
        historicalExpenses: historical,
        newExpense: newExp
      })
      setAnomalyResult(result)
    } catch (error) {
      console.error("Failed to analyze expense", error)
    } finally {
      setAnalyzingAnomaly(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
            AI Financial Insights
          </h1>
          <p className="text-muted-foreground mt-1">Advanced AI analysis of Risabu's spending and revenue patterns.</p>
        </div>
        <Button onClick={handleGenerateSummary} disabled={loading || !realExpenses} className="bg-primary hover:bg-primary/90">
          {loading ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Full Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          ) : summary ? (
            <>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl text-primary flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {summary.summaryTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-foreground/90">
                    {summary.overallSummary}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.topCategories.map((cat, idx) => (
                  <Card key={idx} className="hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline">{cat.category}</Badge>
                        <div className={`flex items-center text-xs font-bold ${cat.changePercentage > 0 ? 'text-destructive' : 'text-primary'}`}>
                          {cat.changePercentage > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                          {Math.abs(cat.changePercentage).toFixed(1)}%
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2">KES {cat.currentAmount.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {cat.trendDescription}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Strategic Insights</CardTitle>
                  <CardDescription>Actionable observations from the AI agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {summary.keyInsights.map((insight, idx) => (
                      <li key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Click "Generate Full Analysis" to start the AI evaluation based on real expenses.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Unusual Expense Detection
              </CardTitle>
              <CardDescription>Analyze real expenditure risks</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="px-6 pb-6 space-y-3">
                  {realExpenses && realExpenses.length > 0 ? (
                    realExpenses.map((expense, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnalyzeAnomaly(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-muted/50 ${
                          selectedAnomalyIndex === idx ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm capitalize">{expense.categoryId || 'General'}</span>
                          <span className="text-xs font-mono font-bold">KES {Number(expense.amount).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
                        <div className="flex items-center mt-2 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {expense.expenseDate}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="p-6 text-sm text-muted-foreground text-center italic">Record some expenses to use the risk analyzer.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            {selectedAnomalyIndex !== null && (
              <CardFooter className="bg-muted/30 pt-6">
                {analyzingAnomaly ? (
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : anomalyResult ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2">
                      {anomalyResult.isUnusual ? (
                        <Badge variant="destructive" className="animate-pulse">High Risk / Unusual</Badge>
                      ) : (
                        <Badge variant="default" className="bg-primary">Normal / Expected</Badge>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed italic border-l-2 border-primary/30 pl-3">
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
