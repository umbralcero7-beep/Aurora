"use client"

import { useState, useCallback } from 'react'
import { CartItem, PendingAccount, PaymentMethod, CustomerData } from '../lib/pos-utils'

export function useCart() {
  const [directCart, setDirectCart] = useState<CartItem[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const addItem = useCallback((item: any) => {
    setSelectedOrder(null)
    setDirectCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: 1,
        modifiers: item.modifiers || []
      }]
    })
  }, [])

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setDirectCart(prev => prev.map(i =>
      i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ))
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setDirectCart(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const clearCart = useCallback(() => {
    setDirectCart([])
    setSelectedOrder(null)
  }, [])

  const selectOrder = useCallback((order: any) => {
    setSelectedOrder(order)
    setDirectCart([])
  }, [])

  const currentItems = directCart.length > 0 ? directCart : (selectedOrder?.items || [])
  const isDirect = directCart.length > 0

  return {
    directCart,
    setDirectCart,
    selectedOrder,
    setSelectedOrder,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    selectOrder,
    currentItems,
    isDirect,
  }
}

export function usePayment() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitAmount1, setSplitAmount1] = useState("")
  const [splitMethod1, setSplitMethod1] = useState<PaymentMethod>('Efectivo')
  const [splitMethod2, setSplitMethod2] = useState<PaymentMethod>('Datafono')
  const [tipAmount, setTipAmount] = useState(0)
  const [customTip, setCustomTip] = useState("")

  const resetPayment = useCallback(() => {
    setPaymentMethod('Efectivo')
    setCashReceived(0)
    setIsSplitPayment(false)
    setSplitAmount1("")
    setTipAmount(0)
    setCustomTip("")
  }, [])

  return {
    paymentMethod, setPaymentMethod,
    cashReceived, setCashReceived,
    isSplitPayment, setIsSplitPayment,
    splitAmount1, setSplitAmount1,
    splitMethod1, setSplitMethod1,
    splitMethod2, setSplitMethod2,
    tipAmount, setTipAmount,
    customTip, setCustomTip,
    resetPayment,
  }
}

export function useElectronicInvoice() {
  const [isElectronic, setIsElectronic] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "", taxId: "", email: "", address: ""
  })
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")

  const resetInvoice = useCallback(() => {
    setIsElectronic(false)
    setCustomerData({ name: "", taxId: "", email: "", address: "" })
    setShowCustomerSearch(false)
    setCustomerSearchTerm("")
  }, [])

  return {
    isElectronic, setIsElectronic,
    customerData, setCustomerData,
    showCustomerSearch, setShowCustomerSearch,
    customerSearchTerm, setCustomerSearchTerm,
    resetInvoice,
  }
}

export function usePendingAccounts() {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([])
  const [showPendingDrawer, setShowPendingDrawer] = useState(false)
  const [pendingNote, setPendingNote] = useState("")
  const [showPendingNoteModal, setShowPendingNoteModal] = useState(false)
  const [selectedPendingAccount, setSelectedPendingAccount] = useState<PendingAccount | null>(null)

  const addPendingAccount = useCallback((items: CartItem[], total: number, note: string, userEmail?: string) => {
    const newAccount: PendingAccount = {
      id: `pending_${Date.now()}`,
      clientNumber: pendingAccounts.length + 1,
      clientName: null,
      items,
      total,
      note,
      createdAt: new Date().toISOString(),
      createdBy: userEmail
    }
    setPendingAccounts(prev => [...prev, newAccount])
  }, [pendingAccounts.length])

  const removePendingAccount = useCallback((id: string) => {
    setPendingAccounts(prev => prev.filter(p => p.id !== id))
  }, [])

  const updatePendingNote = useCallback((id: string, note: string) => {
    setPendingAccounts(prev => prev.map(p =>
      p.id === id ? { ...p, note, updatedAt: Date.now() } : p
    ))
  }, [])

  return {
    pendingAccounts, setPendingAccounts,
    showPendingDrawer, setShowPendingDrawer,
    pendingNote, setPendingNote,
    showPendingNoteModal, setShowPendingNoteModal,
    selectedPendingAccount, setSelectedPendingAccount,
    addPendingAccount,
    removePendingAccount,
    updatePendingNote,
  }
}
