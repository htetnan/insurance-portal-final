import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout'
import { useNotifCount } from '../../context/NotifCountContext'

export default function CustomerLayout() {
  const { t } = useTranslation()
  const { unreadCount } = useNotifCount()

  const links = [
    { to: '/customer/dashboard',     icon: 'bi-speedometer2',         label: t('sidebar.dashboard')    },
    { to: '/customer/policies',      icon: 'bi-shield-check',          label: t('sidebar.policies')     },
    { to: '/customer/applications',  icon: 'bi-file-earmark-text',    label: t('sidebar.applications') },
    { to: '/customer/apply',         icon: 'bi-plus-circle',           label: t('sidebar.apply')        },
    { to: '/customer/claims',        icon: 'bi-file-earmark-medical', label: t('sidebar.claims')       },
    { to: '/customer/submit-claim',  icon: 'bi-plus-circle-dotted',   label: t('sidebar.submitClaim')  },
    { to: '/customer/payments',      icon: 'bi-credit-card',           label: t('sidebar.payments')     },
    { to: '/customer/notifications', icon: 'bi-bell',                  label: t('sidebar.notifications'), badge: true },
    { to: '/customer/feedback',      icon: 'bi-chat-heart',            label: t('sidebar.feedback')     },
    { to: '/customer/profile',       icon: 'bi-person-circle',         label: t('sidebar.profile')      },
  ]

  return <DashboardLayout title={t('layout.customerPortal')} links={links} externalBadge={unreadCount} />
}
