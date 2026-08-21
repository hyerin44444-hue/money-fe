import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useTransactions } from '../hooks/useTransactions'
import SummaryCard from '../components/SummaryCard'
import MonthCalendar from '../components/MonthCalendar'
import BudgetStatus from '../components/BudgetStatus'
import MonthlyOverview from '../components/MonthlyOverview'
import MonthMemo from '../components/MonthMemo'
import { getMatchSet } from '../utils/categoryUtils'

export default function DashboardPage() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [selectedParent, setSelectedParent] = useState('전체')
  const [selectedSub, setSelectedSub] = useState(null)
  const [irregularOnly, setIrregularOnly] = useState(false)

  useEffect(() => { setSelectedParent('전체'); setSelectedSub(null); setIrregularOnly(false) }, [year, month])

  const {
    transactions, summary, categories,
    loading, error,
  } = useTransactions(year, month)

  const handlePrev = () => {
    const d = dayjs(`${year}-${month}-01`).subtract(1, 'month')
    setYear(d.year())
    setMonth(d.month() + 1)
  }

  const handleNext = () => {
    const d = dayjs(`${year}-${month}-01`).add(1, 'month')
    setYear(d.year())
    setMonth(d.month() + 1)
  }

  return (
    <div className="page">
      {/* 월별 현황 */}
      <MonthlyOverview year={year} currentMonth={month} />

      {/* 월 네비게이션 */}
      <div className="month-nav">
        <button onClick={handlePrev}>◀</button>
        <span>{year}년 {month}월</span>
        <button onClick={handleNext}>▶</button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-msg">불러오는 중...</div>}

      {/* 요약 카드 */}
      <SummaryCard summary={summary} />

      {/* 예산 현황 */}
      <BudgetStatus transactions={transactions} />

      {/* 이번달 메모 */}
      <MonthMemo year={year} month={month} />

      {/* 카테고리 필터 */}
      {(() => {
        const txCatSet = new Set(transactions.map((t) => t.category))
        const sortByOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        const parentOptions = categories.filter((c) => !c.parent).sort(sortByOrder).filter((p) => {
          const subs = categories.filter((c) => c.parent === p.name)
          return [...new Set([p.name, ...subs.map((s) => s.name)])].some((n) => txCatSet.has(n))
        })
        if (parentOptions.length === 0) return null

        const subOptions = selectedParent !== '전체'
          ? categories.filter((c) => c.parent === selectedParent && txCatSet.has(c.name)).sort(sortByOrder)
          : []

        const activeFilter = (() => {
          if (selectedParent === '전체') return null
          if (selectedSub) return new Set([selectedSub])
          return getMatchSet(selectedParent, categories)
        })()

        const calendarTx = (irregularOnly ? transactions.filter((t) => t.is_irregular) : transactions)
          .filter((t) => !activeFilter || activeFilter.has(t.category))

        const filterLabel = selectedSub || selectedParent

        return (
          <>
            <div className="card card-section" style={{ padding: '12px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>카테고리 필터</p>
              {/* 1단계: 부모 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: subOptions.length > 0 ? 8 : 0 }}>
                <button onClick={() => { setSelectedParent('전체'); setSelectedSub(null) }}
                  className={`btn ${selectedParent === '전체' ? 'primary' : 'secondary'}`}
                  style={{ padding: '3px 10px', fontSize: 12 }}>전체</button>
                {parentOptions.map((p) => (
                  <button key={p.name}
                    onClick={() => { setSelectedParent(p.name); setSelectedSub(null) }}
                    className={`btn ${selectedParent === p.name ? 'primary' : 'secondary'}`}
                    style={{ padding: '3px 10px', fontSize: 12 }}>
                    {p.name}{categories.some((c) => c.parent === p.name) ? ' ▾' : ''}
                  </button>
                ))}
                <button onClick={() => setIrregularOnly((v) => !v)}
                  style={{ padding: '3px 10px', fontSize: 12, borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600, background: irregularOnly ? '#ea580c' : '#fff7ed', color: irregularOnly ? '#fff' : '#ea580c', outline: '1.5px solid #ea580c' }}>
                  비정기</button>
              </div>
              {/* 2단계: 하위 */}
              {subOptions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                  <button onClick={() => setSelectedSub(null)}
                    className={`btn ${!selectedSub ? 'primary' : 'secondary'}`}
                    style={{ padding: '3px 10px', fontSize: 11 }}>전체</button>
                  {subOptions.map((s) => (
                    <button key={s.name} onClick={() => setSelectedSub(s.name)}
                      className={`btn ${selectedSub === s.name ? 'primary' : 'secondary'}`}
                      style={{ padding: '3px 10px', fontSize: 11 }}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>
            <MonthCalendar year={year} month={month} transactions={calendarTx} filterCategory={filterLabel} setFilterCategory={() => {}} />
          </>
        )
      })()}


    </div>
  )
}
