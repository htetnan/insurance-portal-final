import { useTranslation } from 'react-i18next'
import NotificationsPage from '../../components/NotificationsPage'

export default function CustomerNotificationsPage() {
  const { t } = useTranslation()
  return <NotificationsPage subtitle={t('notif.customerSubtitle')} />
}
