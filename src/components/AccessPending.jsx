import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function AccessPending({ user }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0a0a0f', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', color: '#c8f500',
          fontSize: 22, fontWeight: 800, marginBottom: 10,
        }}>
          Aguardando aprovação
        </h2>
        <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Sua solicitação foi enviada.<br />
          O administrador irá liberar seu acesso em breve.
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#1a1a26', border: '1px solid #ffffff12',
          borderRadius: 12, padding: '12px 16px',
          marginBottom: 24, justifyContent: 'center',
        }}>
          {user.photoURL && (
            <img
              src={user.photoURL} alt="" referrerPolicy="no-referrer"
              style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
            />
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f8' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 12, color: '#8888aa' }}>{user.email}</div>
          </div>
        </div>

        <button
          onClick={() => signOut(auth)}
          style={{
            background: 'transparent', border: '1px solid #ffffff20',
            borderRadius: 10, color: '#8888aa', cursor: 'pointer',
            fontFamily: 'Syne, sans-serif', fontSize: 13,
            padding: '10px 24px', width: '100%',
            transition: 'all 0.2s',
          }}
        >
          Sair da conta
        </button>

        <p style={{ color: '#ffffff18', fontSize: 11, marginTop: 32, fontFamily: 'Syne, sans-serif' }}>
          Petry Finance · 2026
        </p>
      </div>
    </div>
  )
}
