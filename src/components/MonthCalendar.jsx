import { useState } from 'react'
import dayjs from 'dayjs'

function DayModal({ date, transactions, onClose }) {
  const dateStr = dayjs(date).format('M월 D일')
  const income = transactions.filter((t) => t.type === 'income')
  const expense = transactions.filter((t) => t.type === 'expense')
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{dateStr} 내역</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>

        {transactions.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 14 }}>내역이 없습니다.</p>
        ) : (
          <>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {transactions.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.note || t.category}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.category}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 12, whiteSpace: 'nowrap', color: t.type === 'income' ? '#1d4ed8' : 'var(--red)' }}>
                    {t.type === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              {totalIncome > 0 && (
                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>수입 +{totalIncome.toLocaleString()}원</span>
              )}
              {totalExpense > 0 && (
                <span style={{ color: 'var(--red)', fontWeight: 600, marginLeft: 'auto' }}>지출 -{totalExpense.toLocaleString()}원</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MonthCalendar({ year, month, transactions }) {
  const [selectedDay, setSelectedDay] = useState(null)

  const firstDay = dayjs(`${year}-${month}-01`)
  const daysInMonth = firstDay.daysInMonth()
  const startWeekday = firstDay.day()

  const byDate = {}
  transactions.forEach((t) => {
    const d = dayjs(t.date).date()
    if (!byDate[d]) byDate[d] = { income: 0, expense: 0 }
    if (t.type === 'income') byDate[d].income += Number(t.amount)
    else if (t.type === 'expense') byDate[d].expense += Number(t.amount)
  })

  const fmt = (n) => {
    if (n >= 10000) return (n / 10000).toFixed(0) + '만'
    return n.toLocaleString('ko-KR')
  }

  const today = dayjs()
  const isCurrentMonth = today.year() === year && today.month() + 1 === month

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const selectedTxs = selectedDay
    ? transactions.filter((t) => dayjs(t.date).date() === selectedDay)
    : []

  return (
    <>
      <div className="calendar-card">
        <div className="calendar-header">
          <span className="calendar-title">{year}년 {month}월 달력</span>
        </div>

        <div className="calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={`cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{d}</div>
          ))}

          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const isToday = isCurrentMonth && day === today.date()
              const data = day ? byDate[day] : null
              const isSun = di === 0
              const isSat = di === 6
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`cal-cell ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSun ? 'sun' : ''} ${isSat ? 'sat' : ''}`}
                  style={{ cursor: day ? 'pointer' : 'default' }}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day && (
                    <>
                      <span className="cal-day">{day}</span>
                      {data?.income > 0 && (
                        <span className="cal-income">+{fmt(data.income)}</span>
                      )}
                      {data?.expense > 0 && (
                        <span className="cal-expense">-{fmt(data.expense)}</span>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {selectedDay && (
        <DayModal
          date={`${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
          transactions={selectedTxs}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
