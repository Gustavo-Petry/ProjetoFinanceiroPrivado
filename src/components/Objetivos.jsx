import { useState, useMemo } from 'react'
import '../styles/Objetivos.css'

const ICONS = ['🎯', '🏠', '✈️', '🚗', '🎓', '💍', '💻', '🌍', '🏖️', '🎸', '📱', '💰', '🛒', '🎮', '🐕', '👶']

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function fmtDate(iso) {
  if (!iso) return '–'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function monthsFromNow(toIso) {
  if (!toIso) return 0
  const now = new Date()
  const to  = new Date(toIso + 'T12:00:00')
  return (to.getFullYear() - now.getFullYear()) * 12 + (to.getMonth() - now.getMonth())
}

function projectedDate(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(months))
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function Objetivos({ data, updateData, showToast }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    icon: '🎯', name: '', priority: 'primary',
    targetValue: '', currentSaved: '', targetDate: '',
  })

  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const totalFixos = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const now          = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const depositosCofrinhos = useMemo(() =>
    (data.cofrinhos || []).reduce((s, c) =>
      s + c.deposits.filter(d => d.month === currentMonth).reduce((ss, d) => ss + d.amount, 0),
    0), [data.cofrinhos, currentMonth]
  )

  const goals      = data.goals || []
  const disponivel = totalRenda - totalFixos - depositosCofrinhos

  // ── Compute ideal monthly for each goal based on target date ──
  const goalsCalc = useMemo(() => goals.map(g => {
    const target    = parseFloat(g.targetValue)  || 0
    const saved     = parseFloat(g.currentSaved) || 0
    const remaining = Math.max(target - saved, 0)
    const achieved  = remaining <= 0
    const months    = Math.max(monthsFromNow(g.targetDate), 0)
    const idealMonthly = (!achieved && months > 0) ? remaining / months : 0
    return { ...g, target, saved, remaining, achieved, idealMonths: months, idealMonthly }
  }), [goals])

  const totalIdeal  = goalsCalc.reduce((s, g) => s + g.idealMonthly, 0)
  const hasConflict = totalIdeal > disponivel && disponivel > 0 && goals.length > 0
  const ratio       = hasConflict ? disponivel / totalIdeal : 1

  const goalsWithAdj = goalsCalc.map(g => {
    const adjMonthly = g.idealMonthly * ratio
    const adjMonths  = adjMonthly > 0 ? Math.ceil(g.remaining / adjMonthly) : null
    const delayMonths = (hasConflict && adjMonths != null && g.idealMonths > 0)
      ? Math.max(adjMonths - g.idealMonths, 0)
      : 0
    return { ...g, adjMonthly, adjMonths, delayMonths }
  })

  const totalGuardando = goalsWithAdj.reduce((s, g) => s + (g.achieved ? 0 : g.adjMonthly), 0)
  const sobra          = disponivel - totalGuardando

  const pctFixos     = totalRenda > 0 ? Math.min((totalFixos / totalRenda) * 100, 100) : 0
  const pctCofrinhos = totalRenda > 0 ? Math.min((depositosCofrinhos / totalRenda) * 100, 100 - pctFixos) : 0
  const pctGoals     = totalRenda > 0 ? Math.min((totalGuardando / totalRenda) * 100, 100 - pctFixos - pctCofrinhos) : 0
  const pctSobra     = Math.max(0, 100 - pctFixos - pctCofrinhos - pctGoals)

  // ── CRUD ──
  const addGoal = () => {
    if (!form.name.trim())         { showToast('Preencha o nome'); return }
    if (!form.targetValue)         { showToast('Preencha o valor da meta'); return }
    if (!form.targetDate)          { showToast('Defina a data alvo'); return }
    if (form.targetDate <= today)  { showToast('A data alvo deve ser no futuro'); return }
    updateData({
      goals: [...goals, {
        id:           Date.now(),
        icon:         form.icon,
        name:         form.name,
        priority:     form.priority,
        targetValue:  parseFloat(form.targetValue)  || 0,
        currentSaved: parseFloat(form.currentSaved) || 0,
        targetDate:   form.targetDate,
      }],
    })
    setForm({ icon: '🎯', name: '', priority: 'primary', targetValue: '', currentSaved: '', targetDate: '' })
    showToast('Objetivo adicionado!')
  }

  const removeGoal   = (id) => updateData({ goals: goals.filter(g => g.id !== id) })
  const updateSaved  = (id, value) =>
    updateData({ goals: goals.map(g => g.id === id ? { ...g, currentSaved: parseFloat(value) || 0 } : g) })

  const primary   = goalsWithAdj.filter(g => g.priority === 'primary')
  const secondary = goalsWithAdj.filter(g => g.priority === 'secondary')

  // ── Form preview ──
  const formPreview = (() => {
    if (!form.targetDate || !form.targetValue) return null
    const t         = parseFloat(form.targetValue)  || 0
    const s         = parseFloat(form.currentSaved) || 0
    const remaining = Math.max(t - s, 0)
    const months    = monthsFromNow(form.targetDate)
    if (months <= 0 || remaining <= 0) return null
    return { months, monthly: remaining / months, remaining }
  })()

  return (
    <div className="objetivos-grid">

      {/* ── Resumo de planejamento ── */}
      <div className="card">
        <div className="section-title">Planejamento Mensal</div>

        <div className="obj-summary-row">
          <SCard label="Renda Total"    value={fmt(totalRenda)}            color="#c8f500" />
          <SCard label="Gastos Fixos"  value={`-${fmt(totalFixos)}`}     color="#ff4757" />
          <SCard label="Cofrinhos/mês" value={`-${fmt(depositosCofrinhos)}`} color="#00f5c8" />
          <SCard label="Disponível"    value={fmt(disponivel)}            color={disponivel >= 0 ? '#ffa502' : '#ff4757'} />
          <SCard label="Guardando/mês" value={fmt(totalGuardando)}        color="#a78bfa" />
          <SCard label="Sobra Livre"   value={fmt(sobra)}                 color={sobra >= 0 ? '#c8f500' : '#ff4757'} />
        </div>

        {totalRenda > 0 && (
          <>
            <div className="obj-planning-bar">
              <div className="obj-bar-segment obj-bar-fixos"     style={{ width: `${pctFixos}%` }} />
              <div className="obj-bar-segment"                   style={{ width: `${pctCofrinhos}%`, background: '#00f5c8' }} />
              <div className="obj-bar-segment obj-bar-goals"     style={{ width: `${pctGoals}%` }} />
              <div className="obj-bar-segment obj-bar-sobra"     style={{ width: `${pctSobra}%` }} />
            </div>
            <div className="obj-bar-legend">
              <span><span className="obj-legend-dot" style={{ background: '#ff4757' }} />Fixos {pctFixos.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#00f5c8' }} />Cofrinhos {pctCofrinhos.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#a78bfa' }} />Objetivos {pctGoals.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#c8f500' }} />Livre {pctSobra.toFixed(0)}%</span>
            </div>
          </>
        )}

        {hasConflict && (
          <div className="obj-alert" style={{ marginTop: 16 }}>
            ⚠️ Seus objetivos precisam de {fmt(totalIdeal)}/mês mas você tem {fmt(disponivel)} disponível.
            Os valores foram reduzidos proporcionalmente — alguns objetivos vão atrasar.
          </div>
        )}

        {!hasConflict && sobra < 0 && goals.length > 0 && (
          <div className="obj-alert" style={{ marginTop: 16 }}>
            ⚠️ Sua renda não cobre os gastos fixos — reavalie seus objetivos.
          </div>
        )}
      </div>

      {/* ── Lista de objetivos ── */}
      {goals.length > 0 && (
        <div className="objetivos-list">
          {primary.length > 0 && (
            <>
              <div className="obj-section-label">🥇 Principal</div>
              {primary.map(g => (
                <GoalCard key={g.id} goal={g} onRemove={removeGoal} onUpdateSaved={updateSaved} />
              ))}
            </>
          )}
          {secondary.length > 0 && (
            <>
              <div className="obj-section-label">🥈 Secundário</div>
              {secondary.map(g => (
                <GoalCard key={g.id} goal={g} onRemove={removeGoal} onUpdateSaved={updateSaved} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Formulário novo objetivo ── */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Novo Objetivo</h3>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Ícone</label>
          <div className="icon-selector" style={{ flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button key={ic}
                onClick={() => setForm(p => ({ ...p, icon: ic }))}
                className={`icon-btn ${form.icon === ic ? 'icon-btn--active' : 'icon-btn--inactive'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Prioridade</label>
          <div className="priority-pills">
            <button className={`pill ${form.priority === 'primary'   ? 'active' : ''}`}
              onClick={() => setForm(p => ({ ...p, priority: 'primary' }))}>🥇 Principal</button>
            <button className={`pill ${form.priority === 'secondary' ? 'active' : ''}`}
              onClick={() => setForm(p => ({ ...p, priority: 'secondary' }))}>🥈 Secundário</button>
          </div>
        </div>

        <div className="form-grid">
          <div>
            <label className="form-label">Nome do Objetivo</label>
            <input placeholder="Ex: Entrada da casa" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addGoal()} />
          </div>
          <div>
            <label className="form-label">Valor da Meta (R$)</label>
            <input type="number" placeholder="0,00" value={form.targetValue}
              onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))}
              style={{ fontFamily: 'JetBrains Mono', color: '#c8f500' }} />
          </div>
          <div>
            <label className="form-label">Já guardei (R$) — opcional</label>
            <input type="number" placeholder="0,00" value={form.currentSaved}
              onChange={e => setForm(p => ({ ...p, currentSaved: e.target.value }))}
              style={{ fontFamily: 'JetBrains Mono', color: '#ffa502' }} />
          </div>
          <div>
            <label className="form-label">Quero alcançar até</label>
            <input type="date" value={form.targetDate} min={today}
              onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} />
          </div>
        </div>

        {formPreview && (
          <div className="preview-box" style={{ marginBottom: 14 }}>
            <div className="preview-box-title">Quanto preciso guardar</div>
            <div className="preview-cells" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <PCell label="Por mês"  value={fmt(formPreview.monthly)}  color="#c8f500" />
              <PCell label="Meses"    value={formPreview.months}         color="#00f5c8" />
              <PCell label="Faltam"   value={fmt(formPreview.remaining)} color="#ffa502" />
            </div>
          </div>
        )}

        <button className="btn btn-green btn-full" onClick={addGoal}>+ Adicionar Objetivo</button>
      </div>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function SCard({ label, value, color }) {
  return (
    <div className="obj-summary-card">
      <div className="obj-summary-label">{label}</div>
      <div className="obj-summary-value" style={{ color }}>{value}</div>
    </div>
  )
}

function GoalCard({ goal, onRemove, onUpdateSaved }) {
  const [editSaved, setEditSaved] = useState(String(goal.currentSaved || ''))

  const pct       = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0
  const isPrimary = goal.priority === 'primary'
  const color     = isPrimary ? '#c8f500' : '#00f5c8'

  return (
    <div className={`card obj-goal-card ${isPrimary ? 'obj-goal-primary' : 'obj-goal-secondary'}`}>
      <div className="obj-goal-header">
        <div className="obj-goal-left">
          <span className="obj-goal-icon">{goal.icon}</span>
          <div>
            <div className="obj-goal-name">{goal.name}</div>
            <div className="obj-goal-meta">
              Meta: {fmt(goal.target)} · Prazo: {fmtDate(goal.targetDate)}
            </div>
          </div>
        </div>

        <div className="obj-goal-right">
          {goal.achieved ? (
            <div style={{ color: '#c8f500', fontSize: 14, fontWeight: 700 }}>✓ Meta atingida!</div>
          ) : !goal.targetDate ? (
            <div className="obj-goal-reach">Defina uma data alvo</div>
          ) : goal.idealMonths <= 0 ? (
            <div style={{ color: '#ff4757', fontSize: 12 }}>⚠️ Data já passou</div>
          ) : (
            <>
              <div className="obj-goal-monthly" style={{ color }}>
                {fmt(goal.adjMonthly)}<span className="obj-goal-monthly-unit">/mês</span>
              </div>
              {goal.delayMonths > 0 ? (
                <div className="obj-conflict-tag">
                  ⚠️ Vai atrasar {goal.delayMonths} {goal.delayMonths === 1 ? 'mês' : 'meses'}
                  {goal.adjMonths != null && ` → ${projectedDate(goal.adjMonths)}`}
                </div>
              ) : (
                goal.adjMonths != null && (
                  <div className="obj-goal-reach">
                    {goal.adjMonths} {goal.adjMonths === 1 ? 'mês' : 'meses'} → {projectedDate(goal.adjMonths)}
                  </div>
                )
              )}
              {goal.delayMonths === 0 && goal.idealMonthly > 0 && goal.adjMonthly < goal.idealMonthly && (
                <div className="obj-goal-reach" style={{ color: '#c8f500' }}>✓ No prazo</div>
              )}
            </>
          )}
        </div>

        <button className="remove-btn" onClick={() => onRemove(goal.id)}>✕</button>
      </div>

      {goal.target > 0 && (
        <>
          <div className="obj-progress-header">
            <span>{fmt(goal.saved)} guardado</span>
            <span style={{ fontFamily: 'JetBrains Mono', color }}>{pct.toFixed(0)}%</span>
          </div>
          <div className="progress-bar">
            <div style={{ background: color, height: '100%', borderRadius: 10, width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
          <div className="obj-progress-remain">faltam {fmt(goal.remaining)}</div>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <label className="form-label">Já guardei (R$)</label>
        <input type="number" value={editSaved}
          onChange={e => setEditSaved(e.target.value)}
          onBlur={() => onUpdateSaved(goal.id, editSaved)}
          style={{ fontFamily: 'JetBrains Mono', color: '#ffa502', fontSize: 13 }} />
      </div>
    </div>
  )
}

function PCell({ label, value, color }) {
  return (
    <div className="preview-cell">
      <div className="preview-cell-label">{label}</div>
      <div className="preview-cell-value" style={{ color, fontSize: 11 }}>{value}</div>
    </div>
  )
}
