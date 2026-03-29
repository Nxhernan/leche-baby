import { useState, useMemo } from 'react'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)

  const diff = (today - d) / (1000 * 60 * 60 * 24)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `hace ${hours}h ${minutes % 60}m`
}

function toTimeInputValue(timestamp) {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function History({ getFeedingsForDate, onDelete, onUpdate }) {
  const [dateOffset, setDateOffset] = useState(0)
  const [editingId, setEditingId] = useState(null)

  const currentDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - dateOffset)
    return d
  }, [dateOffset])

  const dayFeedings = getFeedingsForDate(currentDate)

  const handleTimeChange = (feeding, newTimeStr) => {
    const [hours, minutes] = newTimeStr.split(':').map(Number)
    const d = new Date(feeding.timestamp)
    d.setHours(hours, minutes, 0, 0)
    onUpdate(feeding.id, d.getTime())
    setEditingId(null)
  }

  return (
    <div className="history-section">
      <div className="history-header">
        <h2>{formatDate(currentDate)} ({dayFeedings.length} tomas)</h2>
        <div className="history-nav">
          <button onClick={() => setDateOffset(d => d + 1)}>◀</button>
          <button
            onClick={() => setDateOffset(0)}
            disabled={dateOffset === 0}
          >
            Hoy
          </button>
          <button
            onClick={() => setDateOffset(d => Math.max(0, d - 1))}
            disabled={dateOffset === 0}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="history-list">
        {dayFeedings.length === 0 ? (
          <div className="history-empty">No hay registros para este día</div>
        ) : (
          dayFeedings.map(f => (
            <div key={f.id} className="history-item">
              <div>
                {editingId === f.id ? (
                  <input
                    type="time"
                    className="history-time-input"
                    defaultValue={toTimeInputValue(f.timestamp)}
                    autoFocus
                    onBlur={(e) => {
                      if (e.target.value) handleTimeChange(f, e.target.value)
                      else setEditingId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) handleTimeChange(f, e.target.value)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <div className="history-time" onClick={() => setEditingId(f.id)}>
                    {formatTime(f.timestamp)} ✏️
                  </div>
                )}
                <div className="history-ago">{timeAgo(f.timestamp)}</div>
              </div>
              <button
                className="history-delete"
                onClick={() => onDelete(f.id)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
