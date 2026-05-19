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
  const [selectedCategory, setSelectedCategory] = useState('전체')

  useEffect(() => {
    getFixedExpenses().then((res) => setFixedNames(new Set(res.data.map((f) => f.name))))
  }, [])

  const {
    transactions, categories,
    loading, error,
    addTransaction, editTransaction, removeTransaction, refresh,
  } = useTransactions(year, month)

  const categoryOptions = ['전체', ...Array.from(new Set(transactions.map((t) => t.category))).sort()]
  const filtered = selectedCategory === '전체'
    ? transactions
    : transactions.filter((t) => t.category === selectedCategory)

  const totalIncome  = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const fmt = (n) => Number(n).toLocaleString('ko-KR')

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
  const handleExportCSV = () => {
    if (filtered.length === 0) { alert('내보낼 내역이 없습니다.'); return }
    const headers = ['날짜', '구분', '카테고리', '금액', '메모']
    const escape = (v) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = [...filtered]
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((t) => [
        t.date,
        t.type === 'income' ? '수입' : '지출',
        t.category,
        t.amount,
        t.note || '',
      ].map(escape).join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `가계부_${year}-${String(month).padStart(2, '0')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

      {/* 카테고리 필터 + 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
              fontSize: 13, color: 'var(--text-primary)', background: 'var(--white)', cursor: 'pointer',
            }}
          >
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="count">{filtered.length}건</span>
          {totalIncome > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e88e5' }}>
              수입 +{fmt(totalIncome)}원
            </span>
          )}
          {totalExpense > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
              지출 -{fmt(totalExpense)}원
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleExportCSV}>📥 CSV</button>
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
