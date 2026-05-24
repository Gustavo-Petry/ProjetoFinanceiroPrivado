import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc }          from 'firebase/firestore'
import { onAuthStateChanged, signOut }  from 'firebase/auth'
import { db, auth }                     from './firebase'
import Dashboard    from './components/Dashboard'
import Lancamentos  from './components/Lancamentos'
import Fixos        from './components/Fixos'
import Combustivel  from './components/Combustivel'
import Objetivos    from './components/Objetivos'
import Graficos     from './components/Graficos'
import Login        from './components/Login'
import './styles/App.css'

const defaultState = {
  salary: '',
  benefits: {
    vt:         { enabled: false, value: '', label: 'Vale Transporte',   icon: '🚌', color: '#4a9eff' },
    vr:         { enabled: false, value: '', label: 'Vale Refeição',     icon: '🍽️', color: '#ffa502' },
    va:         { enabled: false, value: '', label: 'Vale Alimentação',  icon: '🛒', color: '#c8f500' },
    faculdade:  { enabled: false, value: '', label: 'Auxílio Faculdade', icon: '🎓', color: '#a78bfa' },
    saude:      { enabled: false, value: '', label: 'Auxílio Saúde',     icon: '💊', color: '#ff6b81' },
    homeoffice: { enabled: false, value: '', label: 'Aux. Home Office',  icon: '💻', color: '#00f5c8' },
    plr:        { enabled: false, value: '', label: 'PLR / Bônus',      icon: '🏆', color: '#ffd700' },
    outro:      { enabled: false, value: '', label: 'Outro',             icon: '➕', color: '#8888aa' },
  },
  transactions: [],
  fixedExpenses: [],
  fuelExpenses: [],
  goals: [],
}

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',   icon: '◈' },
  { id: 'lancamentos', label: 'Lançamentos', icon: '⊕' },
  { id: 'fixos',       label: 'Fixos',       icon: '⊡' },
  { id: 'combustivel', label: 'Combustível', icon: '⛽' },
  { id: 'objetivos',   label: 'Objetivos',   icon: '🎯' },
  { id: 'graficos',    label: 'Gráficos',    icon: '◧' },
]

const VOICE_CATEGORIES = [
  { pattern: /farmácia|remédio|médico|saúde|hospital/,                          cat: 'Saúde'       },
  { pattern: /comida|restaurante|mercado|supermercado|almoço|jantar|lanche/,    cat: 'Alimentação' },
  { pattern: /uber|táxi|taxi|gasolina|ônibus|combustível|transporte/,           cat: 'Transporte'  },
  { pattern: /cinema|bar|show|lazer|festa/,                                     cat: 'Lazer'       },
  { pattern: /aluguel|luz|água|energia|moradia|condomínio/,                     cat: 'Moradia'     },
  { pattern: /faculdade|curso|escola|livro/,                                    cat: 'Educação'    },
]

