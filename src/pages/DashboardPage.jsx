import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useTransactions } from '../hooks/useTransactions'
import SummaryCard from '../components/SummaryCard'
import MonthCalendar from '../components/MonthCalendar'
import BudgetStatus from '../components/BudgetStatus'
import MonthlyOverview from '../components/MonthlyOverview'
import MonthMemo from '../components/MonthMemo'
import { buildCatOptions, getMatchSet } from '../utils/categoryUtils'

export default function DashboardPage() {
  const today = dayjs()
  const [year, setYear] = useState(today.year())
  const [month, setMonth] = useState(today.month() + 1)
  const [filterCategory, setFilterCategory] = useState('전체')
  const [irregularOnly, setIrregularOnly] = useState(false)

  useEffect(() => { setFilterCategory('전체'); setIrregularOnly(false) }, [year, month])

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
        const catOptions = buildCatOptions(categories, txCatSet)
        if (catOptions.length === 0) return null
        const matchSet = getMatchSet(filterCategory, categories)
        const calendarTx = (irregularOnly ? transactions.filter((t) => t.is_irregular) : transactions)
          .filter((t) => !matchSet || matchSet.has(t.category))
        return (
          <>
            <div className="card card-section" style={{ padding: '12px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>카테고리 필터</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  onClick={() => setFilterCategory('전체')}
                  className={`btn ${filterCategory === '전체' ? 'primary' : 'secondary'}`}
                  style={{ padding: '3px 10px', fontSize: 12 }}
                >전체</button>
                {catOptions.map(({ value, label, isChild }) => (
                  <button
                    key={value}
                    onClick={() => setFilterCategory(value)}
                    className={`btn ${filterCategory === value ? 'primary' : 'secondary'}`}
                    style={{ padding: '3px 10px', fontSize: 12, marginLeft: isChild ? 4 : 0 }}
                  >
                    {label}
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
                >비정기</button>
              </div>
            </div>
            {/* 월별 달력 */}
            <MonthCalendar year={year} month={month} transactions={calendarTx} filterCategory={filterCategory} setFilterCategory={setFilterCategory} />
          </>
        )
      })()}


    </div>
  )
}
