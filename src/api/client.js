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

// 현금 자산
export const getCash = () => api.get('/cash')
export const createCash = (data) => api.post('/cash', data)
export const updateCash = (id, data) => api.put(`/cash/${id}`, data)
export const deleteCash = (id) => api.delete(`/cash/${id}`)

// 주식
export const getStocks = () => api.get('/stocks')
export const createStock = (data) => api.post('/stocks', data)
export const updateStock = (id, data) => api.put(`/stocks/${id}`, data)
export const deleteStock = (id) => api.delete(`/stocks/${id}`)

// 메모
export const getMemos = (year, month) => api.get('/memos', { params: { year, month } })
export const createMemo = (data) => api.post('/memos', data)
export const updateMemo = (id, data) => api.patch(`/memos/${id}`, data)
export const deleteMemo = (id) => api.delete(`/memos/${id}`)


// 금
export const getGoldPrice = () => api.get('/gold/price')
export const getGold = () => api.get('/gold')
export const createGold = (data) => api.post('/gold', data)
export const updateGold = (id, data) => api.put(`/gold/${id}`, data)
export const deleteGold = (id) => api.delete(`/gold/${id}`)

// 시현 자산
export const getSihyeonSavings = () => api.get('/sihyeon/savings')
export const addSihyeonSavings = (data) => api.post('/sihyeon/savings', data)
export const deleteSihyeonSavings = (id) => api.delete(`/sihyeon/savings/${id}`)
export const getSihyeonStocks = () => api.get('/sihyeon/stocks')
export const createSihyeonStock = (data) => api.post('/sihyeon/stocks', data)
export const updateSihyeonStock = (id, data) => api.put(`/sihyeon/stocks/${id}`, data)
export const deleteSihyeonStock = (id) => api.delete(`/sihyeon/stocks/${id}`)
export const getSihyeonCash = () => api.get('/sihyeon/cash')
export const createSihyeonCash = (data) => api.post('/sihyeon/cash', data)
export const updateSihyeonCash = (id, data) => api.put(`/sihyeon/cash/${id}`, data)
export const deleteSihyeonCash = (id) => api.delete(`/sihyeon/cash/${id}`)
export const getSihyeonGold = () => api.get('/sihyeon/gold')
export const createSihyeonGold = (data) => api.post('/sihyeon/gold', data)
export const updateSihyeonGold = (id, data) => api.put(`/sihyeon/gold/${id}`, data)
export const deleteSihyeonGold = (id) => api.delete(`/sihyeon/gold/${id}`)

// 고정비
export const getFixedExpenses = () => api.get('/fixed-expenses')
export const createFixedExpense = (data) => api.post('/fixed-expenses', data)
export const updateFixedExpense = (id, data) => api.put(`/fixed-expenses/${id}`, data)
export const deleteFixedExpense = (id) => api.delete(`/fixed-expenses/${id}`)
export const applyFixedExpenses = (year, month, ids = []) => api.post('/fixed-expenses/apply', { ids }, { params: { year, month } })
