import { useState, useCallback, useEffect, useRef } from 'react'
import BigButton from './components/BigButton'
import Timer from './components/Timer'
import History from './components/History'
import Settings from './components/Settings'
import Stats from './components/Stats'
import Toast from './components/Toast'
import { useAuth } from './hooks/useAuth'
import { useFamily } from './hooks/useFamily'
import { useFeedings } from './hooks/useFeedings'
import { useSettings } from './hooks/useSettings'
import { useShake } from './hooks/useShake'
import { useNotifications } from './hooks/useNotifications'

const MILK_TYPES = ['Materna', 'Fórmula', 'Mixta']

export default function App() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const { family, familyId, loading: familyLoading, createFamily, joinFamily, leaveFamily } = useFamily(user)
  const { feedings, addFeeding, removeFeeding, updateFeeding, getLastFeeding, getFeedingsForDate, migrateToFirestore, refresh } = useFeedings(user, familyId)
  const { settings, updateSetting } = useSettings()
  const { requestPermission, scheduleNotification, cancelNotification } = useNotifications(settings.notificationsEnabled)

  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualAmount, setManualAmount] = useState(settings.defaultAmount)
  const [manualType, setManualType] = useState(settings.defaultType)
  const [activeTab, setActiveTab] = useState('home')
  const [refreshing, setRefreshing] = useState(false)
  const lastFeeding = getLastFeeding()

  // Pull-to-refresh
  const touchStartY = useRef(0)
  const pullDistance = useRef(0)
  const appRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0 || refreshing) return
    pullDistance.current = e.touches[0].clientY - touchStartY.current
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance.current > 80 && !refreshing) {
      setRefreshing(true)
      if (navigator.vibrate) navigator.vibrate(50)
      await refresh()
      setRefreshing(false)
    }
    pullDistance.current = 0
  }, [refresh, refreshing])

  // Auto-register when opened from widget with ?register=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('register') === 'true') {
      addFeeding(Date.now(), settings.defaultAmount, settings.defaultType)
      if (navigator.vibrate) navigator.vibrate(150)
      setToast({ message: '✓ Toma registrada (widget)', feedingId: Date.now() })
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
    const feeding = addFeeding(Date.now(), settings.defaultAmount, settings.defaultType)

    if (navigator.vibrate) {
      navigator.vibrate(150)
    }

    setToast({
      message: `✓ ${settings.defaultAmount}ml ${settings.defaultType}`,
      feedingId: feeding?.id || Date.now(),
    })
  }, [addFeeding, settings.defaultAmount, settings.defaultType])

  const handleUndo = useCallback(() => {
    if (toast?.feedingId) {
      removeFeeding(toast.feedingId)
    }
    setToast(null)
  }, [toast, removeFeeding])

  const handleFirstInteraction = useCallback(() => {
    if (settings.notificationsEnabled) {
      requestPermission()
    }
  }, [settings.notificationsEnabled, requestPermission])

  useShake(handleRegister, settings.shakeEnabled)

  const handleCreateFamily = useCallback(async () => {
    const code = await createFamily()
    if (code) await migrateToFirestore()
    return code
  }, [createFamily, migrateToFirestore])

  return (
    <div
      className="app"
      ref={appRef}
      onClick={handleFirstInteraction}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="pull-indicator">
          <div className="pull-spinner" />
          Sincronizando...
        </div>
      )}

      <header className="app-header">
        <h1>
          <img src="/logo.svg" alt="" className="app-logo" />
          Leche Baby
        </h1>
        <div className="header-right">
          {user && (
            <span className="user-badge" title={user.email}>
              {user.displayName?.split(' ')[0] || '👤'}
            </span>
          )}
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          Inicio
        </button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          Estadísticas
        </button>
      </div>

      {activeTab === 'home' ? (
        <>
          <BigButton onPress={handleRegister} />

          {showManualEntry ? (
            <div className="manual-entry">
              <input
                type="datetime-local"
                className="manual-entry-input"
                autoFocus
                onChange={() => {}}
              />
              <div className="manual-entry-row">
                <label>ml:</label>
                <input
                  type="number"
                  className="manual-amount-input"
                  value={manualAmount}
                  onChange={e => setManualAmount(Number(e.target.value))}
                  min="10" max="500" step="10"
                />
              </div>
              <div className="manual-entry-row">
                {MILK_TYPES.map(t => (
                  <button
                    key={t}
                    className={`type-btn ${manualType === t ? 'active' : ''}`}
                    onClick={() => setManualType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="manual-entry-actions">
                <button
                  className="manual-entry-confirm"
                  onClick={() => {
                    const input = document.querySelector('.manual-entry-input')
                    if (input?.value) {
                      const ts = new Date(input.value).getTime()
                      addFeeding(ts, manualAmount, manualType)
                      setToast({ message: `✓ ${manualAmount}ml ${manualType} (manual)`, feedingId: ts })
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
            <button className="manual-entry-link" onClick={() => {
              setManualAmount(settings.defaultAmount)
              setManualType(settings.defaultType)
              setShowManualEntry(true)
            }}>
              + Registrar hora pasada
            </button>
          )}

          <Timer lastFeeding={lastFeeding} intervalHours={settings.intervalHours} />
          <History getFeedingsForDate={getFeedingsForDate} onDelete={removeFeeding} onUpdate={updateFeeding} family={family} />
        </>
      ) : (
        <Stats feedings={feedings} family={family} />
      )}

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
          user={user}
          family={family}
          authLoading={authLoading || familyLoading}
          onLogin={login}
          onLogout={logout}
          onCreateFamily={handleCreateFamily}
          onJoinFamily={joinFamily}
          onLeaveFamily={leaveFamily}
        />
      )}
    </div>
  )
}
