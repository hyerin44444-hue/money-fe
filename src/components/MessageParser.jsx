import { useState } from 'react'
import { parseMessage } from '../utils/parseMessage'
import Select from './Select'

export default function MessageParser({ categories, onSubmit }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleParse = () => {
    setError(''); setDone(false)
    const result = parseMessage(text.trim())
    if (!result) { setError('파싱할 수 없는 메시지 형식입니다.'); setParsed(null); return }
    setParsed(result)
  }

  const handleSave = async () => {
    if (!parsed.category) { setError('카테고리를 선택해주세요.'); return }
    setSubmitting(true); setError('')
    try {
      await onSubmit(parsed)
      setText(''); setParsed(null); setDone(true)
    } catch { setError('저장에 실패했습니다.') }
    finally { setSubmitting(false) }
  }

  const expenseOptions = categories
    .filter((c) => c.type === 'expense' || c.type === 'both')
    .map((c) => ({ value: c.name, label: c.name }))

  return (
    <div className="parser-card">
      <div className="parser-header">
        <span className="parser-title">💬 알림 메시지로 추가</span>
        <span className="parser-desc">토스뱅크 알림을 붙여넣으면 자동으로 인식합니다.</span>
      </div>
      <div className="parser-body">
        <textarea
          className="parser-textarea"
          placeholder={`예시:\n[토스뱅크] 체크카드 국내 결제\n박*규님의 생활비 카드\n15,060원 결제 | (주)이마트 평택점\n잔액 13,974원`}
          value={text}
          onChange={(e) => { setText(e.target.value); setParsed(null); setDone(false); setError('') }}
          rows={4}
        />
        <button className="btn primary parser-btn" onClick={handleParse} disabled={!text.trim()}>
          인식하기
        </button>
      </div>
      {error && <p className="parser-error">{error}</p>}
      {done && <p className="parser-success">✓ 저장되었습니다!</p>}
      {parsed && (
        <div className="parser-result">
          <p className="parser-result-title">인식 결과</p>
          <div className="parser-fields">
            <div className="parser-field">
              <span className="pf-label">날짜</span>
              <input type="date" value={parsed.date} onChange={(e) => setParsed((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="parser-field">
              <span className="pf-label">금액</span>
              <input type="number" value={parsed.amount} onChange={(e) => setParsed((p) => ({ ...p, amount: Number(e.target.value) }))} />
            </div>
            <div className="parser-field">
              <span className="pf-label">사용처</span>
              <input type="text" value={parsed.note} onChange={(e) => setParsed((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="parser-field">
              <span className="pf-label">카테고리</span>
              <Select
                value={parsed.category}
                onChange={(v) => setParsed((p) => ({ ...p, category: v }))}
                options={expenseOptions}
                placeholder="선택"
              />
            </div>
          </div>
          <div className="parser-actions">
            <button className="btn secondary" onClick={() => { setParsed(null); setText('') }}>취소</button>
            <button className="btn primary" onClick={handleSave} disabled={submitting}>
              {submitting ? '저장 중...' : '가계부에 추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
