
"use client"

import { useState } from "react"
import { 
  AlertTriangle, 
  Search, 
  ShieldCheck, 
  RefreshCw,
  Zap,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { detectSalesAnomalies, type AnomalyDetectionOutput } from "@/ai/flows/anomaly-detection-flow"
import { Badge } from "@/components/ui/badge"

export default function AnomalyDetectionPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<AnomalyDetectionOutput | null>(null)

  const handleScan = async () => {
    setScanning(true)
    try {
      // Simulate data processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      const res = await detectSalesAnomalies({
        salesData: [],
        context: "Escaneo inicial de sistema vacío."
      })
      setResult(res)
    } catch (error) {
      console.error(error)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Detección de Anomalías</h1>
          <p className="text-muted-foreground">Identifica patrones irregulares o posibles errores de reporte.</p>
        </div>
        <Button 
          className="bg-secondary hover:bg-secondary/90" 
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Escaneando...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" /> Iniciar Escaneo Global</>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transacciones Seguras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Verificadas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actividad Sospechosa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren revisión</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Integridad de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground mt-1">Puntaje de consistencia</p>
          </CardContent>
        </Card>
      </div>

      {!result && !scanning ? (
        <Card className="bg-muted/30 border-dashed border-2">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="h-16 w-16 text-muted-foreground mb-6 opacity-30" />
            <h3 className="text-xl font-headline font-bold mb-2">Listo para Análisis</h3>
            <p className="text-muted-foreground max-w-md">
              Inicia el escaneo para revisar los movimientos recientes con el motor de IA Aurora.
            </p>
          </CardContent>
        </Card>
      ) : scanning ? (
        <Card>
          <CardContent className="py-20 space-y-8 flex flex-col items-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Analizando Registros</h3>
              <p className="text-muted-foreground">Ejecutando modelos de aislamiento en los puntos de datos...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className={result.anomaliesDetected ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/50 bg-emerald-50/50"}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {result.anomaliesDetected ? (
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  )}
                  {result.anomaliesDetected ? "Anomalías Detectadas" : "Integridad Verificada"}
                </CardTitle>
                <Badge variant={result.anomaliesDetected ? "destructive" : "outline"}>
                  {result.anomaliesDetected ? "ACCIÓN REQUERIDA" : "NORMAL"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-foreground leading-relaxed">
                {result.description}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
