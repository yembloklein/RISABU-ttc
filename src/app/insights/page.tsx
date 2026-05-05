
"use client"

import { useState, useMemo } from "react"
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  BrainCircuit,
  Calendar,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  Info
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
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Pie, PieChart } from "recharts"

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AdminFinancialTrendSummaryOutput | null>(null)
  const [selectedAnomalyIndex, setSelectedAnomalyIndex] = useState<number | null>(null)
  const [anomalyResult, setAnomalyResult] = useState<AdminUnusualExpenseDetectionOutput | null>(null)
  const [analyzingAnomaly, setAnalyzingAnomaly] = useState(false)

  const firestore = useFirestore()
  const { user } = useUser()
  
  const expensesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "expenses");
  }, [firestore, user]);
  
  const { data: realExpenses, isLoading: loadingExpenses } = useCollection(expensesRef)

  // Period Analysis Logic
  const periodAnalysis = useMemo(() => {
    if (!realExpenses || realExpenses.length === 0) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentPeriod: Record<string, number> = {};
    const previousPeriod: Record<string, number> = {};

    realExpenses.forEach(exp => {
      const expDate = new Date(exp.expenseDate);
      const m = expDate.getMonth();
      const y = expDate.getFullYear();
      const cat = exp.categoryId || "General";
      const amt = Number(exp.amount) || 0;

      if (m === currentMonth && y === currentYear) {
        currentPeriod[cat] = (currentPeriod[cat] || 0) + amt;
      } else if (m === prevMonth && y === prevYear) {
        previousPeriod[cat] = (previousPeriod[cat] || 0) + amt;
      }
    });

    const formatForAI = (obj: Record<string, number>) => 
      Object.entries(obj).map(([category, amount]) => ({ category, amount }));

    const chartData = Object.entries(currentPeriod).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    return {
      current: formatForAI(currentPeriod),
      previous: formatForAI(previousPeriod),
      chartData,
      currentDesc: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      prevDesc: new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [realExpenses]);

  const handleGenerateSummary = async () => {
    if (!periodAnalysis) return;
    setLoading(true)
    
    try {
      const result = await adminFinancialTrendSummary({
        currentPeriodData: {
          periodDescription: periodAnalysis.currentDesc,
          expenses: periodAnalysis.current
        },
        previousPeriodData: {
          periodDescription: periodAnalysis.prevDesc,
          expenses: periodAnalysis.previous
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
    setAnomalyResult(null)
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

  const chartConfig = {
    value: { label: "Amount (KES)", color: "hsl(var(--primary))" }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <BrainCircuit className="h-10 w-10 text-primary" />
            Strategic Insights
          </h1>
          <p className="text-muted-foreground text-lg">AI-powered fiscal analysis and anomaly detection for Risabu College.</p>
        </div>
        <Button 
          size="lg"
          onClick={handleGenerateSummary} 
          disabled={loading || !periodAnalysis} 
          className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 h-14 px-8 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? <RefreshCcw className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
          Generate Financial Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          {/* Spending Visualization */}
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Spending Distribution
                </CardTitle>
                <CardDescription>Visual breakdown of current period expenditures</CardDescription>
              </div>
              <Badge variant="outline" className="h-6">{periodAnalysis?.currentDesc || "Loading..."}</Badge>
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <Skeleton className="h-[300px] w-full" />
              ) : periodAnalysis?.chartData.length ? (
                <div className="h-[300px] w-full mt-4">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodAnalysis.chartData}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `KES ${value.toLocaleString()}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="value" 
                          fill="var(--color-value)" 
                          radius={[6, 6, 0, 0]} 
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground italic">Insufficient data for visualization</p>
                </div>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-[120px] w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-[100px] rounded-2xl" />
                <Skeleton className="h-[100px] rounded-2xl" />
              </div>
              <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
          ) : summary ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <TrendingUp className="h-24 w-24" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary flex items-center gap-3">
                    {summary.summaryTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed text-foreground/90 font-medium">
                    {summary.overallSummary}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.topCategories.map((cat, idx) => (
                  <Card key={idx} className="hover:ring-2 hover:ring-primary/20 transition-all cursor-default group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="px-3 py-0.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {cat.category}
                        </Badge>
                        <div className={`flex items-center text-sm font-bold px-2 py-0.5 rounded-md ${cat.changePercentage > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          {cat.changePercentage > 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                          {Math.abs(cat.changePercentage).toFixed(1)}%
                        </div>
                      </div>
                      <CardTitle className="text-2xl mt-3 font-bold">KES {cat.currentAmount.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground font-medium">
                      {cat.trendDescription}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Actionable Insights
                  </CardTitle>
                  <CardDescription>Strategic recommendations for administration</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4">
                    {summary.keyInsights.map((insight, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl bg-muted/20 border-l-4 border-primary">
                        <div className="flex-shrink-0 bg-primary/10 h-8 w-8 rounded-full flex items-center justify-center text-primary font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-muted/10 rounded-3xl border-2 border-dashed border-muted text-center px-6">
              <div className="bg-primary/10 p-6 rounded-full mb-6">
                <Sparkles className="h-12 w-12 text-primary opacity-40" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Analysis Generated</h3>
              <p className="text-muted-foreground max-w-sm mb-8">
                Click the generate button to compare this month's spending against previous records and identify trends.
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card className="sticky top-24 shadow-xl border-none ring-1 ring-border overflow-hidden">
            <div className="bg-orange-500/10 p-4 border-b border-orange-500/20">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Risk & Anomaly Audit
              </CardTitle>
            </div>
            <CardContent className="p-0">
              <div className="p-4 bg-muted/30 flex items-start gap-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <p>Select a recent expenditure to analyze if it deviates from historical college spending patterns.</p>
              </div>
              <ScrollArea className="h-[450px]">
                <div className="p-4 space-y-3">
                  {realExpenses && realExpenses.length > 0 ? (
                    realExpenses.slice(0, 15).map((expense, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnalyzeAnomaly(idx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                          selectedAnomalyIndex === idx ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-inner' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{expense.categoryId || 'General'}</span>
                          <span className="text-sm font-bold text-foreground">KES {Number(expense.amount).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-2 mb-3">{expense.description}</p>
                        <div className="flex items-center text-[10px] text-muted-foreground font-mono">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          {expense.expenseDate}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-sm text-muted-foreground italic">No expense records found.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            {selectedAnomalyIndex !== null && (
              <CardFooter className="bg-muted/30 p-6 border-t animate-in slide-in-from-right-4">
                {analyzingAnomaly ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs font-bold uppercase text-primary">Auditing record...</span>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : anomalyResult ? (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">AI Assessment</span>
                      {anomalyResult.isUnusual ? (
                        <Badge variant="destructive" className="animate-pulse">Anomalous</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Expected</Badge>
                      )}
                    </div>
                    <div className="bg-background p-4 rounded-xl border-l-4 border-primary text-xs leading-relaxed font-medium italic shadow-sm">
                      "{anomalyResult.reason}"
                    </div>
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
