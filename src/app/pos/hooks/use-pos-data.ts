"use client"

import { useMemo } from 'react'
import { collection, query, where, doc } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { isSuperUser } from '@/lib/constants'

export function usePosData() {
  const db = useFirestore()
  const { user } = useUser()

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return doc(db, "users", user.email.toLowerCase())
  }, [db, user?.email])

  const { data: profile } = useDoc(userProfileRef)

  const isSuper = isSuperUser(user?.email)
  const effectiveBusinessId = profile?.businessId || (isSuper ? 'matu' : null)
  const effectiveVenueName = profile?.assignedVenue || 'Sede Central'
  const isAdmin = profile?.role === 'ADMIN' || isSuper

  // ── Queries ──────────────────────────────────────────
  const openOrdersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "orders"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const menuQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "menu"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "invoices"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "expenses"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const fiscalReportsQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "fiscal_reports"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const customersQuery = useMemoFirebase(() => {
    if (!db || !effectiveBusinessId) return null
    return query(collection(db, "customers"), where("businessId", "==", effectiveBusinessId))
  }, [db, effectiveBusinessId])

  const { data: allOrders } = useCollection(openOrdersQuery)
  const { data: dbMenu, isLoading: menuLoading } = useCollection(menuQuery)
  const { data: allInvoices } = useCollection(invoicesQuery)
  const { data: allExpenses } = useCollection(expensesQuery)
  const { data: allFiscalReports } = useCollection(fiscalReportsQuery)
  const { data: allCustomers } = useCollection(customersQuery)

  // ── Derived Data ─────────────────────────────────────
  const activeOrders = useMemo(() => {
    if (!allOrders) return []
    return allOrders.filter(o => ["Open", "Preparing", "Ready"].includes(o.status))
  }, [allOrders])

  const sessionStartIso = useMemo(() => {
    const lastZ = (allFiscalReports || []).find(r => r.type === 'Z')
    if (lastZ?.timestamp) return lastZ.timestamp
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [allFiscalReports])

  const sessionInvoices = useMemo(() => {
    if (!allInvoices || !sessionStartIso) return []
    return allInvoices.filter(inv => (inv.timestamp || "") > sessionStartIso)
  }, [allInvoices, sessionStartIso])

  const sessionExpenses = useMemo(() => {
    if (!allExpenses || !sessionStartIso) return []
    return allExpenses.filter(e => (e.createdAt || "") > sessionStartIso)
  }, [allExpenses, sessionStartIso])

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.tableNumber] = order })
    return map
  }, [activeOrders])

  return {
    db,
    user,
    profile,
    isSuper,
    isAdmin,
    effectiveBusinessId,
    effectiveVenueName,
    activeOrders,
    dbMenu: dbMenu || [],
    menuLoading,
    allInvoices: allInvoices || [],
    allCustomers: allCustomers || [],
    allFiscalReports: allFiscalReports || [],
    sessionInvoices,
    sessionExpenses,
    tableData,
  }
}
