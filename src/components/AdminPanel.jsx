import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

const statusLabel = { pending: 'Pendente', approved: 'Aprovado', denied: 'Negado', revoked: 'Acesso Revogado' }
const statusColor = { pending: '#ffa502', approved: '#c8f500', denied: '#ff4757', revoked: '#a78bfa' }

export default function AdminPanel({ onClose }) {
  const [requests,      setRequests]      = useState([])
  const [confirmRevoke, setConfirmRevoke] = useState(null) // { id, name, email }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'accessRequests'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => {
        const order = { pending: 0, approved: 1, revoked: 2, denied: 3 }
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
        return (b.requestedAt || '').localeCompare(a.requestedAt || '')
      })
      setRequests(docs)
    })
    return unsub
  }, [])

  const approve = (uid) =>
    updateDoc(doc(db, 'accessRequests', uid), {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    })

  const deny = (uid) =>
    updateDoc(doc(db, 'accessRequests', uid), { status: 'denied' })

  // Chamado ao clicar "Tirar acesso" de um usuário aprovado
  const askRevoke = (r) => setConfirmRevoke(r)

  const executeRevoke = async (deleteData) => {
    if (!confirmRevoke) return
    if (deleteData) {
      // Apagar tudo: dados financeiros + registro de acesso (some do painel)
      try { await deleteDoc(doc(db, 'users', confirmRevoke.id)) }         catch { /* já deletado */ }
      try { await deleteDoc(doc(db, 'accessRequests', confirmRevoke.id)) } catch { /* já deletado */ }
    } else {
      // Só revogar — mantém o registro visível no painel
      await updateDoc(doc(db, 'accessRequests', confirmRevoke.id), { status: 'revoked', dataDeleted: false })
    }
    setConfirmRevoke(null)
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="card modal-box"
          style={{ maxWidth: 540, width: '100%', maxHeight: '82vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#c8f500' }}>
              Gerenciar Acessos
              {pending.length > 0 && (
                <span style={{
                  marginLeft: 8, background: '#ffa50220', color: '#ffa502',
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
                }}>
                  {pending.length} pendente{pending.length > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <button className="remove-btn" onClick={onClose}>✕</button>
          </div>

          {requests.length === 0 && (
            <div className="empty-state">Nenhuma solicitação de acesso ainda</div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {requests.map(r => (
              <div key={r.id} style={{
                background: '#1a1a26', borderRadius: 12, padding: '12px 14px',
                border: `1px solid ${(statusColor[r.status] || '#ffffff12')}28`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {r.photoURL && (
                  <img
                    src={r.photoURL} alt="" referrerPolicy="no-referrer"
                    style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {r.name || '—'}
                  </div>
                  <div style={{ color: '#8888aa', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.email}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: statusColor[r.status] || '#8888aa',
                      background: (statusColor[r.status] || '#8888aa') + '18',
                      borderRadius: 20, padding: '1px 8px',
                    }}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {r.status === 'pending' && (
                    <>
                      <ActionBtn label="Aprovar"  color="#c8f500" onClick={() => approve(r.id)} />
                      <ActionBtn label="Negar"    color="#ff4757" onClick={() => deny(r.id)}    />
                    </>
                  )}
                  {r.status === 'approved' && (
                    <ActionBtn label="Tirar acesso" color="#a78bfa" onClick={() => askRevoke(r)} />
                  )}
                  {r.status === 'denied' && (
                    <ActionBtn label="Aprovar"      color="#c8f500" onClick={() => approve(r.id)} />
                  )}
                  {r.status === 'revoked' && (
                    <ActionBtn label="Desbloquear"  color="#00f5c8" onClick={() => approve(r.id)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmação ao tirar acesso */}
      {confirmRevoke && (
        <div className="modal-overlay" style={{ zIndex: 210 }} onClick={() => setConfirmRevoke(null)}>
          <div className="card modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, color: '#a78bfa' }}>Tirar acesso</h3>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#1a1a26', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            }}>
              {confirmRevoke.photoURL && (
                <img src={confirmRevoke.photoURL} alt="" referrerPolicy="no-referrer"
                  style={{ width: 32, height: 32, borderRadius: '50%' }} />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{confirmRevoke.name}</div>
                <div style={{ color: '#8888aa', fontSize: 12 }}>{confirmRevoke.email}</div>
              </div>
            </div>

            <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Deseja também <strong style={{ color: '#ff4757' }}>apagar todos os dados financeiros</strong> desta pessoa?
              <br /><span style={{ fontSize: 12 }}>Esta ação não pode ser desfeita.</span>
            </p>

            <div style={{ display: 'grid', gap: 8 }}>
              <button
                onClick={() => executeRevoke(true)}
                style={{
                  background: '#ff475718', border: '1px solid #ff475740', borderRadius: 10,
                  color: '#ff4757', cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, fontSize: 13, padding: '10px 16px',
                }}
              >
                🗑️ Tirar acesso e apagar dados
              </button>
              <button
                onClick={() => executeRevoke(false)}
                style={{
                  background: '#a78bfa18', border: '1px solid #a78bfa30', borderRadius: 10,
                  color: '#a78bfa', cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, fontSize: 13, padding: '10px 16px',
                }}
              >
                Apenas tirar acesso (manter dados)
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmRevoke(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color + '20', border: `1px solid ${color}40`,
        borderRadius: 8, color, cursor: 'pointer',
        fontSize: 12, fontWeight: 700, padding: '6px 12px',
        fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}
