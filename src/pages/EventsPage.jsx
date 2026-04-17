import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/client'
import Select from '../components/Select'

const EVENT_CATEGORIES = ['결혼식', '돌잔치', '장례식', '생일', '출산', '기타']

const makeEmptyForm = () => ({
  person_name: '',
  category: '결혼식',
  received_amount: '',
  given_amount: '',
  received_date: '',
  given_date: '',
  note: '',
})

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(makeEmptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAll = async () => {
    const res = await getEvents()
    setEvents(res.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.person_name.trim() || !form.category) {
      setError('이름과 카테고리를 입력해주세요.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await createEvent({
        person_name: form.person_name.trim(),
        category: form.category,
        received_amount: parseFloat(form.received_amount) || 0,
        given_amount: parseFloat(form.given_amount) || 0,
        received_date: form.received_date || '',
        given_date: form.given_date || '',
        note: form.note.trim(),
      })
      setForm(makeEmptyForm())
      await fetchAll()
    } catch (e) {
      setError(e.response?.data?.detail || '추가 실패')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 항목을 삭제하시겠습니까?`)) return
    await deleteEvent(id)
    await fetchAll()
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editing.person_name.trim() || !editing.category) return
    setSubmittingEdit(true)
    try {
      await updateEvent(editing.id, {
        person_name: editing.person_name.trim(),
        category: editing.category,
        received_amount: parseFloat(editing.received_amount) || 0,
        given_amount: parseFloat(editing.given_amount) || 0,
        received_date: editing.received_date || '',
        given_date: editing.given_date || '',
        note: (editing.note || '').trim(),
      })
      setEditing(null)
      await fetchAll()
    } finally { setSubmittingEdit(false) }
  }

  const filtered = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const n = (a.person_name || '').localeCompare(b.person_name || '', 'ko')
      if (n !== 0) return n
      return (a.category || '').localeCompare(b.category || '', 'ko')
    })
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (ev) =>
        ev.person_name.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q)
    )
  }, [events, search])

  const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')
  const fmtDate = (d) => (d ? dayjs(d).format('YYYY.MM.DD') : '-')

  return (
    <div className="page">
      <div className="settings-card">
        <h2 className="settings-section-title">
          경조사 관리
          <span className="category-count">총 {events.length}건</span>
        </h2>
        <p className="settings-desc">결혼식·돌잔치·장례식 등 경조사에서 주고 받은 금액을 기록합니다. 받은 금액이 없는 사람도 추가할 수 있습니다.</p>

        <form className="events-form" onSubmit={handleAdd}>
          <div className="events-field">
            <label>사람 이름</label>
            <input
              type="text"
              value={form.person_name}
              onChange={(e) => setForm((p) => ({ ...p, person_name: e.target.value }))}
            />
          </div>
          <div className="events-field" style={{ width: 130 }}>
            <label>카테고리</label>
            <Select
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              placeholder="카테고리"
            />
          </div>
          <div className="events-field">
            <label>받은 날짜</label>
            <input
              type="date"
              value={form.received_date}
              onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))}
            />
          </div>
          <div className="events-field">
            <label>받은 금액</label>
            <input
              type="number"
              value={form.received_amount}
              onChange={(e) => setForm((p) => ({ ...p, received_amount: e.target.value }))}
              min="0"
            />
          </div>
          <div className="events-field">
            <label>준 날짜</label>
            <input
              type="date"
              value={form.given_date}
              onChange={(e) => setForm((p) => ({ ...p, given_date: e.target.value }))}
            />
          </div>
          <div className="events-field">
            <label>준 금액</label>
            <input
              type="number"
              value={form.given_amount}
              onChange={(e) => setForm((p) => ({ ...p, given_amount: e.target.value }))}
              min="0"
            />
          </div>
          <div className="events-field events-field-note">
            <label>메모 (선택)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn primary events-submit" disabled={submitting}>
            {submitting ? '추가 중...' : '+ 추가'}
          </button>
        </form>
        {error && <p className="settings-error">{error}</p>}

        <div className="events-toolbar">
          <input
            type="text"
            className="events-search"
            placeholder="이름/카테고리 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                <th>사람이름</th>
                <th>카테고리</th>
                <th>받은 날짜</th>
                <th className="num">내가 받은 금액</th>
                <th>준 날짜</th>
                <th className="num">내가 준 금액</th>
                <th>메모</th>
                <th className="actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-small" style={{ textAlign: 'center', padding: 20 }}>
                    {events.length === 0 ? '등록된 경조사 기록이 없습니다.' : '조건에 맞는 항목이 없습니다.'}
                  </td>
                </tr>
              )}
              {filtered.map((ev) => {
                const isEditing = editing?.id === ev.id
                if (isEditing) {
                  return (
                    <tr key={ev.id} className="events-row editing">
                      <td>
                        <input
                          type="text"
                          value={editing.person_name}
                          onChange={(e) => setEditing((p) => ({ ...p, person_name: e.target.value }))}
                        />
                      </td>
                      <td>
                        <Select
                          value={editing.category}
                          onChange={(v) => setEditing((p) => ({ ...p, category: v }))}
                          options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={editing.received_date || ''}
                          onChange={(e) => setEditing((p) => ({ ...p, received_date: e.target.value }))}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          value={editing.received_amount}
                          onChange={(e) => setEditing((p) => ({ ...p, received_amount: e.target.value }))}
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={editing.given_date || ''}
                          onChange={(e) => setEditing((p) => ({ ...p, given_date: e.target.value }))}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          value={editing.given_amount}
                          onChange={(e) => setEditing((p) => ({ ...p, given_amount: e.target.value }))}
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editing.note || ''}
                          onChange={(e) => setEditing((p) => ({ ...p, note: e.target.value }))}
                        />
                      </td>
                      <td className="actions">
                        <button className="btn primary sm" onClick={handleUpdate} disabled={submittingEdit}>
                          {submittingEdit ? '저장 중' : '저장'}
                        </button>
                        <button className="btn secondary sm" onClick={() => setEditing(null)}>취소</button>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={ev.id} className="events-row">
                    <td className="events-name">{ev.person_name}</td>
                    <td><span className="events-category-chip">{ev.category}</span></td>
                    <td className="events-date">{fmtDate(ev.received_date)}</td>
                    <td className="num income">{ev.received_amount ? `+${fmt(ev.received_amount)}` : '-'}</td>
                    <td className="events-date">{fmtDate(ev.given_date)}</td>
                    <td className="num expense">{ev.given_amount ? `-${fmt(ev.given_amount)}` : '-'}</td>
                    <td className="events-note">{ev.note || ''}</td>
                    <td className="actions">
                      <button className="btn-icon" onClick={() => setEditing({
                        ...ev,
                        received_amount: ev.received_amount ? String(ev.received_amount) : '',
                        given_amount: ev.given_amount ? String(ev.given_amount) : '',
                      })}>✏️</button>
                      <button className="btn-icon danger" onClick={() => handleDelete(ev.id, ev.person_name)}>🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
