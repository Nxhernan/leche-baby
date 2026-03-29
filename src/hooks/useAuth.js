import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native: use Capacitor Firebase Auth plugin
        const result = await FirebaseAuthentication.signInWithGoogle()
        const credential = GoogleAuthProvider.credential(result.credential?.idToken)
        await signInWithCredential(auth, credential)
      } else {
        // Web: use popup
        await signInWithPopup(auth, googleProvider)
      }
    } catch (e) {
      console.error('Login failed:', e)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signOut()
      }
      await signOut(auth)
      setUser(null)
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }, [])

  return { user, loading, login, logout }
}
