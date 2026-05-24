import { useState, useMemo } from 'react'
import '../styles/Fixos.css'

const CATEGORIES = [
  { id: 'Moradia',     icon: '🏠', color: '#ffd700' },
  { id: 'Alimentação', icon: '🍽️', color: '#ffa502' },
  { id: 'Transporte',  icon: '🚗', color: '#4a9eff' },
  { id: 'Saúde',       icon: '💊', color: '#ff6b81' },
  { id: 'Lazer',       icon: '🎬', color: '#a78bfa' },
  { id: 'Educação',    icon: '📚', color: '#00f5c8' },
  { id: 'Outros',      icon: '📦', color: '#8888aa' },
]

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Fixos({ data, updateData, showToast }) {
  const [form, setForm] = useState({ name: '', value: '', category: 'Moradia', dueDay: '5' })

  const totalFixed = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const addFixed = () => {
    if (!form.name.trim() || !form.value) { showToast('Preencha nome e valor'); return }
    updateData({
      fixedExpenses: [
        ...data.fixedExpenses,
        { id: Date.now(), ...form, value: parseFloat(form.value), dueDay: parseInt(form.dueDay) || 1 },
      ],
    })
    setForm({ name: '', value: '', category: 'Moradia', dueDay: '5' })
    showToast('Gasto fixo adicionado!')
  }

  const removeFixed = (id) =>
    updateData({ fixedExpenses: data.fixedExpenses.filter(f => f.id !== id) })

  return (
    <div className="fixos-grid">
      {/* Formulário */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Novo Gasto Fixo</h3>
        <div className="form-grid">
          <div>
            <label className="form-label">Nome</label>
            <input
              placeholder="Ex: Aluguel" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addFixed()}
            />
          </div>
          <div>
            <label className="form-label">Valor (R$)</label>
            <input
              type="number" placeholder="0,00" value={form.value}
              onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
              style={{ fontFamily: 'JetBrains Mono', color: '#ff4757' }}
              onKeyDown={e => e.key === 'Enter' && addFixed()}
            />
          </div>
          <div>
            <label className="form-label">Categoria</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Dia de Vencimento</label>
            <input
              type="number" min="1" max="31" placeholder="5" value={form.dueDay}
              onChange={e => setForm(p => ({ ...p, dueDay: e.target.value }))}
              style={{ fontFamily: 'JetBrains Mono' }}
            />
          </div>
        </div>
        <button className="btn btn-green btn-full" onClick={addFixed}>+ Adicionar</button>
      </div>

      {/* Lista */}
      <div className="card">
        <div className="fixos-list-header">
          <h3 className="fixos-list-title">Gastos Fixos Mensais</h3>
          <div className="fixos-total">
            {fmt(totalFixed)}<span className="fixos-total-unit">/mês</span>
          </div>
        </div>

        <div className="fixed-list">
          {data.fixedExpenses.length === 0 && (
            <div className="empty-state">Nenhum gasto fixo cadastrado</div>
          )}
          {data.fixedExpenses.map(f => {
            const cat = CATEGORIES.find(c => c.id === f.category) || CATEGORIES.at(-1)
            return (
              <div key={f.id} className="fixed-item">
                <div
                  className="fixed-item-icon"
                  style={{ background: cat.color + '18', border: `1px solid ${cat.color}30` }}
                >
                  {cat.icon}
                </div>
                <div className="fixed-item-info">
                  <div className="fixed-item-name">{f.name}</div>
                  <div className="fixed-item-meta">Vence dia {f.dueDay} · {f.category}</div>
                </div>
                <span className="fixed-item-value">{fmt(f.value)}</span>
                <button className="remove-btn" onClick={() => removeFixed(f.id)}>✕</button>
              </div>
            )
          })}
        </div>

        {/* Breakdown por categoria */}
        {data.fixedExpenses.length > 0 && (
          <div className="fixos-breakdown">
            <div className="breakdown-grid">
              {CATEGORIES.map(cat => {
                const total = data.fixedExpenses
                  .filter(f => f.category === cat.id)
                  .reduce((s, f) => s + (parseFloat(f.value) || 0), 0)
                if (!total) return null
                return (
                  <div
                    key={cat.id}
                    className="breakdown-item"
                    style={{ background: cat.color + '10', border: `1px solid ${cat.color}20` }}
                  >
                    <div className="breakdown-label">{cat.icon} {cat.id}</div>
                    <div className="breakdown-value" style={{ color: cat.color }}>{fmt(total)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
