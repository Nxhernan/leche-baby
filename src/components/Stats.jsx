import { useMemo } from 'react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TYPE_COLORS = {
  'Materna': '#4ecca3',
  'Fórmula': '#e94560',
  'Mixta': '#ffd369',
}

function getDayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function Stats({ feedings }) {
  const stats = useMemo(() => {
    if (!feedings || feedings.length === 0) return null

    // Today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const todayFeedings = feedings
      .filter(f => f.timestamp >= today.getTime() && f.timestamp <= todayEnd.getTime())
      .sort((a, b) => a.timestamp - b.timestamp)

    const todayCount = todayFeedings.length
    const todayMl = todayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)

    // Average interval today
    let avgInterval = 0
    if (todayFeedings.length >= 2) {
      let totalDiff = 0
      for (let i = 1; i < todayFeedings.length; i++) {
        totalDiff += todayFeedings[i].timestamp - todayFeedings[i - 1].timestamp
      }
      avgInterval = totalDiff / (todayFeedings.length - 1)
    }

    // Type breakdown today
    const typeBreakdown = {}
    todayFeedings.forEach(f => {
      const t = f.type || 'Fórmula'
      if (!typeBreakdown[t]) typeBreakdown[t] = { count: 0, ml: 0 }
      typeBreakdown[t].count++
      typeBreakdown[t].ml += f.amount || 120
    })

    // Last 7 days chart data
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)

      const dayFeedings = feedings.filter(
        f => f.timestamp >= d.getTime() && f.timestamp <= dEnd.getTime()
      )
      const totalMl = dayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)

      // Segments by type
      const segments = {}
      dayFeedings.forEach(f => {
        const t = f.type || 'Fórmula'
        segments[t] = (segments[t] || 0) + (f.amount || 120)
      })

      days.push({
        label: DAY_LABELS[d.getDay()],
        date: d,
        totalMl,
        count: dayFeedings.length,
        segments,
        isToday: i === 0,
      })
    }

    const maxMl = Math.max(...days.map(d => d.totalMl), 1)

    return { todayCount, todayMl, avgInterval, typeBreakdown, days, maxMl }
  }, [feedings])

  if (!stats) {
    return (
      <div className="stats-section">
        <div className="stats-empty">No hay datos aún para mostrar estadísticas</div>
      </div>
    )
  }

  const formatInterval = (ms) => {
    if (ms === 0) return '--'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="stats-section">
      <h3 className="stats-title">Resumen de hoy</h3>

      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-value">{stats.todayCount}</div>
          <div className="stats-card-label">Tomas</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{stats.todayMl}ml</div>
          <div className="stats-card-label">Total</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{formatInterval(stats.avgInterval)}</div>
          <div className="stats-card-label">Intervalo prom.</div>
        </div>
      </div>

      {Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="stats-types">
          {Object.entries(stats.typeBreakdown).map(([type, data]) => (
            <div key={type} className="stats-type-row">
              <span className="stats-type-badge" style={{ background: TYPE_COLORS[type] || '#888' }}>
                {type}
              </span>
              <span>{data.count} tomas</span>
              <span>{data.ml}ml</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="stats-title" style={{ marginTop: '24px' }}>Últimos 7 días</h3>

      <div className="chart-container">
        <div className="chart-bars">
          {stats.days.map((day, i) => (
            <div className="chart-col" key={i}>
              <div className="chart-ml-label">{day.totalMl > 0 ? day.totalMl : ''}</div>
              <div className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{ height: `${(day.totalMl / stats.maxMl) * 100}%` }}
                >
                  {Object.entries(day.segments).map(([type, ml]) => (
                    <div
                      key={type}
                      className="chart-segment"
                      style={{
                        height: `${(ml / day.totalMl) * 100}%`,
                        background: TYPE_COLORS[type] || '#888',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className={`chart-label ${day.isToday ? 'today' : ''}`}>
                {day.isToday ? 'Hoy' : day.label}
              </div>
              <div className="chart-count">{day.count}t</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
