import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useTransactions } from '../hooks/useTransactions'
import { applyFixedExpenses, getFixedExpenses } from '../api/client'
import TransactionList from '../components/TransactionList'
import TransactionForm from '../components/TransactionForm'
import MessageParser from '../components/MessageParser'
export default function HistoryPage() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [fixedNames, setFixedNames] = useState(new Set())

  useEffect(() => {
    getFixedExpenses().then((res) => setFixedNames(new Set(res.data.map((f) => f.name))))
  }, [])

  const {
    transactions, categories,
    loading, error,
    addTransaction, editTransaction, removeTransaction, refresh,
  } = useTransactions(year, month)

  const filtered = transactions

  const handleEdit = (tx) => { setEditTarget(tx); setShowForm(true) }
  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await removeTransaction(id)
  }
  const handleSubmit = async (data) => {
    if (editTarget) await editTransaction(editTarget.id, data)
    else await addTransaction(data)
  }
  const handleApplyFixed = async () => {
    if (!confirm(`${year}년 ${month}월 고정비를 반영하시겠습니까?`)) return
    const res = await applyFixedExpenses(year, month)
    if (res.data.length === 0) alert('반영할 항목이 없거나 이미 반영되었습니다.')
    else { alert(`${res.data.length}건 반영되었습니다.`); await refresh() }
  }

  return (
    <div className="page">
      <div className="month-nav">
        <button onClick={() => {
          const d = dayjs(`${year}-${month}-01`).subtract(1, 'month')
          setYear(d.year()); setMonth(d.month() + 1)
        }}>◀</button>
        <span>{year}년 {month}월</span>
        <button onClick={() => {
          const d = dayjs(`${year}-${month}-01`).add(1, 'month')
          setYear(d.year()); setMonth(d.month() + 1)
        }}>▶</button>
      </div>

      {/* 메시지 파서 */}
      <MessageParser categories={categories} onSubmit={addTransaction} />

      {/* 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="count">{filtered.length}건</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleApplyFixed}>📌 고정비 반영</button>
          <button className="btn primary" onClick={() => { setEditTarget(null); setShowForm(true) }}>+ 추가</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-msg">불러오는 중...</div>}

      <TransactionList
        transactions={filtered}
        onEdit={handleEdit}
        onDelete={handleDelete}
        fixedNames={fixedNames}
      />

      {showForm && (
        <TransactionForm
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          initial={editTarget}
        />
      )}
    </div>
  )
}
