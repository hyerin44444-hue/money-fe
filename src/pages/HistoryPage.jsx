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
  const [irregularOnly, setIrregularOnly] = useState(false)
  const [fixedList, setFixedList] = useState([])
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    getFixedExpenses().then((res) => {
      setFixedNames(new Set(res.data.map((f) => f.name)))
      setFixedList(res.data)
    })
  }, [])

  const {
    transactions, categories,
    loading, error,
    addTransaction, editTransaction, removeTransaction, refresh,
  } = useTransactions(year, month)

  const categoryOptions = ['전체', ...Array.from(new Set(transactions.map((t) => t.category))).sort()]
  const filtered = transactions
    .filter((t) => selectedCategory === '전체' || t.category === selectedCategory)
    .filter((t) => !irregularOnly || t.is_irregular)

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
  const openApplyModal = () => {
    setCheckedIds(new Set(fixedList.map((f) => f.id)))
    setShowApplyModal(true)
  }

  const handleApplyFixed = async () => {
    if (checkedIds.size === 0) { alert('항목을 선택해주세요.'); return }
    setApplying(true)
    try {
      const res = await applyFixedExpenses(year, month, [...checkedIds])
      setShowApplyModal(false)
      if (res.data.length === 0) alert('반영할 항목이 없거나 이미 반영되었습니다.')
      else { alert(`${res.data.length}건 반영되었습니다.`); await refresh() }
    } finally { setApplying(false) }
  }
  const handleExportCSV = () => {
    if (filtered.length === 0) { alert('내보낼 내역이 없습니다.'); return }
    const headers = ['날짜', '구분', '카테고리', '금액', '메모', '비정기지출']
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
        t.is_irregular ? 'Y' : '',
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn secondary" onClick={handleExportCSV}>📥 CSV</button>
        <button className="btn secondary" onClick={openApplyModal}>📌 고정비 반영</button>
        <button className="btn primary" onClick={() => { setEditTarget(null); setShowForm(true) }}>+ 추가</button>
      </div>

      <div className="card card-section" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {categoryOptions.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`btn ${selectedCategory === c ? 'primary' : 'secondary'}`}
              style={{ padding: '3px 10px', fontSize: 12 }}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setIrregularOnly((v) => !v)}
            style={{
              padding: '3px 10px', fontSize: 12, borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600,
              background: irregularOnly ? '#ea580c' : '#fff7ed',
              color: irregularOnly ? '#fff' : '#ea580c',
              outline: '1.5px solid #ea580c',
            }}
          >
            비정기
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span className="count">{filtered.length}건</span>
          {totalIncome > 0 && (
            <span style={{ fontWeight: 600, color: '#1e88e5' }}>수입 +{fmt(totalIncome)}원</span>
          )}
          {totalExpense > 0 && (
            <span style={{ fontWeight: 600, color: 'var(--red)' }}>지출 -{fmt(totalExpense)}원</span>
          )}
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

      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>📌 고정비 반영</h2>
              <button onClick={() => setShowApplyModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              {year}년 {month}월에 반영할 항목을 선택하세요.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <button className="btn secondary" style={{ fontSize: 12, padding: '3px 10px' }}
                onClick={() => setCheckedIds(new Set(fixedList.map((f) => f.id)))}>전체 선택</button>
              <button className="btn secondary" style={{ fontSize: 12, padding: '3px 10px' }}
                onClick={() => setCheckedIds(new Set())}>전체 해제</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 320, overflowY: 'auto' }}>
              {fixedList.map((f) => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: checkedIds.has(f.id) ? '#f0f4ff' : '#fff' }}>
                  <input type="checkbox" checked={checkedIds.has(f.id)}
                    onChange={() => setCheckedIds((prev) => {
                      const next = new Set(prev)
                      next.has(f.id) ? next.delete(f.id) : next.add(f.id)
                      return next
                    })}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.category} · 매월 {f.day}일</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>
                    -{f.amount.toLocaleString()}원
                  </span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setShowApplyModal(false)}>취소</button>
              <button className="btn primary" onClick={handleApplyFixed} disabled={applying || checkedIds.size === 0}>
                {applying ? '반영 중...' : `${checkedIds.size}건 반영`}
              </button>
            </div>
          </div>
        </div>
      )}

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
