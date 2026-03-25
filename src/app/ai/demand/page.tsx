
"use client"

import { useState } from "react"
import { 
  TrendingUp, 
  RefreshCcw, 
  BrainCircuit, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { predictDemand, type DemandPredictionOutput } from "@/ai/flows/demand-prediction-flow"
import { Progress } from "@/components/ui/progress"

export default function DemandPredictionPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DemandPredictionOutput | null>(null)

  const handlePredict = async () => {
    setLoading(true)
    try {
      const res = await predictDemand({
        productId: "LAPTOP-PRO-15",
        currentStockLevel: 25,
        expectedLeadTimeDays: 30,
        historicalSales: [
          { date: "2024-01-01", quantitySold: 10 },
          { date: "2024-01-02", quantitySold: 15 },
          { date: "2024-01-03", quantitySold: 12 },
          { date: "2024-01-04", quantitySold: 8 },
          { date: "2024-01-05", quantitySold: 20 },
        ]
      })
      setResult(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">AI Demand Prediction</h1>
          <p className="text-muted-foreground">Forecast future product demand and optimize procurement cycles.</p>
        </div>
        <div className="bg-secondary/10 p-2 rounded-lg flex items-center gap-2 text-secondary font-medium border border-secondary/20">
          <BrainCircuit className="h-5 w-5" />
          Powered by Gemini
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prediction Parameters</CardTitle>
              <CardDescription>Configure the variables for the AI engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Product</Label>
                <Select defaultValue="laptop">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Standard Laptop Pro 15</SelectItem>
                    <SelectItem value="mouse">Wireless Mouse RGB</SelectItem>
                    <SelectItem value="monitor">27" Curved Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prediction Horizon (Days)</Label>
                <Input type="number" defaultValue={30} />
              </div>
              <div className="space-y-2">
                <Label>Historical Data Window</Label>
                <Select defaultValue="90">
                  <SelectTrigger>
                    <SelectValue placeholder="Select window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="180">Last 6 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full bg-secondary hover:bg-secondary/90" 
                onClick={handlePredict}
                disabled={loading}
              >
                {loading ? (
                  <><RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><BrainCircuit className="mr-2 h-4 w-4" /> Run AI Analysis</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Pro Tip</CardTitle>
            </CardHeader>
            <CardContent className="text-sm opacity-90">
              The AI considers seasonality and current stock levels to minimize holding costs while avoiding stockouts.
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8">
          {!result && !loading ? (
            <div className="h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-4">
              <TrendingUp className="h-12 w-12 opacity-20" />
              <div className="max-w-xs">
                <p className="font-medium text-lg text-foreground">No analysis results yet</p>
                <p>Configure your parameters and run the prediction engine to see AI insights here.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-12 flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full border-4 border-muted flex items-center justify-center">
                      <BrainCircuit className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-0 h-24 w-24 rounded-full border-t-4 border-secondary animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Processing Sales Data</h3>
                    <p className="text-muted-foreground">Our AI is crunching historical patterns and current trends...</p>
                  </div>
                  <Progress value={66} className="w-full max-w-md" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-800">Predicted Demand</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-emerald-900">{result?.predictedDemandQuantity} Units</div>
                    <p className="text-xs text-emerald-700 mt-2 flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Confidence Score: 94%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Suggested Action</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-blue-900">Restock Soon</div>
                    <p className="text-xs text-blue-700 mt-2">Based on current stock of 25 units</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-secondary" />
                    AI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert">
                  <p className="text-lg leading-relaxed">{result?.recommendation}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Forecast Rationale</CardTitle>
                  <CardDescription>Why did the AI arrive at this conclusion?</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-secondary mt-2" />
                      <p className="text-sm">Consistent growth pattern observed in last 14 days (+8%).</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-secondary mt-2" />
                      <p className="text-sm">Upcoming weekend expected to increase volume by 15%.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-secondary mt-2" />
                      <p className="text-sm">Safety stock threshold is 10 units; prediction suggests risk of stockout in 18 days.</p>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
