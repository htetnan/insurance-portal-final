import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { NotifCountProvider } from './context/NotifCountContext'
import ProtectedRoute from './components/ProtectedRoute'

// Public pages
import HomePage from './pages/HomePage'
import PlansPage from './pages/PlansPage'
import HowItWorksPage from './pages/HowItWorksPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TermsPage from './pages/TermsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Customer pages
import CustomerLayout from './pages/customer/CustomerLayout'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MyApplicationsPage from './pages/customer/MyApplicationsPage'
import MyClaimsPage from './pages/customer/MyClaimsPage'
import MyPaymentsPage from './pages/customer/MyPaymentsPage'
import CustomerNotificationsPage from './pages/customer/CustomerNotificationsPage'
import CustomerPoliciesPage from './pages/customer/CustomerPoliciesPage'
import ApplyPolicyPage from './pages/customer/ApplyPolicyPage'
import SubmitClaimPage from './pages/customer/SubmitClaimPage'
import CustomerProfilePage from './pages/customer/CustomerProfilePage'
import SendFeedbackPage from './pages/customer/SendFeedbackPage'

// Agent pages
import AgentLoginPage from './pages/agent/AgentLoginPage'
import AgentLayout from './pages/agent/AgentLayout'
import AgentDashboard from './pages/agent/AgentDashboard'
import AgentApplicationsPage from './pages/agent/AgentApplicationsPage'
import AgentClaimsPage from './pages/agent/AgentClaimsPage'
import AgentNotificationsPage from './pages/agent/AgentNotificationsPage'
import AgentProfilePage from './pages/agent/AgentProfilePage'
import AgentMessagesPage from './pages/agent/AgentMessagesPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManagePackagesPage from './pages/admin/ManagePackagesPage'
import ManageInsuranceTypesPage from './pages/admin/ManageInsuranceTypesPage'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage'
import AdminClaimsPage from './pages/admin/AdminClaimsPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import AdminFormBuilderPage from './pages/admin/AdminFormBuilderPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage'
import AdminPaymentMethodsPage from './pages/admin/AdminPaymentMethodsPage'
import AdminPremiumSchedulePage from './pages/admin/AdminPremiumSchedulePage'
import AdminAutoCheckPage from './pages/admin/AdminAutoCheckPage'
import AdminSalaryPage from './pages/admin/AdminSalaryPage'
import AdminPredictionPage from './pages/admin/AdminPredictionPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotifCountProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-email/confirm" element={<ConfirmEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer */}
            <Route path="/customer" element={<ProtectedRoute role="CUSTOMER"><CustomerLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="policies" element={<CustomerPoliciesPage />} />
              <Route path="applications" element={<MyApplicationsPage />} />
              <Route path="apply" element={<ApplyPolicyPage />} />
              <Route path="claims" element={<MyClaimsPage />} />
              <Route path="submit-claim" element={<SubmitClaimPage />} />
              <Route path="payments" element={<MyPaymentsPage />} />
              <Route path="notifications" element={<CustomerNotificationsPage />} />
              <Route path="feedback" element={<SendFeedbackPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Agent */}
            <Route path="/agent/login" element={<AgentLoginPage />} />
            <Route path="/agent" element={<ProtectedRoute role="AGENT"><AgentLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AgentDashboard />} />
              <Route path="applications" element={<AgentApplicationsPage />} />
              <Route path="claims" element={<AgentClaimsPage />} />
              <Route path="messages" element={<AgentMessagesPage />} />
              <Route path="notifications" element={<AgentNotificationsPage />} />
              <Route path="profile" element={<AgentProfilePage />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="insurance-types" element={<ManageInsuranceTypesPage />} />
              <Route path="packages" element={<ManagePackagesPage />} />
              <Route path="users" element={<ManageUsersPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="claims" element={<AdminClaimsPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="premium-schedule" element={<AdminPremiumSchedulePage />} />
              <Route path="forms" element={<AdminFormBuilderPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="feedback" element={<AdminFeedbackPage />} />
              <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
              <Route path="autocheck" element={<AdminAutoCheckPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="salary" element={<AdminSalaryPage />} />
              <Route path="predictions" element={<AdminPredictionPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </NotifCountProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
