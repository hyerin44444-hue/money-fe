import { useState, useEffect, useCallback } from 'react'
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getCategories,
} from '../api/client'

export function useTransactions(year, month) {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txRes, sumRes, catRes] = await Promise.all([
        getTransactions({ year, month }),
        getSummary({ year, month }),
        getCategories(),
      ])
      setTransactions(txRes.data)
      setSummary(sumRes.data)
      setCategories(catRes.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addTransaction = async (data) => {
    await createTransaction(data)
    await fetchAll()
  }

  const editTransaction = async (id, data) => {
    await updateTransaction(id, data)
    await fetchAll()
  }

  const removeTransaction = async (id) => {
    await deleteTransaction(id)
    await fetchAll()
  }

  return {
    transactions,
    summary,
    categories,
    loading,
    error,
    addTransaction,
    editTransaction,
    removeTransaction,
    refresh: fetchAll,
  }
}
