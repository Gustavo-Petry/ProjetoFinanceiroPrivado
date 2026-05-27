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

function monthsFromNow(toIso) {
  if (!toIso) return 0
  const now = new Date()
  const to  = new Date(toIso + 'T12:00:00')
  return (to.getFullYear() - now.getFullYear()) * 12 + (to.getMonth() - now.getMonth())
}

export default function Cofrinhos({ data, updateData, showToast }) {
  const months       = getLast6Months()
  const currentMonth = months[5].key
  const [form, setForm] = useState({
    name: '', icon: '🐷', color: '#00f5c8', initialValue: '',
    targetValue: '', isGoal: false, targetDate: '', priority: 'primary',
    startNextMonth: true,
  })
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

  // Monthly suggestion preview in the creation form
  const formSuggestion = useMemo(() => {
    if (!form.isGoal || !form.targetDate || !form.targetValue) return null
    const target    = parseFloat(form.targetValue) || 0
    const saved     = parseFloat(form.initialValue) || 0
    const remaining = Math.max(target - saved, 0)
    const rawMonths = Math.max(monthsFromNow(form.targetDate), 0)
    const months    = Math.max(rawMonths - (form.startNextMonth ? 1 : 0), 0)
    if (months <= 0 || remaining <= 0) return null
    return { monthly: remaining / months, months, remaining }
  }, [form.isGoal, form.targetDate, form.targetValue, form.initialValue, form.startNextMonth])

  const addCofrinho = () => {
    if (!form.name.trim()) { showToast('Preencha o nome'); return }
    if (form.isGoal && !form.targetDate) { showToast('Defina a data alvo para o objetivo'); return }
    updateData({
      cofrinhos: [...cofrinhos, {
        id: Date.now(), name: form.name, icon: form.icon, color: form.color,
        initialValue:    parseFloat(form.initialValue) || 0,
        targetValue:     parseFloat(form.targetValue)  || 0,
        isGoal:          form.isGoal,
        targetDate:      form.isGoal ? form.targetDate    : '',
        priority:        form.isGoal ? form.priority      : 'primary',
        startNextMonth:  form.isGoal ? form.startNextMonth : false,
        deposits: [],
      }],
    })
    setForm({ name: '', icon: '🐷', color: '#00f5c8', initialValue: '', targetValue: '', isGoal: false, targetDate: '', priority: 'primary', startNextMonth: true })
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

  const today = new Date().toISOString().split('T')[0]

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
        const total    = (c.initialValue || 0) + c.deposits.reduce((s, d) => s + d.amount, 0)
        const mesDep   = c.deposits.filter(d => d.month === currentMonth).reduce((s, d) => s + d.amount, 0)
        const target   = parseFloat(c.targetValue) || 0
        const pct      = target > 0 ? Math.min((total / target) * 100, 100) : null
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
                  <div className="cof-name">
                    {c.name}
                    {c.isGoal && <span className="cof-goal-badge">🎯 Objetivo</span>}
                  </div>
                  <div className="cof-meta">
                    Total:&nbsp;
                    <span style={{ color: c.color, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{fmt(total)}</span>
                    {target > 0 && (
                      <>&nbsp;·&nbsp;
                        <span style={{ color: '#8888aa' }}>{pct != null ? `${pct.toFixed(0)}% da meta` : ''}</span>
                      </>
                    )}
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

            {/* Progress bar (when target set) */}
            {target > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="progress-bar">
                  <div style={{
                    background: pct >= 100 ? '#c8f500' : c.color,
                    height: '100%', borderRadius: 10,
                    width: `${pct}%`, transition: 'width 0.5s',
                  }} />
                </div>
                <div className="cof-target-meta">
                  <span>{fmt(total)} de {fmt(target)}</span>
                  <span style={{ color: pct >= 100 ? '#c8f500' : c.color }}>{pct != null ? `${pct.toFixed(0)}%` : ''}</span>
                </div>
              </div>
            )}

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

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Meta de valor (R$) — opcional</label>
          <input
            type="number"
            placeholder="0,00"
            value={form.targetValue}
            onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))}
            style={{ fontFamily: 'JetBrains Mono', color: '#ffa502' }}
          />
          <div style={{ color: '#8888aa', fontSize: 11, marginTop: 4 }}>
            Quando definida, mostra barra de progresso no cofrinho.
          </div>
        </div>

        {/* É um objetivo? */}
        <div style={{ marginBottom: 14 }}>
          <div
            className="benefit-label"
            onClick={() => setForm(p => ({ ...p, isGoal: !p.isGoal }))}
            style={{ marginBottom: form.isGoal ? 12 : 0 }}
          >
            <div
              className={`custom-checkbox${form.isGoal ? ' custom-checkbox--checked' : ''}`}
              style={form.isGoal ? { background: '#a78bfa', borderColor: '#a78bfa' } : {}}
            >
              {form.isGoal && '✓'}
            </div>
            <span style={{ color: form.isGoal ? '#a78bfa' : '#8888aa', fontWeight: form.isGoal ? 700 : 400 }}>
              🎯 É um objetivo? (aparece na aba Objetivos)
            </span>
          </div>

          {form.isGoal && (
            <div className="cof-goal-fields">
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Prioridade</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`pill ${form.priority === 'primary' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, priority: 'primary' }))}
                  >🥇 Principal</button>
                  <button
                    className={`pill ${form.priority === 'secondary' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, priority: 'secondary' }))}
                  >🥈 Secundário</button>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Começa a guardar em</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className={`pill ${!form.startNextMonth ? 'active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, startNextMonth: false }))}
                  >📅 Este mês</button>
                  <button
                    className={`pill ${form.startNextMonth ? 'active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, startNextMonth: true }))}
                  >⏭️ Próximo mês</button>
                </div>
                <div style={{ color: '#8888aa', fontSize: 11, marginTop: 5 }}>
                  {form.startNextMonth
                    ? 'O planejamento começa no próximo mês — este mês não entra na conta.'
                    : 'O valor sugerido já começa a contar a partir deste mês.'}
                </div>
              </div>

              <div>
                <label className="form-label">Quero alcançar até (obrigatório)</label>
                <input
                  type="date" value={form.targetDate} min={today}
                  onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
                />
              </div>

              {formSuggestion && (
                <div className="cof-suggestion-box">
                  <div className="cof-suggestion-title">Sugestão mensal para atingir a meta</div>
                  <div className="cof-suggestion-row">
                    <div>
                      <div className="cof-suggestion-label">Por mês</div>
                      <div className="cof-suggestion-value" style={{ color: '#c8f500' }}>{fmt(formSuggestion.monthly)}</div>
                    </div>
                    <div>
                      <div className="cof-suggestion-label">Meses</div>
                      <div className="cof-suggestion-value" style={{ color: '#00f5c8' }}>{formSuggestion.months}</div>
                    </div>
                    <div>
                      <div className="cof-suggestion-label">Faltam</div>
                      <div className="cof-suggestion-value" style={{ color: '#ffa502' }}>{fmt(formSuggestion.remaining)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-green btn-full" onClick={addCofrinho}>+ Criar Cofrinho</button>
      </div>
    </div>
  )
}
