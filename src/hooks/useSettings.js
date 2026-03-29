import { useState, useCallback } from 'react'

const STORAGE_KEY = 'leche-baby-settings'

const DEFAULTS = {
  intervalHours: 4,
  shakeEnabled: true,
  notificationsEnabled: true,
}

function loadSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? { ...DEFAULTS, ...JSON.parse(data) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return { settings, updateSetting }
}
