import { initializeApp } from 'firebase/app'
import { getFirestore }  from 'firebase/firestore'
import { getAuth }       from 'firebase/auth'

// ── Cole aqui o firebaseConfig que o Firebase te deu ──────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBh-o8KH8hM5DHFLqkLOag81fdUXjSauSA",
  authDomain:        "petry-finance.firebaseapp.com",
  projectId:         "petry-finance",
  storageBucket:     "petry-finance.firebasestorage.app",
  messagingSenderId: "795140865378",
  appId:             "1:795140865378:web:08f650c02bcff5e2cc403b",
}
// ─────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig)

export const db   = getFirestore(app)
export const auth = getAuth(app)
