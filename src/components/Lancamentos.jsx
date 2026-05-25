import { useState, useMemo } from 'react'
import '../styles/Lancamentos.css'

export const CATEGORIES = [
  { id: 'Alimentação', icon: '🍽️', color: '#ffa502' },
  { id: 'Transporte',  icon: '🚗', color: '#4a9eff' },
  { id: 'Saúde',       icon: '💊', color: '#ff6b81' },
  { id: 'Lazer',       icon: '🎬', color: '#a78bfa' },
  { id: 'Moradia',     icon: '🏠', color: '#ffd700' },
  { id: 'Educação',    icon: '📚', color: '#00f5c8' },
  { id: 'Outros',      icon: '📦', color: '#8888aa' },
]

const fmt   = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const today = () => new Date().toISOString().split('T')[0]

const _now = new Date()
const currentMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`

function fmtMonth(key) {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export default function Lancamentos({ data, updateData, showToast }) {
  const [form, setForm] = useState({
    description: '', value: '', category: 'Alimentação', date: today(), paidFrom: 'salary',
  })
  const [filterCat,   setFilterCat]   = useState('Todas')
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [sortBy,      setSortBy]      = useState('data')
  const [editTx,      setEditTx]      = useState(null)
  const [showBudgets, setShowBudgets] = useState(false)

  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const handleBenefit = (key, field, value) =>
    updateData({ benefits: { ...data.benefits, [key]: { ...data.benefits[key], [field]: value } } })

  // Income sources for "paidFrom" selector (only salary + enabled benefits with value)
  const incomeSources = useMemo(() => {
    const sources = []
    if (data.salary) sources.push({ key: 'salary', label: '💵 Salário', value: parseFloat(data.salary) || 0 })
    Object.entries(data.benefits).forEach(([key, b]) => {
      if (b.enabled && b.value) sources.push({ key, label: `${b.icon} ${b.label}`, value: parseFloat(b.value) || 0 })
    })
    return sources
  }, [data.salary, data.benefits])

  const addTransaction = () => {
    if (!form.description.trim() || !form.value) { showToast('Preencha descrição e valor'); return }
    updateData({
      transactions: [...data.transactions, { id: Date.now(), ...form, value: parseFloat(form.value) }],
    })
    setForm({ description: '', value: '', category: 'Alimentação', date: today(), paidFrom: form.paidFrom })
    showToast('Lançamento adicionado!')
  }

  const removeTransaction = (id) =>
    updateData({ transactions: data.transactions.filter(t => t.id !== id) })

  const saveEdit = () => {
    if (!editTx.description.trim() || !editTx.value) { showToast('Preencha os campos'); return }
    updateData({
      transactions: data.transactions.map(t =>
        t.id === editTx.id ? { ...editTx, value: parseFloat(editTx.value) } : t
      ),
    })
    setEditTx(null)
    showToast('Lançamento atualizado!')
  }

  const updateBudget = (cat, value) =>
    updateData({ budgets: { ...(data.budgets || {}), [cat]: value } })

  const budgets = data.budgets || {}

  const availableMonths = useMemo(() => {
    const set = new Set([currentMonth])
    data.transactions.forEach(t => { if (t.date) set.add(t.date.slice(0, 7)) })
    return [...set].sort().reverse()
  }, [data.transactions])

  const monthlySpend = useMemo(() => {
    const spend = {}
    data.transactions
      .filter(t => t.date?.startsWith(filterMonth))
      .forEach(t => { spend[t.category] = (spend[t.category] || 0) + (parseFloat(t.value) || 0) })
    return spend
  }, [data.transactions, filterMonth])

  const filtered = useMemo(() => {
    let list = data.transactions.filter(t => t.date?.startsWith(filterMonth))
    if (filterCat !== 'Todas') list = list.filter(t => t.category === filterCat)
    return sortBy === 'data'
      ? [...list].sort((a, b) => b.date.localeCompare(a.date))
      : [...list].sort((a, b) => b.value - a.value)
  }, [data.transactions, filterCat, filterMonth, sortBy])

  return (
    <div className="lancamentos-grid">

      {/* Salário & Benefícios */}
      <div className="card card-accent">
        <h3 style={{ color: '#c8f500', marginBottom: 18 }}>Salário & Benefícios</h3>

        <div className="salary-wrap">
          <label className="form-label">Salário Mensal</label>
          <input
            type="number" placeholder="R$ 0,00"
            value={data.salary}
            onChange={e => updateData({ salary: e.target.value })}
            className="salary-input"
          />
        </div>

        <div className="benefits-list">
          {Object.entries(data.benefits).map(([key, b]) => (
            <div key={key}>
              <div className="benefit-label" onClick={() => handleBenefit(key, 'enabled', !b.enabled)}>
                <div
                  className={`custom-checkbox${b.enabled ? ' custom-checkbox--checked' : ''}`}
                  style={b.enabled ? { background: b.color, borderColor: b.color } : {}}
                >
                  {b.enabled && '✓'}
                </div>
                <span style={{ color: b.enabled ? b.color : '#8888aa', fontWeight: b.enabled ? 700 : 400 }}>
                  {b.icon} {b.label}
                </span>
              </div>
              {b.enabled && (
                <div className="benefit-value-wrap">
                  <input
                    type="number" placeholder="R$ 0,00"
                    value={b.value}
                    onChange={e => handleBenefit(key, 'value', e.target.value)}
                    style={{ borderColor: b.color + '50', color: b.color, fontFamily: 'JetBrains Mono' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="benefits-total">
          <span className="benefits-total-label">Total Renda</span>
          <span className="benefits-total-value">{fmt(totalRenda)}</span>
        </div>
      </div>

      {/* Novo Lançamento */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Novo Lançamento</h3>
        <div className="form-grid">
          <div>
            <label className="form-label">Descrição</label>
            <input
              placeholder="Ex: Almoço no restaurante"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTransaction()}
            />
          </div>
          <div>
            <label className="form-label">Valor (R$)</label>
            <input
              type="number" placeholder="0,00"
              value={form.value}
              onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
              className="valor-input"
              onKeyDown={e => e.key === 'Enter' && addTransaction()}
            />
          </div>
          <div>
            <label className="form-label">Categoria</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Data</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          {incomeSources.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Pago com</label>
              <select value={form.paidFrom} onChange={e => setForm(p => ({ ...p, paidFrom: e.target.value }))}>
                {incomeSources.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button className="btn btn-green btn-full" onClick={addTransaction}>+ Lançar</button>
      </div>

      {/* Orçamento por Categoria */}
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="budget-toggle" onClick={() => setShowBudgets(p => !p)}>
          <h3>Orçamento por Categoria</h3>
          <span style={{ color: '#8888aa', fontSize: 12 }}>{showBudgets ? '▲ Fechar' : '▼ Expandir'}</span>
        </div>
        {showBudgets && (
          <div className="budget-grid">
            {CATEGORIES.map(cat => {
              const budget = parseFloat(budgets[cat.id]) || 0
              const spent  = monthlySpend[cat.id] || 0
              const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
              const over   = budget > 0 && spent > budget
              return (
                <div key={cat.id} className="budget-item">
                  <div className="budget-item-header">
                    <span className="budget-item-label">{cat.icon} {cat.id}</span>
                    <input
                      type="number" placeholder="Limite R$"
                      value={budgets[cat.id] || ''}
                      onChange={e => updateBudget(cat.id, e.target.value)}
                      style={{ fontFamily: 'JetBrains Mono', color: cat.color }}
                      className="budget-limit-input"
                    />
                  </div>
                  {budget > 0 && (
                    <>
                      <div className="progress-bar" style={{ marginTop: 8 }}>
                        <div style={{
                          background: over ? '#ff4757' : cat.color,
                          height: '100%', borderRadius: 10,
                          width: `${pct}%`, transition: 'width 0.5s',
                        }} />
                      </div>
                      <div className="budget-item-meta" style={{ color: over ? '#ff4757' : '#8888aa' }}>
                        {fmt(spent)} / {fmt(budget)}{over && ' · ultrapassado!'}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="history-header">
          <h3 className="history-title">Histórico</h3>
          <div className="sort-pills">
            <button className={`pill ${sortBy === 'data'  ? 'active' : ''}`} onClick={() => setSortBy('data')}>📅 Data</button>
            <button className={`pill ${sortBy === 'valor' ? 'active' : ''}`} onClick={() => setSortBy('valor')}>💰 Valor</button>
          </div>
        </div>

        <div className="filter-scroll" style={{ marginBottom: 4 }}>
          {availableMonths.map(m => (
            <button key={m} className={`pill ${filterMonth === m ? 'active' : ''}`} onClick={() => setFilterMonth(m)}>
              {fmtMonth(m)}
            </button>
          ))}
        </div>

        <div className="filter-scroll">
          {['Todas', ...CATEGORIES.map(c => c.id)].map(cat => (
            <button key={cat} className={`pill ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>
              {cat}
            </button>
          ))}
        </div>

        <div className="tx-list">
          {filtered.length === 0 && <div className="empty-state">Nenhum lançamento encontrado</div>}
          {filtered.map(tx => {
            const cat = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES.at(-1)
            return (
              <div key={tx.id} className="tx-item">
                <span className="tx-icon">{cat.icon}</span>
                <div className="tx-info">
                  <div className="tx-desc">{tx.description}</div>
                  <div className="tx-meta">
                    {tx.category} · {tx.date}
                    {tx.paidFrom && tx.paidFrom !== 'salary' && (
                      <> · <span style={{ color: data.benefits[tx.paidFrom]?.color || '#8888aa' }}>
                        {data.benefits[tx.paidFrom]?.icon} {data.benefits[tx.paidFrom]?.label}
                      </span></>
                    )}
                  </div>
                </div>
                <span className="tx-value">-{fmt(tx.value)}</span>
                <button className="edit-btn" onClick={() => setEditTx({ ...tx, value: String(tx.value) })}>✎</button>
                <button className="remove-btn" onClick={() => removeTransaction(tx.id)}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de edição */}
      {editTx && (
        <div className="modal-overlay" onClick={() => setEditTx(null)}>
          <div className="card modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Editar Lançamento</h3>
            <div className="form-grid">
              <div>
                <label className="form-label">Descrição</label>
                <input
                  placeholder="Ex: Almoço no restaurante"
                  value={editTx.description}
                  onChange={e => setEditTx(p => ({ ...p, description: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Valor (R$)</label>
                <input
                  type="number" placeholder="0,00"
                  value={editTx.value}
                  onChange={e => setEditTx(p => ({ ...p, value: e.target.value }))}
                  className="valor-input"
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                />
              </div>
              <div>
                <label className="form-label">Categoria</label>
                <select value={editTx.category} onChange={e => setEditTx(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Data</label>
                <input type="date" value={editTx.date} onChange={e => setEditTx(p => ({ ...p, date: e.target.value }))} />
              </div>
              {incomeSources.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Pago com</label>
                  <select value={editTx.paidFrom || 'salary'} onChange={e => setEditTx(p => ({ ...p, paidFrom: e.target.value }))}>
                    {incomeSources.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-green btn-full" onClick={saveEdit}>Salvar</button>
              <button className="btn btn-ghost btn-full" onClick={() => setEditTx(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
