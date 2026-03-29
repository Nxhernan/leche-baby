import { useState } from 'react'

const MILK_TYPES = ['Materna', 'Fórmula', 'Mixta']

export default function Settings({ settings, onUpdate, onClose, user, family, authLoading, onLogin, onLogout, onCreateFamily, onJoinFamily, onLeaveFamily }) {
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)

  const handleCreateFamily = async () => {
    const code = await onCreateFamily()
    if (code) setCreatedCode(code)
  }

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) return
    setJoinLoading(true)
    setJoinError('')
    const ok = await onJoinFamily(joinCode.trim())
    setJoinLoading(false)
    if (!ok) setJoinError('Código no encontrado')
    else setJoinCode('')
  }

  const handleShare = async () => {
    const code = family?.inviteCode
    if (!code) return
    const text = `Unite a mi familia en Leche Baby con el código: ${code}`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(code)
      alert('Código copiado al portapapeles')
    }
  }

  return (
    <div className="settings-overlay">
      <h2>
        <button className="settings-back" onClick={onClose}>←</button>
        Configuración
      </h2>

      {/* Account section */}
      <div className="settings-section">
        <div className="settings-section-title">Cuenta</div>
        {authLoading ? (
          <div className="setting-row"><span>Cargando...</span></div>
        ) : !user ? (
          <div className="setting-row">
            <button className="google-btn" onClick={onLogin}>
              Iniciar sesión con Google
            </button>
          </div>
        ) : (
          <>
            <div className="setting-row account-info">
              <div>
                <div className="setting-label">{user.displayName}</div>
                <div className="setting-desc">{user.email}</div>
              </div>
              <button className="logout-btn" onClick={onLogout}>Salir</button>
            </div>

            {!family ? (
              <div className="family-setup">
                <button className="family-btn create" onClick={handleCreateFamily}>
                  Crear familia
                </button>
                <div className="family-divider">o</div>
                <div className="family-join">
                  <input
                    type="text"
                    placeholder="Código de familia"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="join-input"
                  />
                  <button
                    className="family-btn join"
                    onClick={handleJoinFamily}
                    disabled={joinLoading}
                  >
                    {joinLoading ? '...' : 'Unirse'}
                  </button>
                </div>
                {joinError && <div className="join-error">{joinError}</div>}
              </div>
            ) : (
              <div className="family-info">
                <div className="setting-row">
                  <div>
                    <div className="setting-label">Familia</div>
                    <div className="setting-desc">
                      {family.members?.length || 1} miembro{(family.members?.length || 1) > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <div className="setting-label">Código: <strong>{family.inviteCode}</strong></div>
                    <div className="setting-desc">Comparte este código para que tu pareja se una</div>
                  </div>
                  <button className="share-btn" onClick={handleShare}>Compartir</button>
                </div>
                {createdCode && (
                  <div className="created-code-msg">
                    Familia creada. Código: <strong>{createdCode}</strong>
                  </div>
                )}
                <button className="leave-btn" onClick={onLeaveFamily}>Salir de la familia</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Existing settings */}
      <div className="settings-section">
        <div className="settings-section-title">General</div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Intervalo entre tomas</div>
            <div className="setting-desc">Se usa para el temporizador y notificaciones</div>
          </div>
          <div className="setting-number">
            <button onClick={() => onUpdate('intervalHours', Math.max(1, settings.intervalHours - 0.5))}>
              −
            </button>
            <span>{settings.intervalHours}h</span>
            <button onClick={() => onUpdate('intervalHours', Math.min(8, settings.intervalHours + 0.5))}>
              +
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Cantidad por defecto</div>
            <div className="setting-desc">Mililitros de leche por toma</div>
          </div>
          <div className="setting-number">
            <button onClick={() => onUpdate('defaultAmount', Math.max(30, settings.defaultAmount - 10))}>
              −
            </button>
            <span>{settings.defaultAmount}ml</span>
            <button onClick={() => onUpdate('defaultAmount', Math.min(300, settings.defaultAmount + 10))}>
              +
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Tipo de leche por defecto</div>
          </div>
          <div className="setting-type-selector">
            {MILK_TYPES.map(t => (
              <button
                key={t}
                className={`type-btn ${settings.defaultType === t ? 'active' : ''}`}
                onClick={() => onUpdate('defaultType', t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Transparencia del widget</div>
            <div className="setting-desc">Ajusta la opacidad del widget en la pantalla de inicio</div>
          </div>
          <div className="setting-slider">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.widgetAlpha}
              onChange={e => onUpdate('widgetAlpha', parseFloat(e.target.value))}
            />
            <span>{Math.round(settings.widgetAlpha * 100)}%</span>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Agitar para registrar</div>
            <div className="setting-desc">Sacude el teléfono para registrar una toma</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.shakeEnabled}
              onChange={e => onUpdate('shakeEnabled', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Notificaciones</div>
            <div className="setting-desc">Alarma cuando llega la hora de la siguiente toma</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={e => onUpdate('notificationsEnabled', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  )
}
