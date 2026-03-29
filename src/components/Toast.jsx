import { useEffect } from 'react'

export default function Toast({ message, onUndo, duration = 5000, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [duration, onDismiss])

  return (
    <div className="toast">
      <span>{message}</span>
      {onUndo && <button onClick={onUndo}>Deshacer</button>}
    </div>
  )
}
