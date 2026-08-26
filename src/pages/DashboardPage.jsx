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
  const [irregularFilter, setIrregularFilter] = useState('all') // 'all' | 'irregular' | 'regular'

  useEffect(() => { setSelectedParent('전체'); setSelectedSub(null); setIrregularFilter('all') }, [year, month])

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
          ? categories.filter((c) => c.parent === selectedParent).sort(sortByOrder)
          : []

        const activeFilter = (() => {
          if (selectedParent === '전체') return null
          if (selectedSub) return new Set([selectedSub])
          return getMatchSet(selectedParent, categories)
        })()

        const calendarTx = transactions
          .filter((t) => irregularFilter === 'all' ? true : irregularFilter === 'irregular' ? t.is_irregular : !t.is_irregular)
          .filter((t) => !activeFilter || activeFilter.has(t.category))

        const filterLabel = selectedSub || selectedParent

        return (
          <>
            <div className="card card-section" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 카테고리 */}
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>카테고리</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => { setSelectedParent('전체'); setSelectedSub(null) }}
                    className={`btn ${selectedParent === '전체' ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 12px', fontSize: 12 }}>전체</button>
                  {parentOptions.map((p) => (
                    <button key={p.name}
                      onClick={() => { setSelectedParent(p.name); setSelectedSub(null) }}
                      className={`btn ${selectedParent === p.name ? 'primary' : 'secondary'}`}
                      style={{ padding: '4px 12px', fontSize: 12 }}>
                      {p.name}{categories.some((c) => c.parent === p.name) ? ' ▾' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 하위 카테고리 */}
              {subOptions.length > 0 && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>└ {selectedParent} 세부</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button onClick={() => setSelectedSub(null)}
                      className={`btn ${!selectedSub ? 'primary' : 'secondary'}`}
                      style={{ padding: '4px 12px', fontSize: 12 }}>전체</button>
                    {subOptions.map((s) => (
                      <button key={s.name} onClick={() => setSelectedSub(s.name)}
                        className={`btn ${selectedSub === s.name ? 'primary' : 'secondary'}`}
                        style={{ padding: '4px 12px', fontSize: 12 }}>{s.name}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* 비정기 필터 */}
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>비정기 여부</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['all', '전체'], ['irregular', '비정기만'], ['regular', '정기만']].map(([val, label]) => (
                    <button key={val} onClick={() => setIrregularFilter(val)}
                      style={{ padding: '4px 12px', fontSize: 12, borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600,
                        background: irregularFilter === val ? '#ea580c' : '#fff7ed',
                        color: irregularFilter === val ? '#fff' : '#ea580c',
                        outline: '1.5px solid #ea580c' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <MonthCalendar year={year} month={month} transactions={calendarTx} filterCategory={filterLabel} setFilterCategory={() => {}} />
          </>
        )
      })()}


    </div>
  )
}
