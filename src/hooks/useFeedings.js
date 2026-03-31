import { useState, useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { db } from '../firebase'
import {
  collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, writeBatch
} from 'firebase/firestore'

const STORAGE_KEY = 'leche-baby-feedings'

function loadLocal() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data).map(f => ({
      amount: 120,
      type: 'Fórmula',
      ...f,
    }))
  } catch {
    return []
  }
}

function saveLocal(feedings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedings))
  syncToNative(feedings)
}

function syncToNative(feedings) {
  if (Capacitor.isNativePlatform()) {
    Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(feedings) })
  }
}

// Force widget refresh on Android
function refreshWidget() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Send broadcast to update widget via Capacitor bridge
      const { Capacitor: Cap } = window
      if (Cap?.Plugins?.LecheBabyWidget) {
        Cap.Plugins.LecheBabyWidget.refresh()
      }
    } catch { /* widget refresh is best-effort */ }
  }
}

export function useFeedings(user, familyId) {
  const [feedings, setFeedings] = useState(loadLocal)
  const unsubRef = useRef(null)
  const isFirestore = !!(user && familyId)

  // Subscribe to Firestore when logged in with family
  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    if (!isFirestore) {
      setFeedings(loadLocal())
      return
    }

    const feedingsRef = collection(db, 'families', familyId, 'feedings')
    const q = query(feedingsRef, orderBy('timestamp', 'desc'))

    unsubRef.current = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        amount: 120,
        type: 'Fórmula',
        ...d.data(),
      }))
      setFeedings(docs)
      // Sync to SharedPreferences for widget on every Firestore update
      syncToNative(docs)
    })

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [isFirestore, familyId])

  // On native, sync from SharedPreferences on mount (widget may have added entries)
  useEffect(() => {
    if (isFirestore || !Capacitor.isNativePlatform()) return
    Preferences.get({ key: STORAGE_KEY }).then(({ value }) => {
      if (!value) return
      try {
        const nativeFeedings = JSON.parse(value)
        const localFeedings = loadLocal()
        const merged = [...nativeFeedings, ...localFeedings]
        const unique = Array.from(new Map(merged.map(f => [f.id, f])).values())
        unique.sort((a, b) => b.timestamp - a.timestamp)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
        setFeedings(unique)
      } catch { /* ignore */ }
    })
  }, [isFirestore])

  const addFeeding = useCallback(async (timestamp = Date.now(), amount = 120, type = 'Fórmula') => {
    const feedingData = { timestamp, amount, type, createdBy: user?.uid || 'local' }

    if (isFirestore) {
      const ref = await addDoc(collection(db, 'families', familyId, 'feedings'), feedingData)
      // onSnapshot will update the state automatically, just sync to widget
      const newFeeding = { id: ref.id, ...feedingData }
      syncToNative([newFeeding, ...feedings].sort((a, b) => b.timestamp - a.timestamp))
      return newFeeding
    }

    const newFeeding = { id: timestamp, ...feedingData }
    setFeedings(prev => {
      const updated = [newFeeding, ...prev]
      saveLocal(updated)
      return updated
    })
    return newFeeding
  }, [user, familyId, isFirestore])

  const removeFeeding = useCallback(async (id) => {
    if (isFirestore) {
      await deleteDoc(doc(db, 'families', familyId, 'feedings', String(id)))
      return
    }

    setFeedings(prev => {
      const updated = prev.filter(f => f.id !== id)
      saveLocal(updated)
      return updated
    })
  }, [familyId, isFirestore])

  const updateFeeding = useCallback(async (id, updates) => {
    if (isFirestore) {
      await updateDoc(doc(db, 'families', familyId, 'feedings', String(id)), updates)
      return
    }

    setFeedings(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f)
      updated.sort((a, b) => b.timestamp - a.timestamp)
      saveLocal(updated)
      return updated
    })
  }, [familyId, isFirestore])

  const getLastFeeding = useCallback(() => {
    if (feedings.length === 0) return null
    return feedings.reduce((latest, f) =>
      f.timestamp > latest.timestamp ? f : latest
    , feedings[0])
  }, [feedings])

  const getFeedingsForDate = useCallback((date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return feedings
      .filter(f => f.timestamp >= start.getTime() && f.timestamp <= end.getTime())
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [feedings])

  // Migrate local feedings to Firestore (called once after first login + family creation)
  const migrateToFirestore = useCallback(async () => {
    if (!isFirestore) return
    const localFeedings = loadLocal()
    if (localFeedings.length === 0) return

    const batch = writeBatch(db)
    const feedingsRef = collection(db, 'families', familyId, 'feedings')
    for (const f of localFeedings) {
      const ref = doc(feedingsRef)
      batch.set(ref, {
        timestamp: f.timestamp,
        amount: f.amount || 120,
        type: f.type || 'Fórmula',
        createdBy: user?.uid || 'migrated',
      })
    }
    await batch.commit()
    localStorage.removeItem(STORAGE_KEY)
  }, [user, familyId, isFirestore])

  // Pull-to-refresh: force re-subscribe to Firestore or re-read local
  const refresh = useCallback(async () => {
    if (isFirestore) {
      // Unsub and resub to force fresh data
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
      const feedingsRef = collection(db, 'families', familyId, 'feedings')
      const q = query(feedingsRef, orderBy('timestamp', 'desc'))
      return new Promise((resolve) => {
        unsubRef.current = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(d => ({
            id: d.id,
            amount: 120,
            type: 'Fórmula',
            ...d.data(),
          }))
          setFeedings(docs)
          syncToNative(docs)
          resolve()
        })
      })
    } else {
      setFeedings(loadLocal())
    }
  }, [isFirestore, familyId])

  return { feedings, addFeeding, removeFeeding, updateFeeding, getLastFeeding, getFeedingsForDate, migrateToFirestore, refresh }
}
