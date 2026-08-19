import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

const NotifCountContext = createContext({ unreadCount: 0, refreshUnread: () => {} })

/**
 * Provides a shared unread-notification count for CUSTOMER users.
 * Polls /notifications/unread-count every 30 s; refreshUnread() forces an
 * immediate refresh (call it after marking notifications as read).
 */
export function NotifCountProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnread = useCallback(() => {
    if (!user || user.role !== 'CUSTOMER') { setUnreadCount(0); return }
    api.get('/notifications/unread-count')
      .then(res => setUnreadCount(res.data?.count ?? 0))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    refreshUnread()
    if (!user || user.role !== 'CUSTOMER') return
    const id = setInterval(refreshUnread, 30000)
    return () => clearInterval(id)
  }, [refreshUnread])

  return (
    <NotifCountContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotifCountContext.Provider>
  )
}

export const useNotifCount = () => useContext(NotifCountContext)
