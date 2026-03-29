import { useMemo, useState } from 'react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TYPE_COLORS = {
  'Materna': '#4ecca3',
  'Fórmula': '#e94560',
  'Mixta': '#ffd369',
}
const HOUR_BLOCKS = [
  { label: 'Madrugada', range: [0, 6] },
  { label: 'Mañana', range: [6, 12] },
  { label: 'Tarde', range: [12, 18] },
  { label: 'Noche', range: [18, 24] },
]

function getFeedingsForDay(feedings, daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return feedings
    .filter(f => f.timestamp >= d.getTime() && f.timestamp <= end.getTime())
    .sort((a, b) => a.timestamp - b.timestamp)
}

function formatInterval(ms) {
  if (ms === 0) return '--'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Stats({ feedings, family }) {
  const [chartRange, setChartRange] = useState(7) // 7 or 30

  const stats = useMemo(() => {
    if (!feedings || feedings.length === 0) return null

    const todayFeedings = getFeedingsForDay(feedings, 0)
    const yesterdayFeedings = getFeedingsForDay(feedings, 1)

    // Today basics
    const todayCount = todayFeedings.length
    const todayMl = todayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)
    const yesterdayMl = yesterdayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)

    // Average interval today
    let avgInterval = 0
    let longestInterval = 0
    let shortestInterval = Infinity
    if (todayFeedings.length >= 2) {
      let totalDiff = 0
      for (let i = 1; i < todayFeedings.length; i++) {
        const diff = todayFeedings[i].timestamp - todayFeedings[i - 1].timestamp
        totalDiff += diff
        if (diff > longestInterval) longestInterval = diff
        if (diff < shortestInterval) shortestInterval = diff
      }
      avgInterval = totalDiff / (todayFeedings.length - 1)
    }
    if (shortestInterval === Infinity) shortestInterval = 0

    // Type breakdown today
    const typeBreakdown = {}
    todayFeedings.forEach(f => {
      const t = f.type || 'Fórmula'
      if (!typeBreakdown[t]) typeBreakdown[t] = { count: 0, ml: 0 }
      typeBreakdown[t].count++
      typeBreakdown[t].ml += f.amount || 120
    })

    // Hour distribution (all feedings)
    const hourDist = new Array(24).fill(0)
    feedings.forEach(f => {
      const h = new Date(f.timestamp).getHours()
      hourDist[h]++
    })
    // Peak hour
    const peakHour = hourDist.indexOf(Math.max(...hourDist))

    // Hour block distribution (today)
    const hourBlocks = HOUR_BLOCKS.map(block => {
      const count = todayFeedings.filter(f => {
        const h = new Date(f.timestamp).getHours()
        return h >= block.range[0] && h < block.range[1]
      }).length
      return { ...block, count }
    })

    // Chart data (7 or 30 days)
    const days = []
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)

      const dayFeedings = feedings.filter(
        f => f.timestamp >= d.getTime() && f.timestamp <= dEnd.getTime()
      )
      const totalMl = dayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)

      const segments = {}
      dayFeedings.forEach(f => {
        const t = f.type || 'Fórmula'
        segments[t] = (segments[t] || 0) + (f.amount || 120)
      })

      days.push({
        label: chartRange <= 7 ? DAY_LABELS[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`,
        date: d,
        totalMl,
        count: dayFeedings.length,
        segments,
        isToday: i === 0,
      })
    }

    const maxMl = Math.max(...days.map(d => d.totalMl), 1)

    // Weekly averages
    const last7 = days.slice(-7)
    const daysWithData = last7.filter(d => d.count > 0)
    const weekAvgMl = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + d.totalMl, 0) / daysWithData.length)
      : 0
    const weekAvgCount = daysWithData.length > 0
      ? (daysWithData.reduce((s, d) => s + d.count, 0) / daysWithData.length).toFixed(1)
      : 0

    // Who registered today (for family mode)
    const byCreator = {}
    if (family) {
      todayFeedings.forEach(f => {
        const name = (family.memberNames && family.memberNames[f.createdBy]) || 'Otro'
        if (!byCreator[name]) byCreator[name] = 0
        byCreator[name]++
      })
    }

    // Comparison vs yesterday
    const mlDiff = todayMl - yesterdayMl
    const countDiff = todayCount - yesterdayFeedings.length

    return {
      todayCount, todayMl, avgInterval, longestInterval, shortestInterval,
      typeBreakdown, days, maxMl, peakHour, hourBlocks,
      weekAvgMl, weekAvgCount, byCreator, mlDiff, countDiff,
    }
  }, [feedings, chartRange, family])

  if (!stats) {
    return (
      <div className="stats-section">
        <div className="stats-empty">No hay datos aún para mostrar estadísticas</div>
      </div>
    )
  }

  return (
    <div className="stats-section">
      {/* Today summary */}
      <h3 className="stats-title">Resumen de hoy</h3>

      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-value">{stats.todayCount}</div>
          <div className="stats-card-label">Tomas</div>
          {stats.countDiff !== 0 && (
            <div className={`stats-card-diff ${stats.countDiff > 0 ? 'up' : 'down'}`}>
              {stats.countDiff > 0 ? '+' : ''}{stats.countDiff} vs ayer
            </div>
          )}
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{stats.todayMl}<small>ml</small></div>
          <div className="stats-card-label">Total</div>
          {stats.mlDiff !== 0 && (
            <div className={`stats-card-diff ${stats.mlDiff > 0 ? 'up' : 'down'}`}>
              {stats.mlDiff > 0 ? '+' : ''}{stats.mlDiff}ml
            </div>
          )}
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{formatInterval(stats.avgInterval)}</div>
          <div className="stats-card-label">Intervalo prom.</div>
        </div>
      </div>

      {/* Interval details */}
      {stats.todayCount >= 2 && (
        <div className="stats-intervals">
          <div className="stats-interval-item">
            <span className="stats-interval-label">Más corto</span>
            <span className="stats-interval-value short">{formatInterval(stats.shortestInterval)}</span>
          </div>
          <div className="stats-interval-item">
            <span className="stats-interval-label">Más largo</span>
            <span className="stats-interval-value long">{formatInterval(stats.longestInterval)}</span>
          </div>
        </div>
      )}

      {/* Type breakdown */}
      {Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="stats-types">
          {Object.entries(stats.typeBreakdown).map(([type, data]) => (
            <div key={type} className="stats-type-row">
              <span className="stats-type-badge" style={{ background: TYPE_COLORS[type] || '#888' }}>
                {type}
              </span>
              <span>{data.count} tomas</span>
              <span>{data.ml}ml</span>
              <span className="stats-type-pct">
                {Math.round((data.ml / stats.todayMl) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hour distribution */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Horarios de hoy</h3>
      <div className="stats-hour-blocks">
        {stats.hourBlocks.map(block => (
          <div key={block.label} className={`stats-hour-block ${block.count > 0 ? 'active' : ''}`}>
            <div className="stats-hour-count">{block.count}</div>
            <div className="stats-hour-label">{block.label}</div>
            <div className="stats-hour-range">{block.range[0]}:00-{block.range[1]}:00</div>
          </div>
        ))}
      </div>
      <div className="stats-peak-hour">
        Hora pico histórica: <strong>{stats.peakHour}:00 - {stats.peakHour + 1}:00</strong>
      </div>

      {/* Who registered (family mode) */}
      {Object.keys(stats.byCreator).length > 1 && (
        <>
          <h3 className="stats-title" style={{ marginTop: '20px' }}>Quién registró hoy</h3>
          <div className="stats-creators">
            {Object.entries(stats.byCreator).map(([name, count]) => (
              <div key={name} className="stats-creator-row">
                <span className="stats-creator-name">{name}</span>
                <div className="stats-creator-bar-bg">
                  <div
                    className="stats-creator-bar"
                    style={{ width: `${(count / stats.todayCount) * 100}%` }}
                  />
                </div>
                <span className="stats-creator-count">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Weekly averages */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Promedio semanal</h3>
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-value">{stats.weekAvgCount}</div>
          <div className="stats-card-label">Tomas/día</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{stats.weekAvgMl}<small>ml</small></div>
          <div className="stats-card-label">ml/día</div>
        </div>
      </div>

      {/* Chart */}
      <div className="stats-chart-header">
        <h3 className="stats-title">Últimos {chartRange} días</h3>
        <div className="stats-range-toggle">
          <button
            className={`range-btn ${chartRange === 7 ? 'active' : ''}`}
            onClick={() => setChartRange(7)}
          >
            7d
          </button>
          <button
            className={`range-btn ${chartRange === 30 ? 'active' : ''}`}
            onClick={() => setChartRange(30)}
          >
            30d
          </button>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-bars">
          {stats.days.map((day, i) => (
            <div className="chart-col" key={i}>
              {chartRange <= 7 && (
                <div className="chart-ml-label">{day.totalMl > 0 ? day.totalMl : ''}</div>
              )}
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
                {day.isToday ? 'Hoy' : chartRange <= 7 ? day.label : (i % 5 === 0 ? day.label : '')}
              </div>
              {chartRange <= 7 && (
                <div className="chart-count">{day.count}t</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: color }} />
            {type}
          </div>
        ))}
      </div>
    </div>
  )
}
