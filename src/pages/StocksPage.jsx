import { useState, useEffect } from 'react'
import { getStocks, createStock, updateStock, deleteStock, getStockPrices } from '../api/client'

const EMPTY_FORM = { name: '', ticker: '', quantity: '', avg_price: '', owner: '', account_type: '' }

const fmt = (n) => n == null ? '-' : Number(n).toLocaleString('ko-KR')
const fmtRate = (r) => r == null ? '-' : `${r > 0 ? '+' : ''}${r.toFixed(2)}%`
const profitColor = (p) => p == null ? 'var(--text-muted)' : p >= 0 ? 'var(--stock-up)' : 'var(--stock-down)'

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [priceMap, setPriceMap] = useState({}) // id → price data
  const [pricesLoading, setPricesLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [calcOpenId, setCalcOpenId] = useState(null)
  const [addQty, setAddQty] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [monthlyAdd, setMonthlyAdd] = useState({ nasdaq: '', sp500: '', other: '' })
  const [projTab, setProjTab] = useState('합계')

  const fetchStocks = async () => {
    const res = await getStocks()
    setStocks(res.data)
  }

  const fetchPrices = async () => {
    setPricesLoading(true)
    try {
      const res = await getStockPrices()
      const map = {}
      res.data.forEach((p) => { map[p.id] = p })
      setPriceMap(map)
    } finally {
      setPricesLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks().then(fetchPrices)
  }, [])

  // 기본 데이터 + 가격 데이터 병합
  const enriched = stocks.map((st) => ({ ...st, ...(priceMap[st.id] || {}) }))

  const totalPurchase = enriched.reduce((s, st) => s + (st.purchase_value || 0), 0)
  const totalCurrent  = enriched.reduce((s, st) => s + (st.current_value || 0), 0)
  const totalProfit   = totalCurrent - totalPurchase
  const totalRate     = totalPurchase > 0 ? (totalProfit / totalPurchase * 100) : 0

  // 소유자 → 계좌종류 → 종목 그룹핑
  const grouped = enriched.reduce((acc, st) => {
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
      fetchPrices()
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
    await deleteStock(id)
    await fetchStocks()
    fetchPrices()
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
            <button className="btn secondary" onClick={() => { fetchStocks().then(fetchPrices) }} disabled={pricesLoading} style={{ fontSize: 13 }}>
              {pricesLoading ? '시세 조회 중...' : '🔄 새로고침'}
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
                              { label: '투자금액',   value: `${fmt(Math.round(st.quantity * st.avg_price))}원` },
                              { label: '현재가',     value: pricesLoading && !st.current_price ? '조회 중...' : st.current_price ? (st.currency === 'USD' ? `$${st.current_price.toFixed(2)}` : `${fmt(Math.round(st.current_price))}원`) : '조회 실패' },
                              { label: '평가금액',   value: pricesLoading && !st.current_value ? '조회 중...' : st.current_value ? `${fmt(Math.round(st.current_value))}원` : '-' },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '5px 6px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                                <div className="stock-price-text" style={{ fontSize: 12 }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>평가손익</span>
                              <span style={{ fontWeight: 700, color: profitColor(st.profit) }}>
                                {st.profit == null ? '-' : `${st.profit >= 0 ? '+' : ''}${fmt(Math.round(st.profit))}원`}
                              </span>
                              <span style={{ fontWeight: 700, color: profitColor(st.profit) }}>{fmtRate(st.profit_rate)}</span>
                            </div>
                            {st.day_change_rate != null && (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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

      {/* ISA / 연금 계좌 총합 + 장기 수익률 예상 */}
      {(() => {
        const isaStocks     = enriched.filter((st) => st.account_type?.toUpperCase().includes('ISA'))
        const pensionStocks = enriched.filter((st) => st.account_type?.includes('연금'))
        const isaTotal      = isaStocks.reduce((s, st) => s + (st.current_value || 0), 0)
        const pensionTotal  = pensionStocks.reduce((s, st) => s + (st.current_value || 0), 0)
        const combinedTotal = isaTotal + pensionTotal
        if (isaStocks.length === 0 && pensionStocks.length === 0) return null

        const YEARS = [3, 5, 10, 15, 20, 25, 30]
        const RATES = [8, 10, 12]
        const fmtBig = (n) => {
          if (n >= 1e8) return (n / 1e8).toFixed(1) + '억'
          if (n >= 1e4) return Math.round(n / 1e4).toLocaleString() + '만'
          return Math.round(n).toLocaleString()
        }

        const isNasdaq = (st) => /나스닥|nasdaq|qqq/i.test(st.name + st.ticker)
        const isSP500  = (st) => /s&p|sp500|에스앤피|spy/i.test(st.name + st.ticker)

        const tabPool = projTab === 'ISA' ? isaStocks : projTab === '연금' ? pensionStocks : [...isaStocks, ...pensionStocks]

        const nasdaqStocks = tabPool.filter(isNasdaq)
        const sp500Stocks  = tabPool.filter(isSP500)
        const nasdaqTotal  = nasdaqStocks.reduce((s, st) => s + (st.current_value || 0), 0)
        const sp500Total   = sp500Stocks.reduce((s, st) => s + (st.current_value || 0), 0)
        const groups = [
          { label: '미국 나스닥100', color: '#6366f1', base: nasdaqTotal, items: nasdaqStocks, key: 'nasdaq' },
          { label: '미국 S&P500',   color: '#0ea5e9', base: sp500Total,  items: sp500Stocks,  key: 'sp500'  },
        ].filter((g) => g.items.length > 0)

        const otherStocks = tabPool.filter((st) => !isNasdaq(st) && !isSP500(st))
        const otherTotal  = otherStocks.reduce((s, st) => s + (st.current_value || 0), 0)

        const calcProjected = (base, annualRate, years, monthlyPmt) => {
          const r = annualRate / 100
          const fv = base * Math.pow(1 + r, years)
          if (!monthlyPmt) return fv
          const mr = Math.pow(1 + r, 1 / 12) - 1
          const months = years * 12
          return fv + monthlyPmt * ((Math.pow(1 + mr, months) - 1) / mr)
        }

        return (
          <div className="card card-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>📈 계좌별 총합 &amp; 장기 수익률 예상</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {['ISA', '연금', '합계'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProjTab(tab)}
                    className={`btn ${projTab === tab ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 12px', fontSize: 12 }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 계좌 총합 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(projTab === 'ISA' || projTab === '합계') && isaStocks.length > 0 && (
                <div style={{ flex: 1, minWidth: 120, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>ISA</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{isaStocks.length}종목</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#4f86f7' }}>{fmt(Math.round(isaTotal))}원</span>
                </div>
              )}
              {(projTab === '연금' || projTab === '합계') && pensionStocks.length > 0 && (
                <div style={{ flex: 1, minWidth: 120, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>연금</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{pensionStocks.length}종목</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#22c55e' }}>{fmt(Math.round(pensionTotal))}원</span>
                </div>
              )}
              {projTab === '합계' && isaStocks.length > 0 && pensionStocks.length > 0 && (
                <div style={{ flex: 1, minWidth: 120, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>합계</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#1d4ed8' }}>{fmt(Math.round(combinedTotal))}원</span>
                </div>
              )}
            </div>

            {/* 수익률 예상 테이블 */}
            {groups.length > 0 && (
              <>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>보유 종목 현재 평가금액 기준 · 연 복리 · 추가 납입 없음</p>
                {groups.map(({ label, color, base, items, key }) => {
                  const pmt = parseFloat(monthlyAdd[key]) * 10000 || 0
                  return (
                  <div key={label} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{label}</p>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {items.map((st) => st.name).join(', ')} · 기준 {fmtBig(base)}원
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>월 추가납입</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={monthlyAdd[key]}
                          onChange={(e) => setMonthlyAdd((prev) => ({ ...prev, [key]: e.target.value }))}
                          style={{ width: 80, padding: '3px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, textAlign: 'right', background: 'var(--bg)', color: 'var(--text-primary)' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>만원</span>
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg)' }}>
                            <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>기간</th>
                            {RATES.map((r) => (
                              <th key={r} style={{ padding: '7px 10px', textAlign: 'right', color, fontWeight: 700, whiteSpace: 'nowrap' }}>{r}% / 년</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {YEARS.map((y, yi) => (
                            <tr key={y} style={{ background: yi % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{y}년 후</td>
                              {RATES.map((r) => (
                                <td key={r} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                  {fmtBig(calcProjected(base, r, y, pmt))}원
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )
                })}
              </>
            )}

            {/* 나스닥/S&P 외 기타 종목 */}
            {otherStocks.length > 0 && (() => {
              const pmt = parseFloat(monthlyAdd.other) * 10000 || 0
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>기타 종목</p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {otherStocks.map((st) => st.name).join(', ')} · 기준 {fmtBig(otherTotal)}원
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>월 추가납입</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={monthlyAdd.other}
                        onChange={(e) => setMonthlyAdd((prev) => ({ ...prev, other: e.target.value }))}
                        style={{ width: 80, padding: '3px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, textAlign: 'right', background: 'var(--bg)', color: 'var(--text-primary)' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>만원</span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg)' }}>
                          <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>기간</th>
                          {RATES.map((r) => (
                            <th key={r} style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r}% / 년</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {YEARS.map((y, yi) => (
                          <tr key={y} style={{ background: yi % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{y}년 후</td>
                            {RATES.map((r) => (
                              <td key={r} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {fmtBig(calcProjected(otherTotal, r, y, pmt))}원
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })()}

    </div>
  )
}
