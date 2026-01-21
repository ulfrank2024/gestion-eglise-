import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n'; // Importation de la configuration i18n
import { I18nextProvider } from 'react-i18next'; // Importation de I18nextProvider
import i18n from './i18n';
import './index.css'; // Importation du fichier CSS principal
import { ToastProvider } from './components/Toast'; // Système de notifications toast

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Admin Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminForgotPasswordPage from './pages/AdminForgotPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage'; // Nouvelle page de dashboard
import AdminEventsListPage from './pages/AdminEventsListPage'; // Ancienne AdminDashboardPage renommée
import AdminEventNewPage from './pages/AdminEventNewPage';
import AdminEventDetailPage from './pages/AdminEventDetailPage';
import AdminStatisticsPage from './pages/AdminStatisticsPage'; // Nouvelle page de statistiques
import AdminEventHistoryPage from './pages/AdminEventHistoryPage'; // Nouvelle page d'historique
import AdminAllAttendeesPage from './pages/AdminAllAttendeesPage'; // Nouvelle page pour tous les participants
import AdminAllChurchesPage from './pages/AdminAllChurchesPage'; // Nouvelle page pour la gestion des églises par le Super-Admin
import AdminChurchSettingsPage from './pages/AdminChurchSettingsPage'; // Nouvelle page pour les paramètres de l'église
import AdminChurchUsersPage from './pages/AdminChurchUsersPage'; // Nouvelle page pour la gestion des utilisateurs de l'église

// Admin Pages - Module Membres
import AdminMembersListPage from './pages/AdminMembersListPage';
import AdminRolesPage from './pages/AdminRolesPage';
import AdminMemberInvitationsPage from './pages/AdminMemberInvitationsPage';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';

// Member Pages
import MemberRegistrationPage from './pages/MemberRegistrationPage';
import MemberLayout from './layouts/MemberLayout';
import MemberLoginPage from './pages/MemberLoginPage';
import MemberForgotPasswordPage from './pages/MemberForgotPasswordPage';

// Password Reset (shared)
import ResetPasswordPage from './pages/ResetPasswordPage';
import MemberDashboardPage from './pages/MemberDashboardPage';
import MemberProfilePage from './pages/MemberProfilePage';
import MemberEventsPage from './pages/MemberEventsPage';
import MemberRolesPage from './pages/MemberRolesPage';
import MemberNotificationsPage from './pages/MemberNotificationsPage';
import MemberAnnouncementsPage from './pages/MemberAnnouncementsPage';

// Super Admin Pages
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import SuperAdminEventsPage from './pages/SuperAdminEventsPage';
import SuperAdminEventsByChurchPage from './pages/SuperAdminEventsByChurchPage';
import SuperAdminStatisticsPage from './pages/SuperAdminStatisticsPage';
import SuperAdminChurchDetailPage from './pages/SuperAdminChurchDetailPage';
import ChurchRegistrationPage from './pages/ChurchRegistrationPage';

// Public Pages
import EventPage from './pages/EventPage';
import NotFoundPage from './pages/NotFoundPage';
import PublicEventsListPage from './pages/PublicEventsListPage'; // Nouvelle page de liste des événements publics
import CheckinSuccessPage from './pages/CheckinSuccessPage';
import WelcomeCheckinPage from './pages/WelcomeCheckinPage'; // Importer la nouvelle page

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          {/* Admin Login - No Layout (MUST be before /:churchId to avoid conflict) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

          {/* Super Admin Login - No Layout */}
          <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

          {/* Church Registration - No Layout */}
          <Route path="/church-register/:token" element={<ChurchRegistrationPage />} />

          {/* Admin Routes with Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} /> {/* Le nouveau Dashboard sera la page par défaut */}
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="events" element={<AdminEventsListPage />} />
            <Route path="events/new" element={<AdminEventNewPage />} />
            <Route path="events/:id" element={<AdminEventDetailPage />} />
            <Route path="history" element={<AdminEventHistoryPage />} /> {/* Nouvelle route pour l'historique */}
            <Route path="statistics" element={<AdminStatisticsPage />} />
            <Route path="all-attendees" element={<AdminAllAttendeesPage />} />
            <Route path="churches" element={<AdminAllChurchesPage />} /> {/* Nouvelle route pour la gestion des églises */}
            <Route path="church-settings" element={<AdminChurchSettingsPage />} /> {/* Nouvelle route pour les paramètres de l'église */}
            <Route path="church-users" element={<AdminChurchUsersPage />} /> {/* Nouvelle route pour la gestion des utilisateurs de l'église */}
            {/* Module Membres */}
            <Route path="members" element={<AdminMembersListPage />} />
            <Route path="roles" element={<AdminRolesPage />} />
            <Route path="member-invitations" element={<AdminMemberInvitationsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
          </Route>

          {/* Super Admin Routes with Layout */}
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboardPage />} />
            <Route path="dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="events" element={<SuperAdminEventsPage />} />
            <Route path="events/:churchId" element={<SuperAdminEventsByChurchPage />} />
            <Route path="events/:churchId/details/:id" element={<AdminEventDetailPage />} />
            <Route path="statistics" element={<SuperAdminStatisticsPage />} />
            <Route path="churches/:churchId" element={<SuperAdminChurchDetailPage />} />
          </Route>

          {/* Member Login - No Layout */}
          <Route path="/member/login" element={<MemberLoginPage />} />
          <Route path="/member/forgot-password" element={<MemberForgotPasswordPage />} />
          <Route path="/member/reset-password" element={<ResetPasswordPage />} />

          {/* Member Dashboard Routes with Layout */}
          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<MemberDashboardPage />} />
            <Route path="dashboard" element={<MemberDashboardPage />} />
            <Route path="profile" element={<MemberProfilePage />} />
            <Route path="events" element={<MemberEventsPage />} />
            <Route path="roles" element={<MemberRolesPage />} />
            <Route path="notifications" element={<MemberNotificationsPage />} />
            <Route path="announcements" element={<MemberAnnouncementsPage />} />
          </Route>

          {/* Member Registration - Public (must be before /:churchId routes) */}
          <Route path="/:churchId/join" element={<MemberRegistrationPage />} />
          <Route path="/:churchId/join/:token" element={<MemberRegistrationPage />} />

          {/* Public Routes - MUST be after admin/super-admin routes to avoid capturing /admin as /:churchId */}
          <Route path="/:churchId" element={<PublicLayout />}>
            <Route index element={<PublicEventsListPage />} />
            <Route path="event/:id" element={<EventPage />} />
            <Route path="welcome/:id" element={<WelcomeCheckinPage />} />
            <Route path="checkin-success" element={<CheckinSuccessPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Root fallback */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<PublicEventsListPage />} />
            <Route path="event/:id" element={<EventPage />} />
            <Route path="welcome/:id" element={<WelcomeCheckinPage />} />
            <Route path="checkin-success" element={<CheckinSuccessPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </I18nextProvider>
  </React.StrictMode>
);