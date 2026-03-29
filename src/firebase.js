import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBXdlZm-CMU25fG6gN2GmW5y4UqaV56P4Q",
  authDomain: "leche-baby.firebaseapp.com",
  projectId: "leche-baby",
  storageBucket: "leche-baby.firebasestorage.app",
  messagingSenderId: "882911535341",
  appId: "1:882911535341:web:79774c060e5380a201ace4",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Enable offline persistence
enableIndexedDbPersistence(db).catch(() => {})
