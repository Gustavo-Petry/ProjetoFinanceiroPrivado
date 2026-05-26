import { useState, useMemo } from 'react'
import '../styles/Objetivos.css'

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

const _now = new Date()
const currentMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`

export default function Objetivos({ data, updateData, showToast }) {
  // Apenas salário + benefícios livres contam para objetivos
  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled && b.free ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const totalFixos = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const depositosCofrinhos = useMemo(() =>
    (data.cofrinhos || []).reduce((s, c) =>
      s + c.deposits.filter(d => d.month === currentMonth).reduce((ss, d) => ss + d.amount, 0),
    0), [data.cofrinhos]
  )

  // Transações do mês atual (para calcular o usado por fonte)
  const monthTx = useMemo(() =>
    data.transactions.filter(t => t.date?.startsWith(currentMonth)),
    [data.transactions]
  )

  // Depósitos em cofrinhos no mês atual (com paidFrom)
  const allCurrentDeposits = useMemo(() =>
    (data.cofrinhos || []).flatMap(c =>
      c.deposits.filter(d => d.month === currentMonth && d.paidFrom)
    ), [data.cofrinhos]
  )

  // Fontes livres: salário + benefícios com free:true
  const freeSources = useMemo(() => {
    const sources = []
    if (data.salary) {
      const usedTx  = monthTx.filter(t => t.paidFrom === 'salary').reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
      const usedDep = allCurrentDeposits.filter(d => d.paidFrom === 'salary').reduce((s, d) => s + d.amount, 0)
      const total   = parseFloat(data.salary) || 0
      sources.push({ key: 'salary', label: 'Salário', icon: '💵', color: '#c8f500', total, remaining: total - usedTx - usedDep })
    }
    Object.entries(data.benefits).forEach(([key, b]) => {
      if (!b.enabled || !b.value || !b.free) return
      const usedTx  = monthTx.filter(t => t.paidFrom === key).reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
      const usedDep = allCurrentDeposits.filter(d => d.paidFrom === key).reduce((s, d) => s + d.amount, 0)
      const total   = parseFloat(b.value) || 0
      sources.push({ key, label: b.label, icon: b.icon, color: b.color, total, remaining: total - usedTx - usedDep })
    })
    return sources
  }, [data.salary, data.benefits, monthTx, allCurrentDeposits])

  const goals = useMemo(() =>
    (data.cofrinhos || []).filter(c => c.isGoal),
    [data.cofrinhos]
  )

  const disponivel = totalRenda - totalFixos - depositosCofrinhos

  const goalsCalc = useMemo(() => goals.map(g => {
    const saved     = (g.initialValue || 0) + g.deposits.reduce((s, d) => s + d.amount, 0)
    const target    = parseFloat(g.targetValue) || 0
    const remaining = Math.max(target - saved, 0)
    const achieved  = target > 0 && remaining <= 0
    const months    = Math.max(monthsFromNow(g.targetDate), 0)
    const idealMonthly = (!achieved && months > 0) ? remaining / months : 0
    return { ...g, target, saved, remaining, achieved, idealMonths: months, idealMonthly }
  }), [goals])

  const totalIdeal  = goalsCalc.reduce((s, g) => s + g.idealMonthly, 0)
  const hasConflict = totalIdeal > disponivel && disponivel > 0 && goals.length > 0
  const ratio       = hasConflict ? disponivel / totalIdeal : 1

  const goalsWithAdj = goalsCalc.map(g => {
    const adjMonthly  = g.idealMonthly * ratio
    const adjMonths   = adjMonthly > 0 ? Math.ceil(g.remaining / adjMonthly) : null
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

  const updateCofrinho = (id, changes) =>
    updateData({
      cofrinhos: (data.cofrinhos || []).map(c => c.id === id ? { ...c, ...changes } : c),
    })

  const addGoalDeposit = (cofrinhoId, amount, note, paidFrom) => {
    if (!amount || amount <= 0) { showToast('Informe um valor válido'); return }
    updateData({
      cofrinhos: (data.cofrinhos || []).map(c => c.id === cofrinhoId
        ? { ...c, deposits: [...c.deposits, {
            id: Date.now(), amount, note: note || '',
            date: new Date().toISOString().split('T')[0],
            month: currentMonth,
            paidFrom: paidFrom || 'salary',
          }]}
        : c
      ),
    })
    showToast('Valor guardado!')
  }

  const removeFromGoals = (id) => updateCofrinho(id, { isGoal: false })

  const primary   = goalsWithAdj.filter(g => g.priority === 'primary')
  const secondary = goalsWithAdj.filter(g => g.priority === 'secondary')

  return (
    <div className="objetivos-grid">

      {/* ── Resumo de planejamento ── */}
      <div className="card">
        <div className="section-title">Planejamento Mensal</div>

        <div className="obj-summary-row">
          <SCard label="Renda Livre"   value={fmt(totalRenda)}                color="#c8f500" />
          <SCard label="Gastos Fixos"  value={`-${fmt(totalFixos)}`}          color="#ff4757" />
          <SCard label="Cofrinhos/mês" value={fmt(depositosCofrinhos)}        color="#00f5c8" />
          <SCard label="Disponível"    value={fmt(disponivel)}                color={disponivel >= 0 ? '#ffa502' : '#ff4757'} />
          <SCard label="Sugestão/mês"  value={fmt(totalGuardando)}            color="#a78bfa" />
          <SCard label="Sobra Livre"   value={fmt(sobra)}                     color={sobra >= 0 ? '#c8f500' : '#ff4757'} />
        </div>

        {totalRenda > 0 && (
          <>
            <div className="obj-planning-bar">
              <div className="obj-bar-segment obj-bar-fixos"    style={{ width: `${pctFixos}%` }} />
              <div className="obj-bar-segment"                  style={{ width: `${pctCofrinhos}%`, background: '#00f5c8' }} />
              <div className="obj-bar-segment obj-bar-goals"    style={{ width: `${pctGoals}%` }} />
              <div className="obj-bar-segment obj-bar-sobra"    style={{ width: `${pctSobra}%` }} />
            </div>
            <div className="obj-bar-legend">
              <span><span className="obj-legend-dot" style={{ background: '#ff4757' }} />Fixos {pctFixos.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#00f5c8' }} />Cofrinhos {pctCofrinhos.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#a78bfa' }} />Metas {pctGoals.toFixed(0)}%</span>
              <span><span className="obj-legend-dot" style={{ background: '#c8f500' }} />Livre {pctSobra.toFixed(0)}%</span>
            </div>
          </>
        )}

        {/* Disponível por fonte */}
        {freeSources.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="obj-sources-label">Disponível por fonte (livre)</div>
            <div className="obj-sources-grid">
              {freeSources.map(src => {
                const used = src.total - src.remaining
                const pct  = src.total > 0 ? Math.min((used / src.total) * 100, 100) : 0
                return (
                  <div key={src.key} className="obj-source-card" style={{ borderColor: src.color + '30' }}>
                    <div className="obj-source-header">
                      <span>{src.icon}</span>
                      <span className="obj-source-name" style={{ color: src.color }}>{src.label}</span>
                    </div>
                    <div className="obj-source-remaining" style={{ color: src.remaining >= 0 ? src.color : '#ff4757' }}>
                      {fmt(src.remaining)}
                    </div>
                    <div className="obj-source-total">de {fmt(src.total)}</div>
                    <div className="progress-bar" style={{ marginTop: 6 }}>
                      <div style={{
                        background: src.remaining <= 0 ? '#ff4757' : src.color,
                        height: '100%', borderRadius: 10,
                        width: `${pct}%`, transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {hasConflict && (
          <div className="obj-alert" style={{ marginTop: 16 }}>
            ⚠️ Suas metas precisam de {fmt(totalIdeal)}/mês mas você tem {fmt(disponivel)} disponível.
            Os valores foram ajustados proporcionalmente — algumas metas vão atrasar.
          </div>
        )}

        {!hasConflict && sobra < 0 && goals.length > 0 && (
          <div className="obj-alert" style={{ marginTop: 16 }}>
            ⚠️ Sua renda não cobre os gastos fixos — reavalie suas metas.
          </div>
        )}
      </div>

      {/* ── Lista de objetivos ── */}
      {goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>
            Você não tem objetivos cadastrados.<br />
            Crie um cofrinho na aba <strong style={{ color: '#c8f500' }}>Cofrinhos</strong> e marque a opção
            <strong style={{ color: '#a78bfa' }}> "É um objetivo?"</strong>.
          </div>
        </div>
      ) : (
        <div className="objetivos-list">
          {primary.length > 0 && (
            <>
              <div className="obj-section-label">🥇 Principal</div>
              {primary.map(g => (
                <GoalCard
                  key={g.id} goal={g}
                  freeSources={freeSources}
                  onDeposit={addGoalDeposit}
                  onUpdate={updateCofrinho}
                  onRemove={removeFromGoals}
                />
              ))}
            </>
          )}
          {secondary.length > 0 && (
            <>
              <div className="obj-section-label">🥈 Secundário</div>
              {secondary.map(g => (
                <GoalCard
                  key={g.id} goal={g}
                  freeSources={freeSources}
                  onDeposit={addGoalDeposit}
                  onUpdate={updateCofrinho}
                  onRemove={removeFromGoals}
                />
              ))}
            </>
          )}
        </div>
      )}

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

function GoalCard({ goal, onDeposit, onUpdate, onRemove, freeSources }) {
  const [depAmount,   setDepAmount]   = useState('')
  const [depNote,     setDepNote]     = useState('')
  const [depPaidFrom, setDepPaidFrom] = useState(freeSources[0]?.key || 'salary')
  const [editing,     setEditing]     = useState(false)
  const [editTarget,  setEditTarget]  = useState(String(goal.targetValue || ''))
  const [editDate,    setEditDate]    = useState(goal.targetDate || '')

  const pct       = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0
  const isPrimary = goal.priority === 'primary'
  const color     = isPrimary ? '#c8f500' : '#00f5c8'

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  const handleDeposit = () => {
    const amount = parseFloat(depAmount)
    onDeposit(goal.id, amount, depNote, depPaidFrom)
    setDepAmount('')
    setDepNote('')
  }

  const saveEdit = () => {
    onUpdate(goal.id, {
      targetValue: parseFloat(editTarget) || 0,
      targetDate:  editDate,
    })
    setEditing(false)
  }

  const selectedSource = freeSources.find(s => s.key === depPaidFrom)

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
            </>
          )}
        </div>

        <button className="remove-btn" onClick={() => onRemove(goal.id)} title="Remover dos objetivos (mantém o cofrinho)">✕</button>
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

      {/* Guardar valor */}
      <div style={{ marginTop: 14 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Guardar valor</div>

        {freeSources.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <label className="form-label">Debitar de</label>
            <select value={depPaidFrom} onChange={e => setDepPaidFrom(e.target.value)}>
              {freeSources.map(s => (
                <option key={s.key} value={s.key}>
                  {s.icon} {s.label} — {fmt(Math.max(s.remaining, 0))} disponível
                </option>
              ))}
            </select>
            {selectedSource && selectedSource.remaining <= 0 && (
              <div style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>
                ⚠️ Saldo esgotado nesta fonte
              </div>
            )}
          </div>
        )}

        <div className="obj-deposit-row">
          <input
            type="number" placeholder="Valor (R$)"
            value={depAmount}
            onChange={e => setDepAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDeposit()}
            style={{ fontFamily: 'JetBrains Mono', color }}
          />
          <input
            placeholder="Observação (opcional)"
            value={depNote}
            onChange={e => setDepNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDeposit()}
          />
          <button className="btn btn-green" onClick={handleDeposit}>+ Guardar</button>
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {goal.adjMonthly > 0 && !goal.achieved && freeSources.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '5px 12px', color: '#a78bfa', borderColor: '#a78bfa40' }}
            onClick={() => onDeposit(goal.id, goal.adjMonthly, 'Depósito previsto', depPaidFrom)}
          >
            ⚡ Lançar previsto ({fmt(goal.adjMonthly)})
          </button>
        )}
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => setEditing(p => !p)}
        >
          {editing ? '▲ Fechar edição' : '✎ Editar meta & data'}
        </button>
      </div>
      {editing && (
        <div className="obj-edit-row">
          <div>
            <label className="form-label">Valor da meta (R$)</label>
            <input
              type="number" placeholder="0,00"
              value={editTarget}
              onChange={e => setEditTarget(e.target.value)}
              style={{ fontFamily: 'JetBrains Mono', color: '#c8f500' }}
            />
          </div>
          <div>
            <label className="form-label">Prazo</label>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-green btn-full" onClick={saveEdit}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  )
}
