import { useState, useEffect } from 'react'

function formatDuration(ms) {
  if (ms < 0) ms = 0
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function Timer({ lastFeeding, intervalHours }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000) // update every 10s
    return () => clearInterval(id)
  }, [])

  if (!lastFeeding) {
    return (
      <div className="timer-section">
        <div className="timer-label">Sin registros aún</div>
        <div className="timer-value" style={{ fontSize: '1.2rem' }}>
          Toca el botón para registrar la primera toma
        </div>
      </div>
    )
  }

  const elapsed = now - lastFeeding.timestamp
  const intervalMs = intervalHours * 60 * 60 * 1000
  const remaining = intervalMs - elapsed
  const isOverdue = remaining <= 0
  const progress = Math.min((elapsed / intervalMs) * 100, 100)

  return (
    <div className="timer-section">
      <div className="timer-last-time">
        Última: {new Date(lastFeeding.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
      <div className="timer-label">Desde la última toma</div>
      <div className="timer-value">{formatDuration(elapsed)}</div>

      <div className={`timer-next ${isOverdue ? 'timer-overdue' : ''}`}>
        <div className="timer-label">
          {isOverdue ? '¡Ya toca!' : 'Próxima toma en'}
        </div>
        <div className="timer-value">
          {isOverdue ? `Pasada por ${formatDuration(-remaining)}` : formatDuration(remaining)}
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className={`progress-bar ${isOverdue ? 'overdue' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
