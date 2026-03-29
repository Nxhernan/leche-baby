import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import {
  doc, collection, getDoc, setDoc, updateDoc, arrayUnion, query, where, getDocs, onSnapshot
} from 'firebase/firestore'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function useFamily(user) {
  const [family, setFamily] = useState(null)
  const [familyId, setFamilyId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Load user's family on login
  useEffect(() => {
    if (!user) {
      setFamily(null)
      setFamilyId(null)
      return
    }

    setLoading(true)
    const userRef = doc(db, 'users', user.uid)

    getDoc(userRef).then(async (snap) => {
      if (snap.exists() && snap.data().familyId) {
        const fid = snap.data().familyId
        setFamilyId(fid)
        // Listen to family doc in real time
        const unsub = onSnapshot(doc(db, 'families', fid), (fSnap) => {
          if (fSnap.exists()) setFamily(fSnap.data())
        })
        setLoading(false)
        return () => unsub()
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const createFamily = useCallback(async () => {
    if (!user) return null
    const code = generateCode()
    const fRef = doc(collection(db, 'families'))
    const familyData = {
      members: [user.uid],
      memberNames: { [user.uid]: user.displayName || 'Usuario' },
      inviteCode: code,
      createdBy: user.uid,
    }
    await setDoc(fRef, familyData)
    await setDoc(doc(db, 'users', user.uid), { familyId: fRef.id })
    setFamilyId(fRef.id)
    setFamily(familyData)
    return code
  }, [user])

  const joinFamily = useCallback(async (code) => {
    if (!user || !code) return false
    const q = query(collection(db, 'families'), where('inviteCode', '==', code.toUpperCase()))
    const snap = await getDocs(q)
    if (snap.empty) return false

    const fDoc = snap.docs[0]
    await updateDoc(fDoc.ref, {
      members: arrayUnion(user.uid),
      [`memberNames.${user.uid}`]: user.displayName || 'Usuario',
    })
    await setDoc(doc(db, 'users', user.uid), { familyId: fDoc.id })
    setFamilyId(fDoc.id)
    setFamily({ ...fDoc.data(), members: [...fDoc.data().members, user.uid] })
    return true
  }, [user])

  const leaveFamily = useCallback(async () => {
    if (!user || !familyId) return
    await setDoc(doc(db, 'users', user.uid), { familyId: null })
    setFamily(null)
    setFamilyId(null)
  }, [user, familyId])

  return { family, familyId, loading, createFamily, joinFamily, leaveFamily }
}
