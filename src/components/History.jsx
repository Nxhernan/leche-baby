import { useState, useMemo } from 'react'

const MILK_TYPES = ['Materna', 'Fórmula', 'Mixta']

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

export default function History({ getFeedingsForDate, onDelete, onUpdate, family }) {
  const [dateOffset, setDateOffset] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState(0)
  const [editType, setEditType] = useState('')

  const currentDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - dateOffset)
    return d
  }, [dateOffset])

  const dayFeedings = getFeedingsForDate(currentDate)

  const startEdit = (f) => {
    setEditingId(f.id)
    setEditAmount(f.amount || 120)
    setEditType(f.type || 'Fórmula')
  }

  const handleSave = (feeding, newTimeStr) => {
    const [hours, minutes] = newTimeStr.split(':').map(Number)
    const d = new Date(feeding.timestamp)
    d.setHours(hours, minutes, 0, 0)
    onUpdate(feeding.id, { timestamp: d.getTime(), amount: editAmount, type: editType })
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
              {editingId === f.id ? (
                <div className="history-edit-form">
                  <input
                    type="time"
                    className="history-time-input"
                    defaultValue={toTimeInputValue(f.timestamp)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(f, e.target.value)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    ref={el => { if (el) el._timeInput = true }}
                  />
                  <div className="history-edit-row">
                    <label>ml:</label>
                    <input
                      type="number"
                      className="history-amount-input"
                      value={editAmount}
                      onChange={e => setEditAmount(Number(e.target.value))}
                      min="10" max="500" step="10"
                    />
                  </div>
                  <div className="history-edit-row">
                    {MILK_TYPES.map(t => (
                      <button
                        key={t}
                        className={`type-btn ${editType === t ? 'active' : ''}`}
                        onClick={() => setEditType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="history-edit-row">
                    <button className="history-save-btn" onClick={() => {
                      const timeInput = document.querySelector('.history-time-input')
                      handleSave(f, timeInput?.value || toTimeInputValue(f.timestamp))
                    }}>
                      Guardar
                    </button>
                    <button className="history-cancel-btn" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div onClick={() => startEdit(f)} style={{ cursor: 'pointer', flex: 1 }}>
                    <div className="history-time">
                      {formatTime(f.timestamp)} ✏️
                    </div>
                    <div className="history-meta">
                      <span className="history-amount">{f.amount || 120}ml</span>
                      <span className={`history-type type-${(f.type || 'Fórmula').toLowerCase()}`}>
                        {f.type || 'Fórmula'}
                      </span>
                      {family?.members?.length > 1 && f.createdBy && family.memberNames?.[f.createdBy] && (
                        <span className="history-creator">
                          {family.memberNames[f.createdBy]}
                        </span>
                      )}
                      <span className="history-ago">{timeAgo(f.timestamp)}</span>
                    </div>
                  </div>
                  <button
                    className="history-delete"
                    onClick={() => onDelete(f.id)}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
