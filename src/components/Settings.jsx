export default function Settings({ settings, onUpdate, onClose }) {
  return (
    <div className="settings-overlay">
      <h2>
        <button className="settings-back" onClick={onClose}>←</button>
        Configuración
      </h2>

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
  )
}
