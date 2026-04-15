"use client"

import { useEffect, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/use-toast'
import { ShieldAlert, Download, UploadCloud, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Aurora Bunker Service (Offline Resilience Layer)
 * Handles local redundancy for mission-critical documents when network is down.
 */
export function OfflineBunkerService() {
  const { toast } = useToast()
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])
  
  // Escuchar eventos de transaccin para guardar respaldo local
  useEffect(() => {
    const handleCaptureTransaction = (e: any) => {
      const { type, data } = e.detail
      const entry = {
        id: `local_${Date.now()}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        synced: false
      }
      
      // Guardar en la cola local (Bunker) para redundancia
      const existing = JSON.parse(localStorage.getItem('aurora_bunker_queue') || '[]')
      const newQueue = [...existing, entry]
      localStorage.setItem('aurora_bunker_queue', JSON.stringify(newQueue))
      setOfflineQueue(newQueue)
      
      logger.info(`Transaccin respaldada en Bnker: ${type}`, 'Bunker')
    }

    window.addEventListener('aurora:bunker-capture' as any, handleCaptureTransaction)
    return () => window.removeEventListener('aurora:bunker-capture' as any, handleCaptureTransaction)
  }, [])

  // Carga inicial de la cola
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('aurora_bunker_queue') || '[]')
    setOfflineQueue(existing)
  }, [])

  const downloadFullBackup = useCallback(() => {
    const data = JSON.parse(localStorage.getItem('aurora_bunker_queue') || '[]')
    if (data.length === 0) {
      toast({ title: "Bnker Vaco", description: "No hay transacciones locales para respaldar." })
      return
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aurora-os-full-bunker-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    toast({ 
      title: "Respaldo Generado", 
      description: "Guarda este archivo en una carpeta segura. La IA podrá procesarlo luego.",
      variant: "default" 
    })
  }, [toast])

  return null // Servicio invisible
}

/**
 * Hook para capturar transacciones en el Bnker
 */
export function useBunker() {
  const captureInBunker = (type: 'invoice' | 'order' | 'delivery' | 'expense', data: any) => {
    window.dispatchEvent(new CustomEvent('aurora:bunker-capture', {
      detail: { type, data }
    }))
  }

  return { captureInBunker }
}
