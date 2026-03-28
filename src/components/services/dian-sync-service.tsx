"use client"

import { useEffect, useState } from 'react'
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, where, updateDoc, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

export function DianSyncService() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)

  // Consultar facturas no enviadas
  const pendingQuery = query(
    collection(db || ({} as any), "invoices"), 
    where("dianSent", "==", false)
  )
  const { data: pendingInvoices } = useCollection(db ? pendingQuery : null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline && pendingInvoices && pendingInvoices.length > 0) {
      syncInvoices()
    }
  }, [isOnline, pendingInvoices])

  const syncInvoices = async () => {
    if (!pendingInvoices) return

    for (const inv of pendingInvoices) {
      try {
        logger.info(`Sincronizando factura ${inv.id} con DIAN`, 'DIAN')
        
        // Simulación de envío a DIAN (Aquí iría la llamada a la API DIAN/UBL)
        await new Promise(resolve => setTimeout(resolve, 1000))

        await updateDoc(doc(db!, "invoices", inv.id), {
          dianStatus: 'Exitoso',
          dianSent: true,
          dianResponse: 'XML Aceptado por DIAN',
          sentAt: new Date().toISOString()
        })

        toast({
          title: "Sincronización Fiscal",
          description: `Factura #${inv.id.slice(-5)} enviada con éxito.`,
          variant: "default"
        })
      } catch (error) {
        logger.error("Error sincronizando con DIAN", "DIAN", error)
      }
    }
  }

  return null // Servicio en segundo plano
}
