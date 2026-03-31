import { useMemo, useState } from 'react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TYPE_COLORS = {
  'Materna': '#4ecca3',
  'Fórmula': '#e94560',
  'Mixta': '#ffd369',
}
const HOUR_BLOCKS = [
  { label: 'Madrugada', range: [0, 6], emoji: '🌙' },
  { label: 'Mañana', range: [6, 12], emoji: '🌅' },
  { label: 'Tarde', range: [12, 18], emoji: '☀️' },
  { label: 'Noche', range: [18, 24], emoji: '🌃' },
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

function getFeedingsForRange(feedings, daysBack) {
  const start = new Date()
  start.setDate(start.getDate() - daysBack)
  start.setHours(0, 0, 0, 0)
  return feedings.filter(f => f.timestamp >= start.getTime())
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
  const [chartRange, setChartRange] = useState(7)

  const stats = useMemo(() => {
    if (!feedings || feedings.length === 0) return null

    const todayFeedings = getFeedingsForDay(feedings, 0)
    const yesterdayFeedings = getFeedingsForDay(feedings, 1)
    const last7Feedings = getFeedingsForRange(feedings, 7)

    // Today basics
    const todayCount = todayFeedings.length
    const todayMl = todayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)
    const yesterdayMl = yesterdayFeedings.reduce((sum, f) => sum + (f.amount || 120), 0)

    // Intervals today
    let avgInterval = 0
    let longestInterval = 0
    let shortestInterval = Infinity
    const intervals = []
    if (todayFeedings.length >= 2) {
      let totalDiff = 0
      for (let i = 1; i < todayFeedings.length; i++) {
        const diff = todayFeedings[i].timestamp - todayFeedings[i - 1].timestamp
        intervals.push(diff)
        totalDiff += diff
        if (diff > longestInterval) longestInterval = diff
        if (diff < shortestInterval) shortestInterval = diff
      }
      avgInterval = totalDiff / (todayFeedings.length - 1)
    }
    if (shortestInterval === Infinity) shortestInterval = 0

    // Time since last feeding
    let timeSinceLast = 0
    if (todayFeedings.length > 0) {
      timeSinceLast = Date.now() - todayFeedings[todayFeedings.length - 1].timestamp
    }

    // Average amount per feeding today
    const avgAmountToday = todayCount > 0 ? Math.round(todayMl / todayCount) : 0

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
    const peakHour = hourDist.indexOf(Math.max(...hourDist))

    // Hour block distribution (today)
    const hourBlocks = HOUR_BLOCKS.map(block => {
      const blockFeedings = todayFeedings.filter(f => {
        const h = new Date(f.timestamp).getHours()
        return h >= block.range[0] && h < block.range[1]
      })
      const ml = blockFeedings.reduce((s, f) => s + (f.amount || 120), 0)
      return { ...block, count: blockFeedings.length, ml }
    })

    // Hourly heatmap (24h, all time)
    const maxHourCount = Math.max(...hourDist, 1)
    const hourHeatmap = hourDist.map((count, hour) => ({
      hour,
      count,
      intensity: count / maxHourCount,
    }))

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
    const last7Days = days.slice(-7)
    const daysWithData = last7Days.filter(d => d.count > 0)
    const weekAvgMl = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + d.totalMl, 0) / daysWithData.length)
      : 0
    const weekAvgCount = daysWithData.length > 0
      ? (daysWithData.reduce((s, d) => s + d.count, 0) / daysWithData.length).toFixed(1)
      : 0
    const weekTotalMl = last7Days.reduce((s, d) => s + d.totalMl, 0)

    // Global interval average (last 7 days)
    const sorted7 = [...last7Feedings].sort((a, b) => a.timestamp - b.timestamp)
    let globalAvgInterval = 0
    if (sorted7.length >= 2) {
      let total = 0
      for (let i = 1; i < sorted7.length; i++) {
        total += sorted7[i].timestamp - sorted7[i - 1].timestamp
      }
      globalAvgInterval = total / (sorted7.length - 1)
    }

    // Best day (most ml) and worst day (least ml, excluding days with 0)
    const daysNonZero = last7Days.filter(d => d.count > 0)
    const bestDay = daysNonZero.length > 0
      ? daysNonZero.reduce((best, d) => d.totalMl > best.totalMl ? d : best)
      : null
    const worstDay = daysNonZero.length > 1
      ? daysNonZero.reduce((worst, d) => d.totalMl < worst.totalMl ? d : worst)
      : null

    // Streak: consecutive days with at least 1 feeding
    let streak = 0
    for (let i = 0; i < 60; i++) {
      const dayF = getFeedingsForDay(feedings, i)
      if (dayF.length > 0) streak++
      else break
    }

    // Last 5 feedings timeline
    const recentFeedings = [...feedings]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)

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

    // Total all time
    const totalAllTime = feedings.length
    const totalMlAllTime = feedings.reduce((s, f) => s + (f.amount || 120), 0)

    return {
      todayCount, todayMl, avgInterval, longestInterval, shortestInterval,
      timeSinceLast, avgAmountToday,
      typeBreakdown, days, maxMl, peakHour, hourBlocks, hourHeatmap,
      weekAvgMl, weekAvgCount, weekTotalMl, globalAvgInterval,
      bestDay, worstDay, streak,
      recentFeedings,
      byCreator, mlDiff, countDiff,
      totalAllTime, totalMlAllTime,
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
          <div className="stats-card-value">{stats.avgAmountToday}<small>ml</small></div>
          <div className="stats-card-label">Prom/toma</div>
        </div>
      </div>

      {/* Time since last + interval */}
      <div className="stats-cards" style={{ marginTop: '8px' }}>
        <div className="stats-card">
          <div className="stats-card-value">{formatInterval(stats.timeSinceLast)}</div>
          <div className="stats-card-label">Desde última</div>
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

      {/* Hour distribution with ml */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Horarios de hoy</h3>
      <div className="stats-hour-blocks">
        {stats.hourBlocks.map(block => (
          <div key={block.label} className={`stats-hour-block ${block.count > 0 ? 'active' : ''}`}>
            <div className="stats-hour-emoji">{block.emoji}</div>
            <div className="stats-hour-count">{block.count}</div>
            <div className="stats-hour-label">{block.label}</div>
            {block.ml > 0 && <div className="stats-hour-ml">{block.ml}ml</div>}
          </div>
        ))}
      </div>

      {/* Hourly heatmap */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Mapa de calor (histórico)</h3>
      <div className="stats-heatmap">
        {stats.hourHeatmap.map(h => (
          <div
            key={h.hour}
            className="stats-heatmap-cell"
            style={{
              background: h.intensity > 0
                ? `rgba(78, 204, 163, ${0.15 + h.intensity * 0.85})`
                : 'var(--bg-secondary)',
            }}
            title={`${h.hour}:00 - ${h.count} tomas`}
          >
            <span className="heatmap-hour">{h.hour}</span>
            {h.count > 0 && <span className="heatmap-count">{h.count}</span>}
          </div>
        ))}
      </div>
      <div className="stats-peak-hour">
        Hora pico: <strong>{stats.peakHour}:00 - {stats.peakHour + 1}:00</strong>
      </div>

      {/* Recent feedings timeline */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Últimas tomas</h3>
      <div className="stats-timeline">
        {stats.recentFeedings.map((f, i) => (
          <div key={f.id || i} className="stats-timeline-item">
            <div className="timeline-dot" style={{ background: TYPE_COLORS[f.type] || '#888' }} />
            <div className="timeline-content">
              <div className="timeline-time">{formatTime(f.timestamp)}</div>
              <div className="timeline-detail">
                {f.amount || 120}ml {f.type || 'Fórmula'}
                {family?.memberNames?.[f.createdBy] && (
                  <span className="timeline-creator"> · {family.memberNames[f.createdBy]}</span>
                )}
              </div>
            </div>
            <div className="timeline-date">
              {new Date(f.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
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

      {/* Weekly summary */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Resumen semanal</h3>
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-value">{stats.weekAvgCount}</div>
          <div className="stats-card-label">Tomas/día</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{stats.weekAvgMl}<small>ml</small></div>
          <div className="stats-card-label">ml/día</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{formatInterval(stats.globalAvgInterval)}</div>
          <div className="stats-card-label">Intervalo prom.</div>
        </div>
      </div>
      <div className="stats-cards" style={{ marginTop: '8px' }}>
        <div className="stats-card">
          <div className="stats-card-value">{stats.weekTotalMl}<small>ml</small></div>
          <div className="stats-card-label">Total 7 días</div>
        </div>
        {stats.bestDay && (
          <div className="stats-card">
            <div className="stats-card-value best">{stats.bestDay.totalMl}<small>ml</small></div>
            <div className="stats-card-label">Mejor día</div>
            <div className="stats-card-sub">
              {stats.bestDay.isToday ? 'Hoy' : DAY_LABELS[stats.bestDay.date.getDay()]}
            </div>
          </div>
        )}
        {stats.worstDay && (
          <div className="stats-card">
            <div className="stats-card-value worst">{stats.worstDay.totalMl}<small>ml</small></div>
            <div className="stats-card-label">Menor día</div>
            <div className="stats-card-sub">
              {stats.worstDay.isToday ? 'Hoy' : DAY_LABELS[stats.worstDay.date.getDay()]}
            </div>
          </div>
        )}
      </div>

      {/* Streak */}
      {stats.streak > 1 && (
        <div className="stats-streak">
          <span className="streak-fire">🔥</span>
          <span>{stats.streak} días consecutivos registrando</span>
        </div>
      )}

      {/* Chart */}
      <div className="stats-chart-header">
        <h3 className="stats-title">Últimos {chartRange} días</h3>
        <div className="stats-range-toggle">
          <button className={`range-btn ${chartRange === 7 ? 'active' : ''}`} onClick={() => setChartRange(7)}>7d</button>
          <button className={`range-btn ${chartRange === 30 ? 'active' : ''}`} onClick={() => setChartRange(30)}>30d</button>
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
              {chartRange <= 7 && <div className="chart-count">{day.count}t</div>}
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

      {/* All time totals */}
      <h3 className="stats-title" style={{ marginTop: '20px' }}>Totales históricos</h3>
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-card-value">{stats.totalAllTime}</div>
          <div className="stats-card-label">Tomas totales</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{(stats.totalMlAllTime / 1000).toFixed(1)}<small>L</small></div>
          <div className="stats-card-label">Litros totales</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{stats.streak}</div>
          <div className="stats-card-label">Días racha</div>
        </div>
      </div>
    </div>
  )
}
