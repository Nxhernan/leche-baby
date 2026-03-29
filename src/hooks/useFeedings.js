import { useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEY = 'leche-baby-feedings'

function loadFeedings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    // Migrate old entries missing amount/type
    return JSON.parse(data).map(f => ({
      amount: 120,
      type: 'Fórmula',
      ...f,
    }))
  } catch {
    return []
  }
}

function saveFeedings(feedings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedings))
  // Sync to Capacitor Preferences (SharedPreferences on Android)
  if (Capacitor.isNativePlatform()) {
    Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(feedings) })
  }
}

export function useFeedings() {
  const [feedings, setFeedings] = useState(loadFeedings)

  // On native, sync from SharedPreferences on mount (widget may have added entries)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Preferences.get({ key: STORAGE_KEY }).then(({ value }) => {
        if (!value) return
        try {
          const nativeFeedings = JSON.parse(value)
          const localFeedings = loadFeedings()
          // Merge: combine both lists, deduplicate by id
          const merged = [...nativeFeedings, ...localFeedings]
          const unique = Array.from(new Map(merged.map(f => [f.id, f])).values())
          unique.sort((a, b) => b.timestamp - a.timestamp)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
          setFeedings(unique)
        } catch { /* ignore parse errors */ }
      })
    }
  }, [])

  const addFeeding = useCallback((timestamp = Date.now(), amount = 120, type = 'Fórmula') => {
    const newFeeding = { id: timestamp, timestamp, amount, type }
    setFeedings(prev => {
      const updated = [newFeeding, ...prev]
      saveFeedings(updated)
      return updated
    })
    return newFeeding
  }, [])

  const removeFeeding = useCallback((id) => {
    setFeedings(prev => {
      const updated = prev.filter(f => f.id !== id)
      saveFeedings(updated)
      return updated
    })
  }, [])

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

  const updateFeeding = useCallback((id, updates) => {
    setFeedings(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f)
      updated.sort((a, b) => b.timestamp - a.timestamp)
      saveFeedings(updated)
      return updated
    })
  }, [])

  return { feedings, addFeeding, removeFeeding, updateFeeding, getLastFeeding, getFeedingsForDate }
}
