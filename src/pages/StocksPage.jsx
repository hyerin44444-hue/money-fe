import { useState, useEffect } from 'react'
import { getStocks, createStock, updateStock, deleteStock } from '../api/client'

const EMPTY_FORM = { name: '', ticker: '', quantity: '', avg_price: '', owner: '', account_type: '' }

const fmt = (n) => n == null ? '-' : Number(n).toLocaleString('ko-KR')
const fmtRate = (r) => r == null ? '-' : `${r > 0 ? '+' : ''}${r.toFixed(2)}%`
const profitColor = (p) => p == null ? 'var(--text-muted)' : p >= 0 ? 'var(--stock-up)' : 'var(--stock-down)'

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [calcOpenId, setCalcOpenId] = useState(null)
  const [addQty, setAddQty] = useState('')
  const [addPrice, setAddPrice] = useState('')

  const fetchStocks = async () => {
    setLoading(true)
    try {
      const res = await getStocks()
      setStocks(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStocks() }, [])

  const totalPurchase = stocks.reduce((s, st) => s + (st.purchase_value || 0), 0)
  const totalCurrent  = stocks.reduce((s, st) => s + (st.current_value || 0), 0)
  const totalProfit   = totalCurrent - totalPurchase
  const totalRate     = totalPurchase > 0 ? (totalProfit / totalPurchase * 100) : 0

  // 소유자 → 계좌종류 → 종목 그룹핑
  const grouped = stocks.reduce((acc, st) => {
    const owner   = st.owner || '미분류'
    const account = st.account_type || '일반'
    if (!acc[owner]) acc[owner] = {}
    if (!acc[owner][account]) acc[owner][account] = []
    acc[owner][account].push(st)
    return acc
  }, {})

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.ticker || !form.quantity || !form.avg_price) return
    setSubmitting(true); setError('')
    try {
      const data = {
        name: form.name.trim(),
        ticker: form.ticker.trim().toUpperCase(),
        quantity: parseFloat(form.quantity),
        avg_price: parseFloat(form.avg_price),
        owner: form.owner.trim(),
        account_type: form.account_type.trim(),
      }
      if (editId) await updateStock(editId, data)
      else await createStock(data)
      setForm(EMPTY_FORM); setEditId(null); setShowForm(false)
      await fetchStocks()
    } catch (e) {
      setError(e.response?.data?.detail || '저장 실패')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (st) => {
    setForm({
      name: st.name, ticker: st.ticker,
      quantity: String(st.quantity), avg_price: String(st.avg_price),
      owner: st.owner || '', account_type: st.account_type || '',
    })
    setEditId(st.id); setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 종목을 삭제하시겠습니까?`)) return
    await deleteStock(id); await fetchStocks()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setError('')
  }

  const openCalc = (st) => {
    if (calcOpenId === st.id) { setCalcOpenId(null); setAddQty(''); setAddPrice('') }
    else { setCalcOpenId(st.id); setAddQty(''); setAddPrice('') }
  }

  const getCalcResult = (st) => {
    const cq = st.quantity
    const ca = st.avg_price
    const aq = parseFloat(addQty)
    const ap = parseFloat(addPrice)
    if (!aq || !ap || aq <= 0 || ap <= 0) return null
    const totalQty = cq + aq
    const totalCost = cq * ca + aq * ap
    const newAvg = totalCost / totalQty
    return { totalQty, totalCost, newAvg }
  }

  return (
    <div className="page">

      {/* 전체 요약 */}
      <div className="card card-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>주식 포트폴리오</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary" onClick={fetchStocks} disabled={loading} style={{ fontSize: 13 }}>
              {loading ? '조회 중...' : '🔄 새로고침'}
            </button>
            <button className="btn primary" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>+ 종목 추가</button>
          </div>
        </div>

        <div className="stock-summary-grid">
          {[
            { label: '매입금액',  value: `${fmt(Math.round(totalPurchase))}원`, color: 'var(--text-primary)' },
            { label: '평가금액',  value: `${fmt(Math.round(totalCurrent))}원`,  color: 'var(--text-primary)' },
            { label: '평가손익',  value: `${totalProfit >= 0 ? '+' : ''}${fmt(Math.round(totalProfit))}원 (${fmtRate(totalRate)})`, color: profitColor(totalProfit) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 종목 추가/수정 팝업 */}
        {showForm && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>{editId ? '종목 수정' : '종목 추가'}</h2>
                <button onClick={handleCancel} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stock-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-row">
                <label>소유자</label>
                <input placeholder="예) 박혜린" value={form.owner} onChange={(e) => setForm(p => ({ ...p, owner: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>계좌종류</label>
                <input placeholder="예) 개인연금, ISA, 일반" value={form.account_type} onChange={(e) => setForm(p => ({ ...p, account_type: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>종목명</label>
                <input placeholder="예) 삼성전자" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>티커</label>
                <input placeholder="005930.KS / AAPL" value={form.ticker} onChange={(e) => setForm(p => ({ ...p, ticker: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>보유수량</label>
                <input type="number" placeholder="0" min="0" step="any" value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>평균매입가 (원)</label>
                <input type="number" placeholder="0" min="0" step="any" value={form.avg_price} onChange={(e) => setForm(p => ({ ...p, avg_price: e.target.value }))} required />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={handleCancel}>취소</button>
              <button type="submit" className="btn primary" disabled={submitting}>{submitting ? '저장 중...' : editId ? '수정' : '추가'}</button>
            </div>
          </form>
            </div>
          </div>
        )}
      </div>

      {/* 소유자별 그룹 */}
      {loading ? (
        <div className="loading-msg">시세 조회 중...</div>
      ) : stocks.length === 0 ? (
        <div className="card card-section" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: 13 }}>
          등록된 종목이 없습니다.
        </div>
      ) : (
        Object.entries(grouped).map(([owner, accounts]) => {
          const ownerStocks = Object.values(accounts).flat()
          const ownerPurchase = ownerStocks.reduce((s, st) => s + (st.purchase_value || 0), 0)
          const ownerCurrent  = ownerStocks.reduce((s, st) => s + (st.current_value  || 0), 0)
          const ownerProfit   = ownerCurrent - ownerPurchase

          return (
            <div key={owner} className="card card-section">
              {/* 소유자 헤더 */}
              {(() => {
                const ownerRate = ownerPurchase > 0 ? (ownerProfit / ownerPurchase * 100) : 0
                return (
                  <div className="stock-owner-header">
                    <h2 style={{ margin: 0, fontSize: 15 }}>👤 {owner}</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span>매입 <strong style={{ color: 'var(--text-primary)' }}>{fmt(Math.round(ownerPurchase))}원</strong></span>
                      <span>평가 <strong style={{ color: 'var(--text-primary)' }}>{fmt(Math.round(ownerCurrent))}원</strong></span>
                      <span style={{ color: profitColor(ownerProfit), fontWeight: 700 }}>
                        {ownerProfit >= 0 ? '+' : ''}{fmt(Math.round(ownerProfit))}원
                        <span style={{ fontSize: 12, marginLeft: 4 }}>({ownerRate >= 0 ? '+' : ''}{ownerRate.toFixed(2)}%)</span>
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* 계좌별 그룹 */}
              {Object.entries(accounts).map(([account, acStocks]) => {
                const acPurchase = acStocks.reduce((s, st) => s + (st.purchase_value || 0), 0)
                const acCurrent  = acStocks.reduce((s, st) => s + (st.current_value  || 0), 0)
                const acProfit   = acCurrent - acPurchase

                return (
                  <div key={account} style={{ marginBottom: 16 }}>
                    {/* 계좌 헤더 */}
                    {(() => {
                      const acRate = acPurchase > 0 ? (acProfit / acPurchase * 100) : 0
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
                            🏦 {account}
                          </span>
                          <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>평가 <strong style={{ color: 'var(--text-primary)' }}>{fmt(Math.round(acCurrent))}원</strong></span>
                            <span style={{ color: profitColor(acProfit), fontWeight: 600 }}>
                              {acProfit >= 0 ? '+' : ''}{fmt(Math.round(acProfit))}원
                              <span style={{ marginLeft: 3 }}>({acRate >= 0 ? '+' : ''}{acRate.toFixed(2)}%)</span>
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 종목 목록 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {acStocks.map((st) => (
                        <div key={st.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
                          <div className="stock-item-header">
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{st.ticker}</span>
                              {st.currency === 'USD' && (
                                <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 5px', marginLeft: 5 }}>
                                  USD
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button className="btn secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => openCalc(st)}>📉 물타기</button>
                              <button className="btn secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleEdit(st)}>수정</button>
                              <button className="btn-icon danger" onClick={() => handleDelete(st.id, st.name)}>🗑️</button>
                            </div>
                          </div>
                          <div className="stock-detail-grid">
                            {[
                              { label: '보유수량',   value: `${st.quantity}주` },
                              { label: '평균매입가', value: st.currency === 'USD' ? `$${st.avg_price.toLocaleString()}` : `${fmt(Math.round(st.avg_price))}원` },
                              { label: '투자금액(총)',value: `${fmt(Math.round(st.purchase_value || st.quantity * st.avg_price))}원` },
                              { label: '현재가',     value: st.current_price ? (st.currency === 'USD' ? `$${st.current_price.toFixed(2)}` : `${fmt(Math.round(st.current_price))}원`) : '조회 실패' },
                              { label: '평가금액',   value: st.current_value ? `${fmt(Math.round(st.current_value))}원` : '-' },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '5px 6px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                                <div className="stock-price-text" style={{ fontSize: 12 }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* 수익 요약 바 */}
                          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                              background: st.profit == null ? 'var(--bg)' : st.profit >= 0 ? '#eff6ff' : '#fff1f2',
                              borderRadius: 8, padding: '6px 10px',
                              border: `1px solid ${st.profit == null ? 'var(--border)' : st.profit >= 0 ? '#bfdbfe' : '#fecdd3'}`,
                            }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>수익</span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: profitColor(st.profit) }}>
                                {st.profit == null ? '-' : `${st.profit >= 0 ? '+' : ''}${fmt(Math.round(st.profit))}원`}
                              </span>
                              <span style={{
                                fontSize: 12, fontWeight: 700, color: profitColor(st.profit),
                                background: st.profit == null ? 'transparent' : st.profit >= 0 ? '#dbeafe' : '#fecdd3',
                                borderRadius: 6, padding: '1px 6px',
                              }}>
                                {fmtRate(st.profit_rate)}
                              </span>
                            </div>
                            {st.day_change_rate != null && (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, flexShrink: 0 }}>
                                <span style={{ color: 'var(--text-muted)' }}>당일</span>
                                <span style={{ fontWeight: 700, color: st.day_change_rate >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                                  {st.day_change_rate >= 0 ? '+' : ''}{st.day_change_rate.toFixed(2)}%
                                </span>
                                {st.day_change_krw != null && (
                                  <span style={{ color: st.day_change_rate >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                                    ({st.day_change_krw >= 0 ? '+' : ''}{fmt(st.day_change_krw)}원)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {calcOpenId === st.id && (() => {
                            const result = getCalcResult(st)
                            return (
                              <div style={{ marginTop: 10, padding: '12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>📉 물타기 계산</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                  <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>추가 매수수량 (주)</label>
                                    <input type="number" min="0" step="any" placeholder="50" value={addQty}
                                      onChange={(e) => setAddQty(e.target.value)}
                                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>추가 매수가 (원)</label>
                                    <input type="number" min="0" step="any" placeholder="40,000" value={addPrice}
                                      onChange={(e) => setAddPrice(e.target.value)}
                                      style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
                                  </div>
                                </div>
                                {parseFloat(addQty) > 0 && parseFloat(addPrice) > 0 && (
                                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff', borderRadius: 7, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>추가 매수 필요금액</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(Math.round(parseFloat(addQty) * parseFloat(addPrice)))}원</span>
                                  </div>
                                )}
                                {result ? (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                    {[
                                      { label: '새 평균매입가', value: `${fmt(Math.round(result.newAvg))}원`, highlight: true },
                                      { label: '총 보유수량', value: `${result.totalQty}주` },
                                      { label: '총 투자금액', value: `${fmt(Math.round(result.totalCost))}원` },
                                    ].map(({ label, value, highlight }) => (
                                      <div key={label} style={{ background: highlight ? 'var(--accent)' : '#fff', borderRadius: 7, padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? '#fff' : 'var(--text-primary)' }}>{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>추가 매수수량과 가격을 입력하세요</div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {/* 티커 도움말 */}
      <div className="card card-section">
        <h2 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>티커 입력 방법</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          {[
            ['🇰🇷 KOSPI',   '005930.KS (삼성전자)'],
            ['🇰🇷 KOSDAQ',  '035720.KQ (카카오)'],
            ['🇺🇸 미국주식', 'AAPL (애플)'],
            ['🇺🇸 미국주식', 'TSLA (테슬라)'],
          ].map(([label, example]) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 10px' }}>
              <strong>{label}</strong> — {example}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
