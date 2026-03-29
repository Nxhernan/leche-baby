import { useCallback, useRef } from 'react'

export function useNotifications(enabled = true) {
  const timeoutRef = useRef(null)

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  const scheduleNotification = useCallback((delayMs, title, body) => {
    if (!enabled) return
    // Clear any existing scheduled notification
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      const hasPermission = await requestPermission()
      if (!hasPermission) return

      // Try vibrating to wake up
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300])
      }

      new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'leche-baby-reminder',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
      })
    }, delayMs)
  }, [enabled, requestPermission])

  const cancelNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return { requestPermission, scheduleNotification, cancelNotification }
}
