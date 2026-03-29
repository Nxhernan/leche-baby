import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEY = 'leche-baby-settings'

const DEFAULTS = {
  intervalHours: 4,
  shakeEnabled: true,
  notificationsEnabled: true,
  defaultAmount: 120,
  defaultType: 'Fórmula',
  widgetAlpha: 0.7,
}

function loadSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? { ...DEFAULTS, ...JSON.parse(data) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  if (Capacitor.isNativePlatform()) {
    Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) })
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value }
      saveSettings(updated)
      return updated
    })
  }, [])

  return { settings, updateSetting }
}
