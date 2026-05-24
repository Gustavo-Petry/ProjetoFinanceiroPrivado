import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import '../styles/Cofrinhos.css'

const ICONS  = ['🐷', '✈️', '🏠', '🚗', '🎓', '💍', '💻', '🌍', '🏖️', '🎸', '📱', '💰', '🏆', '🎮', '👶', '⭐']
const COLORS = ['#00f5c8', '#c8f500', '#4a9eff', '#ffa502', '#ff6b81', '#a78bfa', '#ffd700', '#ff4757']

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function getLast6Months() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
    }
  })
}

const months       = getLast6Months()
const currentMonth = months[5].key

export default function Cofrinhos({ data, updateData, showToast }) {
  const [form,        setForm]        = useState({ name: '', icon: '🐷', color: '#00f5c8', initialValue: '' })
  const [depositForm, setDepositForm] = useState({})
  const [expanded,    setExpanded]    = useState(null)

  const cofrinhos = data.cofrinhos || []

  const totalGeral = useMemo(() =>
    cofrinhos.reduce((s, c) =>
      s + (c.initialValue || 0) + c.deposits.reduce((ss, d) => ss + d.amount, 0), 0),
    [cofrinhos]
  )

  const totalMes = useMemo(() =>
    cofrinhos.reduce((s, c) =>
      s + c.deposits.filter(d => d.month === currentMonth).reduce((ss, d) => ss + d.amount, 0),
    0), [cofrinhos]
  )

  const addCofrinho = () => {
    if (!form.name.trim()) { showToast('Preencha o nome'); return }
    updateData({
      cofrinhos: [...cofrinhos, {
        id: Date.now(), name: form.name, icon: form.icon, color: form.color,
        initialValue: parseFloat(form.initialValue) || 0,
        deposits: [],
      }],
    })
    setForm({ name: '', icon: '🐷', color: '#00f5c8', initialValue: '' })
    showToast('Cofrinho criado!')
  }

  const removeCofrinho = (id) =>
    updateData({ cofrinhos: cofrinhos.filter(c => c.id !== id) })

  const addDeposit = (cofrinhoId) => {
    const df     = depositForm[cofrinhoId] || {}
    const amount = parseFloat(df.amount)
    if (!amount || amount <= 0) { showToast('Informe um valor válido'); return }
    updateData({
      cofrinhos: cofrinhos.map(c => c.id === cofrinhoId
        ? { ...c, deposits: [...c.deposits, {
            id: Date.now(), amount, note: df.note || '',
            date: new Date().toISOString().split('T')[0], month: currentMonth,
          }]}
        : c
      ),
    })
    setDepositForm(p => ({ ...p, [cofrinhoId]: { amount: '', note: '' } }))
    showToast('Valor guardado!')
  }

  const removeDeposit = (cofrinhoId, depositId) =>
    updateData({
      cofrinhos: cofrinhos.map(c => c.id === cofrinhoId
        ? { ...c, deposits: c.deposits.filter(d => d.id !== depositId) }
        : c
      ),
    })

  return (
    <div className="cofrinhos-grid">

      {/* ── Resumo ── */}
      {cofrinhos.length > 0 && (
        <div className="cofrinhos-summary">
          <div className="cof-summary-card">
            <div className="cof-summary-label">Total Guardado</div>
            <div className="cof-summary-value" style={{ color: '#00f5c8' }}>{fmt(totalGeral)}</div>
          </div>
          <div className="cof-summary-card">
            <div className="cof-summary-label">Guardado este mês</div>
            <div className="cof-summary-value" style={{ color: '#c8f500' }}>{fmt(totalMes)}</div>
          </div>
          <div className="cof-summary-card">
            <div className="cof-summary-label">Cofrinhos ativos</div>
            <div className="cof-summary-value" style={{ color: '#a78bfa' }}>{cofrinhos.length}</div>
          </div>
        </div>
      )}

      {/* ── Lista de cofrinhos ── */}
      {cofrinhos.map(c => {
        const total  = (c.initialValue || 0) + c.deposits.reduce((s, d) => s + d.amount, 0)
        const mesDep = c.deposits.filter(d => d.month === currentMonth).reduce((s, d) => s + d.amount, 0)
        const chartData = months.map(m => ({
          name:     m.label,
          Guardado: c.deposits.filter(d => d.month === m.key).reduce((s, d) => s + d.amount, 0),
        }))
        const df         = depositForm[c.id] || { amount: '', note: '' }
        const isExpanded = expanded === c.id

        return (
          <div key={c.id} className="card cof-card">
            <div className="cof-header" onClick={() => setExpanded(isExpanded ? null : c.id)}>
              <div className="cof-header-left">
                <div className="cof-icon" style={{ background: c.color + '18', border: `1px solid ${c.color}30` }}>
                  {c.icon}
                </div>
                <div>
                  <div className="cof-name">{c.name}</div>
                  <div className="cof-meta">
                    Total:&nbsp;
                    <span style={{ color: c.color, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{fmt(total)}</span>
                    {mesDep > 0 && (
                      <>&nbsp;·&nbsp;Este mês:&nbsp;
                        <span style={{ color: '#c8f500', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{fmt(mesDep)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button className="remove-btn" onClick={e => { e.stopPropagation(); removeCofrinho(c.id) }}>✕</button>
                <span style={{ color: '#8888aa', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="cof-body">

                {/* Gráfico barras últimos 6 meses */}
                <div style={{ marginBottom: 20 }}>
                  <div className="section-title">Últimos 6 meses</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barSize={28}>
                      <XAxis dataKey="name"
                        tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'Syne' }}
                        axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a26', border: '1px solid #ffffff12', borderRadius: 10, fontFamily: 'Syne' }}
                        formatter={v => [fmt(v), 'Guardado']}
                      />
                      <Bar dataKey="Guardado" fill={c.color} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Formulário de depósito */}
                <div style={{ marginBottom: 16 }}>
                  <div className="section-title">Guardar valor</div>
                  <div className="cof-deposit-form">
                    <input
                      type="number" placeholder="Valor (R$)"
                      value={df.amount}
                      onChange={e => setDepositForm(p => ({ ...p, [c.id]: { ...df, amount: e.target.value } }))}
                      onKeyDown={e => e.key === 'Enter' && addDeposit(c.id)}
                      style={{ fontFamily: 'JetBrains Mono', color: c.color }}
                    />
                    <input
                      placeholder="Observação (opcional)"
                      value={df.note}
                      onChange={e => setDepositForm(p => ({ ...p, [c.id]: { ...df, note: e.target.value } }))}
                      onKeyDown={e => e.key === 'Enter' && addDeposit(c.id)}
                    />
                    <button className="btn btn-green cof-deposit-btn" onClick={() => addDeposit(c.id)}>
                      + Guardar
                    </button>
                  </div>
                </div>

                {/* Histórico de depósitos */}
                {(c.deposits.length > 0 || c.initialValue > 0) && (
                  <div>
                    <div className="section-title">Histórico</div>
                    <div className="cof-deposits">
                      {c.initialValue > 0 && (
                        <div className="cof-deposit-item">
                          <div className="cof-deposit-info">
                            <span className="cof-deposit-value" style={{ color: '#8888aa' }}>{fmt(c.initialValue)}</span>
                            <span className="cof-deposit-note">Valor inicial (não descontado)</span>
                          </div>
                          <span className="cof-deposit-date">—</span>
                        </div>
                      )}
                      {[...c.deposits].reverse().map(d => (
                        <div key={d.id} className="cof-deposit-item">
                          <div className="cof-deposit-info">
                            <span className="cof-deposit-value" style={{ color: c.color }}>{fmt(d.amount)}</span>
                            {d.note && <span className="cof-deposit-note">{d.note}</span>}
                          </div>
                          <span className="cof-deposit-date">{d.date}</span>
                          <button className="remove-btn" onClick={() => removeDeposit(c.id, d.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Novo cofrinho ── */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Novo Cofrinho</h3>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Ícone</label>
          <div className="icon-selector">
            {ICONS.map(ic => (
              <button key={ic}
                onClick={() => setForm(p => ({ ...p, icon: ic }))}
                className={`icon-btn ${form.icon === ic ? 'icon-btn--active' : 'icon-btn--inactive'}`}
              >{ic}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Cor</label>
          <div className="cof-color-selector">
            {COLORS.map(col => (
              <button key={col}
                onClick={() => setForm(p => ({ ...p, color: col }))}
                className="cof-color-btn"
                style={{ background: col, outline: form.color === col ? `3px solid ${col}` : 'none', outlineOffset: 3 }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nome</label>
          <input
            placeholder="Ex: Viagem Europa"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addCofrinho()}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Já tinha algum valor guardado? (R$) — opcional</label>
          <input
            type="number"
            placeholder="0,00"
            value={form.initialValue}
            onChange={e => setForm(p => ({ ...p, initialValue: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addCofrinho()}
            style={{ fontFamily: 'JetBrains Mono', color: '#00f5c8' }}
          />
          <div style={{ color: '#8888aa', fontSize: 11, marginTop: 4 }}>
            Este valor não é descontado do salário — apenas registra o que você já tinha.
          </div>
        </div>

        <button className="btn btn-green btn-full" onClick={addCofrinho}>+ Criar Cofrinho</button>
      </div>
    </div>
  )
}
