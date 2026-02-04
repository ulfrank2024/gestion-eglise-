import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdTrendingUp, MdPeople, MdChurch, MdAccessTime,
  MdLogin, MdToday, MdRefresh, MdFilterList,
  MdKeyboardArrowDown, MdKeyboardArrowUp
} from 'react-icons/md';

function SuperAdminActivityPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30); // Jours

  // Données
  const [summary, setSummary] = useState(null);
  const [churchStats, setChurchStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  // Filtres
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [expandedChurch, setExpandedChurch] = useState(null);

  // Onglet actif
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, churchData, userData, logsData] = await Promise.all([
        api.superAdmin.getActivitySummary(period),
        api.superAdmin.getActivityByChurches(period),
        api.superAdmin.getActivityByUsers(period),
        api.superAdmin.getActivityLogs({ limit: 50 })
      ]);

      setSummary(summaryData);
      setChurchStats(churchData);
      setUserStats(userData);
      setRecentLogs(logsData);
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return lang === 'fr' ? 'À l\'instant' : 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}j`;
  };

  const getActionLabel = (action) => {
    const labels = {
      login: lang === 'fr' ? 'Connexion' : 'Login',
      logout: lang === 'fr' ? 'Déconnexion' : 'Logout',
      create: lang === 'fr' ? 'Création' : 'Create',
      update: lang === 'fr' ? 'Modification' : 'Update',
      delete: lang === 'fr' ? 'Suppression' : 'Delete',
      view: lang === 'fr' ? 'Consultation' : 'View',
      send_email: lang === 'fr' ? 'Envoi email' : 'Send email',
      checkin: 'Check-in',
      register: lang === 'fr' ? 'Inscription' : 'Register'
    };
    return labels[action] || action;
  };

  const getModuleLabel = (module) => {
    const labels = {
      auth: lang === 'fr' ? 'Authentification' : 'Authentication',
      events: lang === 'fr' ? 'Événements' : 'Events',
      members: lang === 'fr' ? 'Membres' : 'Members',
      meetings: lang === 'fr' ? 'Réunions' : 'Meetings',
      announcements: lang === 'fr' ? 'Annonces' : 'Announcements',
      settings: lang === 'fr' ? 'Paramètres' : 'Settings',
      team: lang === 'fr' ? 'Équipe' : 'Team',
      dashboard: lang === 'fr' ? 'Tableau de bord' : 'Dashboard'
    };
    return labels[module] || module;
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        {t('loading')}...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {t('super_admin_activity.title')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('super_admin_activity.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur de période */}
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value={7}>{t('super_admin_activity.last_7_days') || '7 derniers jours'}</option>
            <option value={30}>{t('super_admin_activity.last_30_days') || '30 derniers jours'}</option>
            <option value={90}>{t('super_admin_activity.last_90_days') || '90 derniers jours'}</option>
          </select>

          <button
            onClick={fetchData}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            title={t('refresh') || 'Actualiser'}
          >
            <MdRefresh size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Cartes de statistiques */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MdTrendingUp size={24} />
              </div>
              <div>
                <p className="text-indigo-100 text-sm">{t('super_admin_activity.total_actions') || 'Actions totales'}</p>
                <p className="text-2xl font-bold">{summary.total_actions?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MdChurch size={24} />
              </div>
              <div>
                <p className="text-green-100 text-sm">{t('super_admin_activity.active_churches') || 'Églises actives'}</p>
                <p className="text-2xl font-bold">{summary.active_churches || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MdPeople size={24} />
              </div>
              <div>
                <p className="text-amber-100 text-sm">{t('super_admin_activity.active_users') || 'Utilisateurs actifs'}</p>
                <p className="text-2xl font-bold">{summary.active_users || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <MdLogin size={24} />
              </div>
              <div>
                <p className="text-purple-100 text-sm">{t('super_admin_activity.logins') || 'Connexions'}</p>
                <p className="text-2xl font-bold">{summary.login_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {t('super_admin_activity.overview') || 'Vue d\'ensemble'}
        </button>
        <button
          onClick={() => setActiveTab('churches')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'churches'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {t('super_admin_activity.by_church') || 'Par église'}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {t('super_admin_activity.by_user') || 'Par utilisateur'}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {t('super_admin_activity.recent_logs') || 'Logs récents'}
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activité par module */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              {t('super_admin_activity.by_module') || 'Activité par module'}
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.by_module || {})
                .sort(([, a], [, b]) => b - a)
                .map(([module, count]) => {
                  const percentage = Math.round((count / summary.total_actions) * 100);
                  return (
                    <div key={module}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{getModuleLabel(module)}</span>
                        <span className="text-gray-400">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Activité par action */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              {t('super_admin_activity.by_action') || 'Activité par action'}
            </h3>
            <div className="space-y-3">
              {Object.entries(summary.by_action || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([action, count]) => {
                  const percentage = Math.round((count / summary.total_actions) * 100);
                  return (
                    <div key={action}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{getActionLabel(action)}</span>
                        <span className="text-gray-400">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'churches' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('church') || 'Église'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.total_actions') || 'Actions'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.unique_users') || 'Utilisateurs'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.logins') || 'Connexions'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.last_24h') || '24h'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.last_7d') || '7j'}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                  {t('super_admin_activity.last_activity') || 'Dernière activité'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {churchStats.map((church) => (
                <tr key={church.church_id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-100">{church.church_name}</p>
                      <p className="text-sm text-gray-400">{church.subdomain}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {church.total_actions}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {church.unique_users}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {church.login_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      church.actions_last_24h > 0
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {church.actions_last_24h}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      church.actions_last_7d > 0
                        ? 'bg-blue-900/50 text-blue-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {church.actions_last_7d}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">
                    {formatRelativeTime(church.last_activity)}
                  </td>
                </tr>
              ))}
              {churchStats.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    {t('super_admin_activity.no_data') || 'Aucune donnée disponible'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('user') || 'Utilisateur'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('church') || 'Église'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.total_actions') || 'Actions'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.logins') || 'Connexions'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                  {t('super_admin_activity.active_days') || 'Jours actifs'}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                  {t('super_admin_activity.last_activity') || 'Dernière activité'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {userStats.map((user, index) => (
                <tr key={user.user_id || index} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-100">{user.user_name || '-'}</p>
                      <p className="text-sm text-gray-400">{user.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {user.church_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {user.total_actions}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {user.login_count}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {user.active_days}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">
                    {formatRelativeTime(user.last_activity)}
                  </td>
                </tr>
              ))}
              {userStats.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    {t('super_admin_activity.no_data') || 'Aucune donnée disponible'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('date') || 'Date'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('user') || 'Utilisateur'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('church') || 'Église'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('module') || 'Module'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('action') || 'Action'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                  {t('details') || 'Détails'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300">{log.user_name || log.user_email || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {log.church_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                      {getModuleLabel(log.module)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.action === 'delete' ? 'bg-red-900/50 text-red-400' :
                      log.action === 'create' ? 'bg-green-900/50 text-green-400' :
                      log.action === 'login' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                    {log.entity_name || '-'}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    {t('super_admin_activity.no_logs') || 'Aucun log disponible'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SuperAdminActivityPage;
