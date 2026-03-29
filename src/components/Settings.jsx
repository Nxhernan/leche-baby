const MILK_TYPES = ['Materna', 'Fórmula', 'Mixta']

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
  )
}
