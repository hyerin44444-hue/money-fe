import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  getHyerinSavings, addHyerinSavings, deleteHyerinSavings,
  getHyerinStocks, createHyerinStock, updateHyerinStock, deleteHyerinStock,
  getHyerinCash, createHyerinCash, updateHyerinCash, deleteHyerinCash,
  getHyerinGold, createHyerinGold, updateHyerinGold, deleteHyerinGold,
  getGoldPrice,
} from '../api/client'

const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'
const EMPTY_SAV = { name: '', amount: '', date: dayjs().format('YYYY-MM-DD') }
const EMPTY_STOCK = { name: '', ticker: '', quantity: '', avg_price: '', account_type: '' }
const EMPTY_CASH = { category: '', amount: '', note: '', date: dayjs().format('YYYY-MM-DD') }
const EMPTY_GOLD = { grams: '', buy_price_per_gram: '', note: '', date: dayjs().format('YYYY-MM-DD') }

const profitColor = (v) => v == null ? 'var(--text-muted)' : v >= 0 ? 'var(--stock-up)' : 'var(--stock-down)'

export default function HyerinAssetsPage() {
  const [savings, setSavings] = useState([])
  const [stocks, setStocks] = useState([])
  const [cashList, setCashList] = useState([])
  const [goldList, setGoldList] = useState([])
  const [goldPrice, setGoldPrice] = useState(null)
  const [loading, setLoading] = useState(true)

  const [showSavForm, setShowSavForm] = useState(false)
  const [savForm, setSavForm] = useState(EMPTY_SAV)

  const [showStockForm, setShowStockForm] = useState(false)
  const [stockForm, setStockForm] = useState(EMPTY_STOCK)
  const [stockEditId, setStockEditId] = useState(null)

  const [showCashForm, setShowCashForm] = useState(false)
  const [cashForm, setCashForm] = useState(EMPTY_CASH)
  const [cashEditId, setCashEditId] = useState(null)

  const [showGoldForm, setShowGoldForm] = useState(false)
  const [goldForm, setGoldForm] = useState(EMPTY_GOLD)
  const [goldEditId, setGoldEditId] = useState(null)

  const [expandedSav, setExpandedSav] = useState(new Set())

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [savRes, stRes, cashRes, goldRes, gpRes] = await Promise.all([
        getHyerinSavings(),
        getHyerinStocks(),
        getHyerinCash(),
        getHyerinGold(),
        getGoldPrice().catch(() => ({ data: null })),
      ])
      setSavings(savRes.data)
      setStocks(stRes.data)
      setCashList(cashRes.data)
      setGoldList(goldRes.data)
      setGoldPrice(gpRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const savingsTotal = savings.reduce((s, g) => s + g.total, 0)
  const stocksTotal = stocks.reduce((s, st) => s + (st.current_value || 0), 0)
  const cashTotal = cashList.reduce((s, c) => s + Number(c.amount), 0)
  const goldTotal = goldPrice
    ? goldList.reduce((s, g) => s + g.grams * goldPrice.sell_per_gram, 0)
    : goldList.reduce((s, g) => s + g.grams * g.buy_price_per_gram, 0)
  const total = savingsTotal + stocksTotal + cashTotal + goldTotal

  const handleSavSubmit = async (e) => {
    e.preventDefault()
    await addHyerinSavings({ ...savForm, amount: parseFloat(savForm.amount) })
    setSavForm(EMPTY_SAV); setShowSavForm(false); fetchAll()
  }
  const handleSavDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteHyerinSavings(id); fetchAll()
  }

  const handleStockSubmit = async (e) => {
    e.preventDefault()
    const data = { ...stockForm, quantity: parseFloat(stockForm.quantity), avg_price: parseFloat(stockForm.avg_price) }
    if (stockEditId) await updateHyerinStock(stockEditId, data)
    else await createHyerinStock(data)
    setStockForm(EMPTY_STOCK); setStockEditId(null); setShowStockForm(false); fetchAll()
  }
  const handleStockEdit = (st) => {
    setStockForm({ name: st.name, ticker: st.ticker, quantity: String(st.quantity), avg_price: String(st.avg_price), account_type: st.account_type || '' })
    setStockEditId(st.id); setShowStockForm(true)
  }
  const handleStockDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteHyerinStock(id); fetchAll()
  }

  const handleCashSubmit = async (e) => {
    e.preventDefault()
    const data = { ...cashForm, amount: parseFloat(cashForm.amount) }
    if (cashEditId) await updateHyerinCash(cashEditId, data)
    else await createHyerinCash(data)
    setCashForm(EMPTY_CASH); setCashEditId(null); setShowCashForm(false); fetchAll()
  }
  const handleCashEdit = (c) => {
    setCashForm({ category: c.category, amount: String(c.amount), note: c.note || '', date: c.date })
    setCashEditId(c.id); setShowCashForm(true)
  }
  const handleCashDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteHyerinCash(id); fetchAll()
  }

  const handleGoldSubmit = async (e) => {
    e.preventDefault()
    const data = { ...goldForm, grams: parseFloat(goldForm.grams), buy_price_per_gram: parseFloat(goldForm.buy_price_per_gram) / 3.75 }
    if (goldEditId) await updateHyerinGold(goldEditId, data)
    else await createHyerinGold(data)
    setGoldForm(EMPTY_GOLD); setGoldEditId(null); setShowGoldForm(false); fetchAll()
  }
  const handleGoldEdit = (g) => {
    setGoldForm({ grams: String(g.grams), buy_price_per_gram: String(Math.round(g.buy_price_per_gram * 3.75)), note: g.note || '', date: g.date })
    setGoldEditId(g.id); setShowGoldForm(true)
  }
  const handleGoldDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteHyerinGold(id); fetchAll()
  }

  const assets = [
    { label: '적금', value: savingsTotal, color: '#4f86f7', icon: '🏦' },
    { label: '주식', value: stocksTotal,  color: '#22c55e', icon: '📈' },
    { label: '현금', value: cashTotal,    color: '#f59e0b', icon: '💵' },
    { label: '금',   value: goldTotal,    color: '#eab308', icon: '🪙' },
  ]

  return (
    <div className="page">

      {/* 총 자산 */}
      <div className="card card-section" style={{ textAlign: 'center', padding: '28px 24px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>혜린 총 자산</p>
        <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: -1 }}>
          {loading ? '계산 중...' : fmt(Math.round(total))}
        </p>
      </div>

      {/* 자산 항목별 */}
      {assets.map(({ label, value, color, icon }) => (
        <div key={label} className="card card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
              {label === '금' && goldList.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {(goldList.reduce((s, g) => s + g.grams, 0) / 3.75).toFixed(2)}돈
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color }}>
                {loading && label !== '현금' ? '...' : fmt(Math.round(value))}
              </span>
              {label === '적금' && (
                <button className="btn primary" style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => { setSavForm(EMPTY_SAV); setShowSavForm(true) }}>+ 추가</button>
              )}
              {label === '주식' && (
                <button className="btn primary" style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => { setStockForm(EMPTY_STOCK); setStockEditId(null); setShowStockForm(true) }}>+ 추가</button>
              )}
              {label === '현금' && (
                <button className="btn primary" style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => { setCashForm(EMPTY_CASH); setCashEditId(null); setShowCashForm(true) }}>+ 추가</button>
              )}
            </div>
          </div>

          {/* 비중 바 */}
          {!loading && total > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                <span>비중</span><span>{((value / total) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(value / total) * 100}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )}

          {/* 적금 목록 */}
          {label === '적금' && savings.map((g) => (
            <div key={g.name} style={{ marginBottom: 6, background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', cursor: 'pointer' }}
                onClick={() => setExpandedSav(prev => { const s = new Set(prev); s.has(g.name) ? s.delete(g.name) : s.add(g.name); return s })}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#4f86f7' }}>{fmt(g.total)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{expandedSav.has(g.name) ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedSav.has(g.name) && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {g.records.map((r) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{r.date}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{fmt(r.amount)}</span>
                        <button className="btn-icon danger" style={{ fontSize: 11 }} onClick={() => handleSavDelete(r.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {label === '적금' && savings.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0' }}>적금 내역을 추가해주세요.</p>
          )}

          {/* 주식 목록 */}
          {label === '주식' && stocks.map((st) => {
            const isUp = st.profit != null && st.profit >= 0
            return (
              <div key={st.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{st.ticker}</span>
                    {st.account_type && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>· {st.account_type}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleStockEdit(st)}>수정</button>
                    <button className="btn-icon danger" onClick={() => handleStockDelete(st.id)}>🗑️</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                  {[
                    { label: '수량', value: st.quantity },
                    { label: '평균단가', value: st.currency === 'USD' ? `$${st.avg_price}` : fmt(st.avg_price) },
                    { label: '투자금액', value: fmt(Math.round(st.purchase_value)) },
                    { label: '평가금액', value: st.current_value != null ? fmt(Math.round(st.current_value)) : '-' },
                  ].map(({ label: l, value: v }) => (
                    <div key={l} style={{ background: 'var(--surface)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {st.profit != null && (
                  <div style={{ marginTop: 6, fontSize: 12, color: profitColor(st.profit) }}>
                    {isUp ? '+' : ''}{fmt(Math.round(st.profit))} ({st.profit_rate >= 0 ? '+' : ''}{st.profit_rate}%)
                    {st.day_change_rate != null && (
                      <span style={{ marginLeft: 8, color: st.day_change_rate >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                        전일대비 {st.day_change_rate >= 0 ? '+' : ''}{st.day_change_rate}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {label === '주식' && stocks.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0' }}>주식 종목을 추가해주세요.</p>
          )}

          {/* 현금 목록 */}
          {label === '현금' && cashList.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.category}</span>
                {c.note && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{c.note}</span>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>{fmt(c.amount)}</span>
                <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleCashEdit(c)}>수정</button>
                <button className="btn-icon danger" onClick={() => handleCashDelete(c.id)}>🗑️</button>
              </div>
            </div>
          ))}
          {label === '현금' && cashList.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0' }}>현금 내역을 추가해주세요.</p>
          )}

          {/* 금 섹션 */}
          {label === '금' && (
            <>
              {goldPrice && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[
                    { l: '살때 (1돈)', v: fmt(Math.round(goldPrice.buy_per_gram * 3.75)), c: '#ef4444' },
                    { l: '팔때 (1돈)', v: fmt(Math.round(goldPrice.sell_per_gram * 3.75)), c: '#2563eb' },
                    { l: '국제금가', v: `$${goldPrice.gold_usd_oz}`, c: undefined },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ flex: 1, minWidth: 90, background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {goldList.map((g) => {
                const currentVal = goldPrice ? g.grams * goldPrice.sell_per_gram : null
                const buyVal = g.grams * g.buy_price_per_gram
                const profit = currentVal != null ? currentVal - buyVal : null
                const profitPct = profit != null ? (profit / buyVal) * 100 : null
                return (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{g.grams}g ({(g.grams / 3.75).toFixed(2)}돈)</span>
                      {g.note && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{g.note}</span>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        매입 {Number(Math.round(g.buy_price_per_gram * 3.75)).toLocaleString('ko-KR')}원/돈 · {g.date}
                      </div>
                      {profit != null && (
                        <div style={{ fontSize: 11, marginTop: 1, color: profitColor(profit) }}>
                          {profit >= 0 ? '+' : ''}{fmt(Math.round(profit))} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#eab308' }}>
                        {currentVal != null ? fmt(Math.round(currentVal)) : fmt(Math.round(buyVal))}
                      </span>
                      <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleGoldEdit(g)}>수정</button>
                      <button className="btn-icon danger" onClick={() => handleGoldDelete(g.id)}>🗑️</button>
                    </div>
                  </div>
                )
              })}
              <button className="btn primary" style={{ width: '100%', fontSize: 13, marginTop: 2 }}
                onClick={() => { setGoldForm(EMPTY_GOLD); setGoldEditId(null); setShowGoldForm(true) }}>+ 추가</button>
            </>
          )}
        </div>
      ))}

      {/* 적금 추가 모달 */}
      {showSavForm && (
        <div className="modal-overlay" onClick={() => setShowSavForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>적금 추가</h2>
              <button onClick={() => setShowSavForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSavSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row"><label>적금명</label><input placeholder="예) 청년적금" value={savForm.name} onChange={(e) => setSavForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="form-row"><label>금액 (원)</label><input type="number" min="0" value={savForm.amount} onChange={(e) => setSavForm(p => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="form-row"><label>날짜</label><input type="date" value={savForm.date} onChange={(e) => setSavForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setShowSavForm(false)}>취소</button>
                <button type="submit" className="btn primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 주식 추가/수정 모달 */}
      {showStockForm && (
        <div className="modal-overlay" onClick={() => { setShowStockForm(false); setStockEditId(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{stockEditId ? '주식 수정' : '주식 추가'}</h2>
              <button onClick={() => { setShowStockForm(false); setStockEditId(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row"><label>종목명</label><input placeholder="예) 삼성전자" value={stockForm.name} onChange={(e) => setStockForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="form-row"><label>티커</label><input placeholder="예) 005930.KS / AAPL" value={stockForm.ticker} onChange={(e) => setStockForm(p => ({ ...p, ticker: e.target.value }))} required /></div>
              <div className="form-row"><label>보유수량</label><input type="number" min="0" step="any" value={stockForm.quantity} onChange={(e) => setStockForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
              <div className="form-row"><label>평균매입가</label><input type="number" min="0" step="any" value={stockForm.avg_price} onChange={(e) => setStockForm(p => ({ ...p, avg_price: e.target.value }))} required /></div>
              <div className="form-row"><label>계좌종류</label><input placeholder="예) ISA, 일반" value={stockForm.account_type} onChange={(e) => setStockForm(p => ({ ...p, account_type: e.target.value }))} /></div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => { setShowStockForm(false); setStockEditId(null) }}>취소</button>
                <button type="submit" className="btn primary">{stockEditId ? '수정' : '추가'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 현금 추가/수정 모달 */}
      {showCashForm && (
        <div className="modal-overlay" onClick={() => { setShowCashForm(false); setCashEditId(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{cashEditId ? '현금 수정' : '현금 추가'}</h2>
              <button onClick={() => { setShowCashForm(false); setCashEditId(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row"><label>카테고리</label><input placeholder="예) 통장잔액" value={cashForm.category} onChange={(e) => setCashForm(p => ({ ...p, category: e.target.value }))} required /></div>
              <div className="form-row"><label>금액 (원)</label><input type="number" min="0" value={cashForm.amount} onChange={(e) => setCashForm(p => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="form-row"><label>날짜</label><input type="date" value={cashForm.date} onChange={(e) => setCashForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="form-row"><label>메모</label><input placeholder="선택 입력" value={cashForm.note} onChange={(e) => setCashForm(p => ({ ...p, note: e.target.value }))} /></div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => { setShowCashForm(false); setCashEditId(null) }}>취소</button>
                <button type="submit" className="btn primary">{cashEditId ? '수정' : '추가'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 금 추가/수정 모달 */}
      {showGoldForm && (
        <div className="modal-overlay" onClick={() => { setShowGoldForm(false); setGoldEditId(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{goldEditId ? '금 수정' : '금 추가'}</h2>
              <button onClick={() => { setShowGoldForm(false); setGoldEditId(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleGoldSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row"><label>보유량 (g)</label><input type="number" step="0.001" min="0" placeholder="예) 3.75" value={goldForm.grams} onChange={(e) => setGoldForm(p => ({ ...p, grams: e.target.value }))} required /></div>
              <div className="form-row"><label>매입가 (원/돈)</label><input type="number" min="0" placeholder="예) 200000" value={goldForm.buy_price_per_gram} onChange={(e) => setGoldForm(p => ({ ...p, buy_price_per_gram: e.target.value }))} required /></div>
              <div className="form-row"><label>날짜</label><input type="date" value={goldForm.date} onChange={(e) => setGoldForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="form-row"><label>메모</label><input placeholder="선택 입력" value={goldForm.note} onChange={(e) => setGoldForm(p => ({ ...p, note: e.target.value }))} /></div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => { setShowGoldForm(false); setGoldEditId(null) }}>취소</button>
                <button type="submit" className="btn primary">{goldEditId ? '수정' : '추가'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
