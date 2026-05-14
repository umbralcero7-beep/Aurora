"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSuperUser } from '@/lib/constants'

export function usePosData() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [dbMenu, setDbMenu] = useState<any[]>([])
  const [allInvoices, setAllInvoices] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [allFiscalReports, setAllFiscalReports] = useState<any[]>([])
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [menuLoading, setMenuLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        setProfile(userProfile)

        const businessId = userProfile?.business_id || (isSuperUser(authUser.email) ? 'matu' : null)

        if (businessId) {
          const [orders, menu, invoices, expenses, fiscal, customers] = await Promise.all([
            supabase.from('orders').select('*').eq('business_id', businessId),
            supabase.from('menu_items').select('*').eq('business_id', businessId),
            supabase.from('invoices').select('*').eq('business_id', businessId),
            supabase.from('expenses').select('*').eq('business_id', businessId),
            supabase.from('fiscal_reports').select('*').eq('business_id', businessId),
            supabase.from('customers').select('*').eq('business_id', businessId)
          ])

          setAllOrders(orders.data || [])
          setDbMenu(menu.data || [])
          setAllInvoices(invoices.data || [])
          setAllExpenses(expenses.data || [])
          setAllFiscalReports(fiscal.data || [])
          setAllCustomers(customers.data || [])
          setMenuLoading(false)

          const ordersSubscription = supabase
            .channel('pos-orders')
            .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'orders',
              filter: `business_id=eq.${businessId}`
            }, (payload) => {
              if (payload.eventType === 'INSERT') {
                setAllOrders(prev => [...prev, payload.new])
              } else if (payload.eventType === 'UPDATE') {
                setAllOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
              } else if (payload.eventType === 'DELETE') {
                setAllOrders(prev => prev.filter(o => o.id === payload.old.id))
              }
            })
            .subscribe()

          return () => {
            supabase.removeChannel(ordersSubscription)
          }
        }
      }
    }

    init()
  }, [])

  const isSuper = isSuperUser(user?.email)
  const effectiveBusinessId = profile?.business_id || (isSuper ? 'matu' : null)
  const effectiveVenueName = profile?.assigned_venue || 'Sede Central'
  const isAdmin = profile?.role === 'ADMIN' || isSuper

  // ── Derived Data ─────────────────────────────────────
  const activeOrders = useMemo(() => {
    return allOrders.filter(o => ["Open", "Preparing", "Ready"].includes(o.status))
  }, [allOrders])

  const sessionStartIso = useMemo(() => {
    const lastZ = [...allFiscalReports].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")).find(r => r.type === 'Z')
    if (lastZ?.timestamp) return lastZ.timestamp
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [allFiscalReports])

  const sessionInvoices = useMemo(() => {
    return allInvoices.filter(inv => (inv.timestamp || "") > sessionStartIso)
  }, [allInvoices, sessionStartIso])

  const sessionExpenses = useMemo(() => {
    return allExpenses.filter(e => (e.created_at || "") > sessionStartIso)
  }, [allExpenses, sessionStartIso])

  const tableData = useMemo(() => {
    const map: Record<string, any> = {}
    activeOrders.forEach(order => { map[order.table_number] = order })
    return map
  }, [activeOrders])

  return {
    supabase,
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
