import { useTranslation } from 'react-i18next'
import NotificationsPage from '../../components/NotificationsPage'

export default function AgentNotificationsPage() {
  const { t } = useTranslation()
  return (
    <NotificationsPage subtitle={t('agent.notif.subtitle')} />
  )
}