export default function App() {
  const [user,        setUser]        = useState(undefined) // undefined = carregando
  const [data,        setData]        = useState(defaultState)
  const [activeTab,   setActiveTab]   = useState('dashboard')
  const [toast,       setToast]       = useState(null)
  const [syncing,     setSyncing]     = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceConfirm,setVoiceConfirm]= useState(null)
  const loadingRef = useRef(true)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Auth listener ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u || null)
      if (!u) {
        loadingRef.current = false
        setData(defaultState)
      }
    })
  }, [])

  // ── Carrega dados do Firestore quando o usuário loga ─────────────
  useEffect(() => {
    if (!user) return
    loadingRef.current = true
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const saved = snap.data()
          setData({
            ...defaultState,
            ...saved,
            benefits: { ...defaultState.benefits, ...(saved.benefits || {}) },
          })
        }
      } catch {
        showToast('Erro ao carregar dados')
      } finally {
        loadingRef.current = false
      }
    }
    load()
  }, [user, showToast])

  // ── Salva no Firestore com debounce de 1,5s ──────────────────────
  useEffect(() => {
    if (!user || loadingRef.current) return
    setSyncing(true)
    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), data)
      } catch {
        showToast('Erro ao salvar dados')
      }
      setSyncing(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [data, user, showToast])

  const updateData = useCallback((updates) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  // ── Voice ────────────────────────────────────────────────────────
  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { showToast('Seu navegador não suporta reconhecimento de voz'); return }

    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart  = () => setVoiceActive(true)
    recognition.onend    = () => setVoiceActive(false)
    recognition.onerror  = () => { setVoiceActive(false); showToast('Erro no microfone') }
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase()
      const valueMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/)
      if (!valueMatch) { showToast('Não identifiquei o valor'); return }
      const value = parseFloat(valueMatch[1].replace(',', '.'))
      let category = 'Outros'
      for (const { pattern, cat } of VOICE_CATEGORIES) {
        if (pattern.test(text)) { category = cat; break }
      }
      setVoiceConfirm({ text, value, category })
    }
    recognition.start()
  }

  const fmt = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  const confirmVoice = () => {
    if (!voiceConfirm) return
    updateData({
      transactions: [
        ...data.transactions,
        {
          id:          Date.now(),
          description: voiceConfirm.text,
          value:       voiceConfirm.value,
          category:    voiceConfirm.category,
          date:        new Date().toISOString().split('T')[0],
        },
      ],
    })
    showToast('Lançamento adicionado por voz!')
    setVoiceConfirm(null)
  }

  // ── Estados de carregamento ──────────────────────────────────────
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <div style={{ color: '#8888aa', fontFamily: 'Syne, sans-serif' }}>Carregando...</div>
      </div>
    )
  }

  if (user === null) return <Login />

  return (
    <div>
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="app-logo-icon">🐷</span>
            <span className="app-logo-text">Petry Finance</span>
          </div>

          <nav className="app-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`app-nav-btn${activeTab === tab.id ? ' app-nav-btn--active' : ''}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {syncing && (
              <span style={{ color: '#8888aa', fontSize: 12, fontFamily: 'Syne' }}>
                💾 salvando...
              </span>
            )}

            <button
              onClick={handleVoice}
              className={`btn ${voiceActive ? 'btn-green pulse' : 'btn-ghost'}`}
            >
              🎙️ {voiceActive ? 'Ouvindo...' : 'Falar'}
            </button>

            <div className="user-menu">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
              )}
              <button className="btn btn-ghost user-logout" onClick={() => signOut(auth)}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {activeTab === 'dashboard'   && <Dashboard   data={data} />}
        {activeTab === 'lancamentos' && <Lancamentos data={data} updateData={updateData} showToast={showToast} />}
        {activeTab === 'fixos'       && <Fixos       data={data} updateData={updateData} showToast={showToast} />}
        {activeTab === 'combustivel' && <Combustivel data={data} updateData={updateData} showToast={showToast} />}
        {activeTab === 'objetivos'   && <Objetivos   data={data} updateData={updateData} showToast={showToast} />}
        {activeTab === 'graficos'    && <Graficos    data={data} />}
      </main>

      {/* ── Voice confirm modal ── */}
      {voiceConfirm && (
        <div className="modal-overlay">
          <div className="card card-accent modal-box">
            <h3 className="modal-title">🎙️ Confirmar Lançamento</h3>
            <p className="modal-transcript">"{voiceConfirm.text}"</p>

            <div className="modal-row">
              <span className="modal-row-label">Valor</span>
              <span className="modal-voice-value">R$ {voiceConfirm.value.toFixed(2)}</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">Categoria</span>
              <span className="modal-row-value">{voiceConfirm.category}</span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">Data</span>
              <span className="modal-row-value">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="modal-actions">
              <button className="btn btn-green btn-full" onClick={confirmVoice}>Confirmar</button>
              <button className="btn btn-ghost btn-full" onClick={() => setVoiceConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  )
}
