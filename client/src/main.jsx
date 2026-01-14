import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n'; // Importation de la configuration i18n
import { I18nextProvider } from 'react-i18next'; // Importation de I18nextProvider
import i18n from './i18n';
import './index.css'; // Importation du fichier CSS principal

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Admin Pages
import AdminLoginPage from './pages/AdminLoginPage';
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
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/:churchId" element={<PublicLayout />}>
            <Route index element={<PublicEventsListPage />} />
            <Route path="event/:id" element={<EventPage />} />
            <Route path="welcome/:id" element={<WelcomeCheckinPage />} />
            <Route path="checkin-success" element={<CheckinSuccessPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Fallback for old root public routes (optional, can be removed after migration) */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<PublicEventsListPage />} />
            <Route path="event/:id" element={<EventPage />} />
            <Route path="welcome/:id" element={<WelcomeCheckinPage />} />
            <Route path="checkin-success" element={<CheckinSuccessPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Admin Login - No Layout */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

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
        </Routes>
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>
);