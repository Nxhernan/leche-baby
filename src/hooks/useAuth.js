import { useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '../firebase'
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })

    // Check redirect result on mount
    getRedirectResult(auth).catch(() => {})

    return unsubscribe
  }, [])

  const login = useCallback(() => {
    signInWithRedirect(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
