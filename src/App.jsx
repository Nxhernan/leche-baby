import { useState, useCallback, useEffect } from 'react'
import BigButton from './components/BigButton'
import Timer from './components/Timer'
import History from './components/History'
import Settings from './components/Settings'
import Toast from './components/Toast'
import { useFeedings } from './hooks/useFeedings'
import { useSettings } from './hooks/useSettings'
import { useShake } from './hooks/useShake'
import { useNotifications } from './hooks/useNotifications'

export default function App() {
  const { addFeeding, removeFeeding, updateFeeding, getLastFeeding, getFeedingsForDate } = useFeedings()
  const { settings, updateSetting } = useSettings()
  const { requestPermission, scheduleNotification, cancelNotification } = useNotifications(settings.notificationsEnabled)

  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const lastFeeding = getLastFeeding()

  // Auto-register when opened from widget with ?register=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('register') === 'true') {
      addFeeding()
      if (navigator.vibrate) navigator.vibrate(150)
      setToast({ message: '✓ Toma registrada (widget)', feedingId: Date.now() })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule notification whenever last feeding changes
  useEffect(() => {
    if (!lastFeeding || !settings.notificationsEnabled) return
    const intervalMs = settings.intervalHours * 60 * 60 * 1000
    const elapsed = Date.now() - lastFeeding.timestamp
    const remaining = intervalMs - elapsed

    if (remaining > 0) {
      scheduleNotification(
        remaining,
        '🍼 ¡Hora de la leche!',
        `Ya pasaron ${settings.intervalHours} horas desde la última toma`
      )
    }

    return () => cancelNotification()
  }, [lastFeeding, settings.intervalHours, settings.notificationsEnabled, scheduleNotification, cancelNotification])

  const handleRegister = useCallback(() => {
    const feeding = addFeeding()

    // Vibrate feedback
    if (navigator.vibrate) {
      navigator.vibrate(150)
    }

    setToast({
      message: '✓ Toma registrada',
      feedingId: feeding.id,
    })
  }, [addFeeding])

  const handleUndo = useCallback(() => {
    if (toast?.feedingId) {
      removeFeeding(toast.feedingId)
    }
    setToast(null)
  }, [toast, removeFeeding])

  // Request notification permission on first interaction
  const handleFirstInteraction = useCallback(() => {
    if (settings.notificationsEnabled) {
      requestPermission()
    }
  }, [settings.notificationsEnabled, requestPermission])

  // Shake detection
  useShake(handleRegister, settings.shakeEnabled)

  return (
    <div className="app" onClick={handleFirstInteraction}>
      <header className="app-header">
        <h1>🍼 Leche Baby</h1>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          ⚙
        </button>
      </header>

      <BigButton onPress={handleRegister} />

      {showManualEntry ? (
        <div className="manual-entry">
          <input
            type="datetime-local"
            className="manual-entry-input"
            autoFocus
            onChange={() => {}}
          />
          <div className="manual-entry-actions">
            <button
              className="manual-entry-confirm"
              onClick={(e) => {
                const input = e.target.parentElement.previousElementSibling
                if (input.value) {
                  const ts = new Date(input.value).getTime()
                  addFeeding(ts)
                  setToast({ message: '✓ Toma registrada (manual)', feedingId: ts })
                  setShowManualEntry(false)
                }
              }}
            >
              Registrar
            </button>
            <button
              className="manual-entry-cancel"
              onClick={() => setShowManualEntry(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="manual-entry-link" onClick={() => setShowManualEntry(true)}>
          + Registrar hora pasada
        </button>
      )}

      <Timer lastFeeding={lastFeeding} intervalHours={settings.intervalHours} />
      <History getFeedingsForDate={getFeedingsForDate} onDelete={removeFeeding} onUpdate={updateFeeding} />

      {settings.shakeEnabled && (
        <div className="shake-indicator">📳 Shake activo</div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      {showSettings && (
        <Settings
          settings={settings}
          onUpdate={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
