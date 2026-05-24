import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import '../styles/Graficos.css'

const CATEGORY_COLORS = {
  Alimentação: '#ffa502',
  Transporte:  '#4a9eff',
  Saúde:       '#ff6b81',
  Lazer:       '#a78bfa',
  Moradia:     '#ffd700',
  Educação:    '#00f5c8',
  Outros:      '#8888aa',
}

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a26', border: '1px solid #ffffff12',
    borderRadius: 10, fontFamily: 'Syne',
  },
  labelStyle: { color: '#8888aa' },
}

const legendFormatter = (v) => <span style={{ color: '#f0f0f8', fontFamily: 'Syne' }}>{v}</span>

const CHART_TYPES = [
  { id: 'area',    icon: '📈', label: 'Área'    },
  { id: 'barras',  icon: '📊', label: 'Barras'  },
  { id: 'pizza',   icon: '🥧', label: 'Pizza'   },
  { id: 'linha',   icon: '📉', label: 'Linha'   },
  { id: 'ranking', icon: '🏷️', label: 'Ranking' },
]

export default function Graficos({ data }) {
  const [activeCharts, setActiveCharts] = useState(['area', 'pizza'])

  const toggleChart = (id) =>
    setActiveCharts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const totalRenda = useMemo(() => {
    const sal = parseFloat(data.salary) || 0
    const ben = Object.values(data.benefits).reduce(
      (s, b) => s + (b.enabled ? (parseFloat(b.value) || 0) : 0), 0
    )
    return sal + ben
  }, [data.salary, data.benefits])

  const fixedTotal = useMemo(() =>
    data.fixedExpenses.reduce((s, f) => s + (parseFloat(f.value) || 0), 0),
    [data.fixedExpenses]
  )

  const monthlyData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const varG = data.transactions
        .filter(t => t.date?.startsWith(key))
        .reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
      return {
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        Renda: totalRenda,
        Gastos: varG + fixedTotal,
      }
    }),
    [data.transactions, totalRenda, fixedTotal]
  )

  const pieData = useMemo(() => {
    const cats = {}
    data.transactions
      .filter(t => t.date?.startsWith(currentMonth))
      .forEach(t => { cats[t.category] = (cats[t.category] || 0) + (parseFloat(t.value) || 0) })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [data.transactions, currentMonth])

  const rankingData = useMemo(() => {
    const cats = {}
    data.transactions.forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + (parseFloat(t.value) || 0)
    })
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data.transactions])

  const maxRanking = rankingData[0]?.value || 1

  const axisProps = {
    tick: { fill: '#8888aa', fontSize: 11, fontFamily: 'Syne' },
    axisLine: false,
    tickLine: false,
  }
  const yAxisProps = {
    ...axisProps,
    tick: { fill: '#8888aa', fontSize: 11, fontFamily: 'JetBrains Mono' },
    tickFormatter: v => `${(v / 1000).toFixed(0)}k`,
  }

  return (
    <div className="graficos-grid">
      {/* Seletor */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Gráficos</h3>
        <div className="chart-selector-pills">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              className={`pill ${activeCharts.includes(ct.id) ? 'active' : ''}`}
              onClick={() => toggleChart(ct.id)}
            >
              {ct.icon} {ct.label}
            </button>
          ))}
        </div>
        <div className="chart-selector-hint">Clique nos pills para ativar/desativar</div>
      </div>

      {/* Área */}
      {activeCharts.includes('area') && (
        <div className="card">
          <h3 className="chart-card-title">📈 Renda vs Gastos — 6 meses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c8f500" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c8f500" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff4757" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff4757" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
              <Legend formatter={legendFormatter} />
              <Area type="monotone" dataKey="Renda"  stroke="#c8f500" fill="url(#gR)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="Gastos" stroke="#ff4757" fill="url(#gG)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Barras */}
      {activeCharts.includes('barras') && (
        <div className="card">
          <h3 className="chart-card-title">📊 Comparativo Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
              <Legend formatter={legendFormatter} />
              <Bar dataKey="Renda"  fill="#c8f500" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ff4757" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Linha */}
      {activeCharts.includes('linha') && (
        <div className="card">
          <h3 className="chart-card-title">📉 Tendência</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
              <Legend formatter={legendFormatter} />
              <Line type="monotone" dataKey="Renda"  stroke="#c8f500" strokeWidth={2.5}
                dot={{ fill: '#c8f500', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="Gastos" stroke="#ff4757" strokeWidth={2.5}
                dot={{ fill: '#ff4757', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pizza */}
      {activeCharts.includes('pizza') && (
        <div className="card">
          <h3 className="chart-card-title">🥧 Distribuição por Categoria (mês atual)</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  outerRadius={120} innerRadius={50} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map(e => <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || '#8888aa'} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={v => [fmt(v), 'Gasto']} />
                <Legend formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">Sem gastos lançados este mês</div>
          )}
        </div>
      )}

      {/* Ranking */}
      {activeCharts.includes('ranking') && (
        <div className="card">
          <h3 className="chart-card-title">🏷️ Ranking por Categoria</h3>
          {rankingData.length === 0 ? (
            <div className="empty-chart">Sem dados para exibir</div>
          ) : (
            <div className="ranking-list">
              {rankingData.map((item, i) => {
                const color = CATEGORY_COLORS[item.name] || '#8888aa'
                return (
                  <div key={item.name}>
                    <div className="ranking-item-header">
                      <div className="ranking-item-left">
                        <span className="ranking-item-num">#{i + 1}</span>
                        <span className="ranking-item-name" style={{ color }}>{item.name}</span>
                      </div>
                      <span className="ranking-item-value">{fmt(item.value)}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          background: color,
                          width: `${(item.value / maxRanking) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
