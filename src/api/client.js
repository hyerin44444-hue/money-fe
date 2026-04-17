import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api' })

// 거래 내역
export const getTransactions = (params) => api.get('/transactions', { params })
export const createTransaction = (data) => api.post('/transactions', data)
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data)
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)

// 요약
export const getSummary = (params) => api.get('/summary', { params })
export const getMonthlySummary = (year) => api.get('/summary/monthly', { params: { year } })
export const getYearlySummary = () => api.get('/summary/yearly')

// 카테고리
export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const deleteCategory = (name) => api.delete(`/categories/${encodeURIComponent(name)}`)
export const reorderCategories = (categories) => api.put('/categories/reorder', { categories })

// 적금
export const getSavings = () => api.get('/savings')
export const addSavings = (data) => api.post('/savings', data)
export const deleteSavings = (id) => api.delete(`/savings/${id}`)

// 예산
export const getBudgets = () => api.get('/budgets')
export const upsertBudget = (data) => api.post('/budgets', data)
export const deleteBudget = (id) => api.delete(`/budgets/${id}`)

// 경조사
export const getEvents = () => api.get('/events')
export const createEvent = (data) => api.post('/events', data)
export const updateEvent = (id, data) => api.put(`/events/${id}`, data)
export const deleteEvent = (id) => api.delete(`/events/${id}`)

// 고정비
export const getFixedExpenses = () => api.get('/fixed-expenses')
export const createFixedExpense = (data) => api.post('/fixed-expenses', data)
export const updateFixedExpense = (id, data) => api.put(`/fixed-expenses/${id}`, data)
export const deleteFixedExpense = (id) => api.delete(`/fixed-expenses/${id}`)
export const applyFixedExpenses = (year, month) => api.post('/fixed-expenses/apply', null, { params: { year, month } })
