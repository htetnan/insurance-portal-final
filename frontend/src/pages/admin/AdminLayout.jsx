import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout'

export default function AdminLayout() {
  const { t } = useTranslation()

  const links = [
    { to: '/admin/dashboard',        icon: 'bi-speedometer2',         label: t('admin.layout.dashboard')         },
    { to: '/admin/insurance-types',  icon: 'bi-tags',                 label: t('admin.layout.insuranceTypes')    },
    { to: '/admin/packages',         icon: 'bi-box-seam',             label: t('admin.layout.insurancePackages') },
    { to: '/admin/users',            icon: 'bi-people',               label: t('admin.layout.manageUsers')       },
    { to: '/admin/forms',            icon: 'bi-ui-checks',            label: t('admin.layout.formTemplates')     },
    { to: '/admin/applications',     icon: 'bi-file-earmark-text',    label: t('admin.layout.applications')      },
    { to: '/admin/claims',           icon: 'bi-file-earmark-medical', label: t('admin.layout.claims')            },
    { to: '/admin/payments',         icon: 'bi-credit-card',          label: t('admin.layout.payments')          },
    { to: '/admin/premium-schedule', icon: 'bi-calendar2-check',      label: t('admin.layout.premiumSchedule')   },
    { to: '/admin/payment-methods',  icon: 'bi-qr-code',              label: t('admin.layout.paymentMethods')    },
    { to: '/admin/feedback',         icon: 'bi-chat-heart',           label: t('admin.layout.customerFeedback'), badge: true },
    { to: '/admin/notifications',    icon: 'bi-bell',                 label: t('admin.layout.notifications')     },
    { to: '/admin/autocheck',        icon: 'bi-robot',                label: t('admin.layout.autoCheck')         },
    { to: '/admin/reports',          icon: 'bi-bar-chart-line',       label: t('admin.layout.reports')           },
    { to: '/admin/predictions',      icon: 'bi-cpu-fill',             label: t('admin.layout.predictions')       },
    { to: '/admin/salary',           icon: 'bi-cash-stack',           label: t('admin.layout.salary')            },
    { to: '/admin/profile',          icon: 'bi-person-circle',        label: t('admin.layout.myProfile')         },
  ]

  return (
    <DashboardLayout
      title={t('admin.layout.adminPanel')}
      links={links}
      badgeApi={{ url: '/admin/feedback/unread-count' }}
    />
  )
}
