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

const fmt  = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const today = () => new Date().toISOString().split('T')[0]

export default function Lancamentos({ data, updateData, showToast }) {
  const [form, setForm] = useState({
    description: '', value: '', category: 'Alimentação', date: today(),
  })
  const [filterCat, setFilterCat] = useState('Todas')
  const [sortBy, setSortBy]       = useState('data')

  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const handleBenefit = (key, field, value) =>
    updateData({ benefits: { ...data.benefits, [key]: { ...data.benefits[key], [field]: value } } })

  const addTransaction = () => {
    if (!form.description.trim() || !form.value) { showToast('Preencha descrição e valor'); return }
    updateData({
      transactions: [...data.transactions, { id: Date.now(), ...form, value: parseFloat(form.value) }],
    })
    setForm({ description: '', value: '', category: 'Alimentação', date: today() })
    showToast('Lançamento adicionado!')
  }

  const removeTransaction = (id) =>
    updateData({ transactions: data.transactions.filter(t => t.id !== id) })

  const filtered = useMemo(() => {
    let list = filterCat === 'Todas'
      ? data.transactions
      : data.transactions.filter(t => t.category === filterCat)
    return sortBy === 'data'
      ? [...list].sort((a, b) => b.date.localeCompare(a.date))
      : [...list].sort((a, b) => b.value - a.value)
  }, [data.transactions, filterCat, sortBy])

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
        </div>
        <button className="btn btn-green btn-full" onClick={addTransaction}>+ Lançar</button>
      </div>

      {/* Histórico */}
      <div className="card">
        <div className="history-header">
          <h3 className="history-title">Histórico</h3>
          <div className="sort-pills">
            <button className={`pill ${sortBy === 'data'  ? 'active' : ''}`} onClick={() => setSortBy('data')}>📅 Data</button>
            <button className={`pill ${sortBy === 'valor' ? 'active' : ''}`} onClick={() => setSortBy('valor')}>💰 Valor</button>
          </div>
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
                  <div className="tx-meta">{tx.category} · {tx.date}</div>
                </div>
                <span className="tx-value">-{fmt(tx.value)}</span>
                <button className="remove-btn" onClick={() => removeTransaction(tx.id)}>✕</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
