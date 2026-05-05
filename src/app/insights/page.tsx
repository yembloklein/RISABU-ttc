"use client"

import { useState } from "react"
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  BrainCircuit,
  Calendar,
  ChevronRight,
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

const MOCK_HISTORICAL_DATA = {
  currentPeriodData: {
    periodDescription: "Q1 2024",
    expenses: [
      { category: "Staff Salaries", amount: 2500000 },
      { category: "Office Supplies", amount: 150000 },
      { category: "Utilities", amount: 280000 },
      { category: "Marketing", amount: 450000 },
      { category: "Maintenance", amount: 120000 },
    ]
  },
  previousPeriodData: {
    periodDescription: "Q4 2023",
    expenses: [
      { category: "Staff Salaries", amount: 2400000 },
      { category: "Office Supplies", amount: 120000 },
      { category: "Utilities", amount: 260000 },
      { category: "Marketing", amount: 380000 },
      { category: "Maintenance", amount: 450000 },
    ]
  },
  currency: "KES"
}

const MOCK_ANOMALY_EXPENSES = [
  { category: "Utilities", amount: 85000, date: "2024-03-01", description: "Water bill for block B" },
  { category: "Office Supplies", amount: 450000, date: "2024-03-05", description: "Bulk printer ink purchase" },
  { category: "Staff Salaries", amount: 150000, date: "2024-03-07", description: "New intern stipend" },
]

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AdminFinancialTrendSummaryOutput | null>(null)
  const [selectedAnomalyIndex, setSelectedAnomalyIndex] = useState<number | null>(null)
  const [anomalyResult, setAnomalyResult] = useState<AdminUnusualExpenseDetectionOutput | null>(null)
  const [analyzingAnomaly, setAnalyzingAnomaly] = useState(false)

  const handleGenerateSummary = async () => {
    setLoading(true)
    try {
      const result = await adminFinancialTrendSummary(MOCK_HISTORICAL_DATA)
      setSummary(result)
    } catch (error) {
      console.error("Failed to generate summary", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeAnomaly = async (index: number) => {
    setSelectedAnomalyIndex(index)
    setAnalyzingAnomaly(true)
    try {
      const result = await adminUnusualExpenseDetection({
        historicalExpenses: MOCK_HISTORICAL_DATA.currentPeriodData.expenses.map(e => ({ ...e, date: "2024-01-01" })),
        newExpense: MOCK_ANOMALY_EXPENSES[index]
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
        <Button onClick={handleGenerateSummary} disabled={loading} className="bg-primary hover:bg-primary/90">
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
              <p className="text-muted-foreground">Click "Generate Full Analysis" to start the AI evaluation.</p>
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
              <CardDescription>Select an expense to evaluate risk</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="px-6 pb-6 space-y-3">
                  {MOCK_ANOMALY_EXPENSES.map((expense, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnalyzeAnomaly(idx)}
                      className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-muted/50 ${
                        selectedAnomalyIndex === idx ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{expense.category}</span>
                        <span className="text-xs font-mono">KES {expense.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
                      <div className="flex items-center mt-2 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {expense.date}
                      </div>
                    </button>
                  ))}
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

          <Card className="bg-accent text-accent-foreground">
            <CardHeader>
              <CardTitle className="text-base">Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 opacity-90">
              <p>AI Insights uses current and historical Firestore data to build comparison models.</p>
              <p>Anomalies are flagged when values deviate more than 2 standard deviations from categorical averages.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
