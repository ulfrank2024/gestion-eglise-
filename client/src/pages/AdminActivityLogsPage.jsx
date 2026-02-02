import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import {
  MdHistory, MdEvent, MdPeople, MdStar, MdSettings,
  MdNotifications, MdEmail, MdPersonAdd, MdFilterList,
  MdAdd, MdEdit, MdDelete, MdArchive, MdPublish,
  MdUnpublished, MdAssignment, MdRemoveCircle, MdRefresh
} from 'react-icons/md';

function AdminActivityLogsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [churchId, setChurchId] = useState(null);

  // Filtres
  const [moduleFilter, setModuleFilter] = useState('');
  const [limit, setLimit] = useState(50);

  const fetchLogs = async (currentChurchId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getActivityLogs(currentChurchId, {
        module: moduleFilter || undefined,
        limit
      });
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err.response?.data?.error || err.message || t('error_fetching_logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }

        // Seul l'admin principal peut voir les logs
        if (!userInfo.is_main_admin) {
          setError(t('only_main_admin_can_view_logs') || 'Seul l\'administrateur principal peut consulter les journaux.');
          setLoading(false);
          return;
        }

        setChurchId(currentChurchId);
        fetchLogs(currentChurchId);
      } catch (err) {
        console.error('Error:', err);
        setError(t('error_church_id_missing'));
        setLoading(false);
      }
    };

    initPage();
  }, [t]);

  useEffect(() => {
    if (churchId) {
      fetchLogs(churchId);
    }
  }, [moduleFilter, limit, churchId]);

  const getModuleIcon = (module) => {
    const icons = {
      events: <MdEvent className="text-green-400" />,
      members: <MdPeople className="text-blue-400" />,
      roles: <MdStar className="text-yellow-400" />,
      announcements: <MdNotifications className="text-purple-400" />,
      invitations: <MdEmail className="text-pink-400" />,
      settings: <MdSettings className="text-gray-400" />,
      team: <MdPersonAdd className="text-indigo-400" />
    };
    return icons[module] || <MdHistory className="text-gray-400" />;
  };

  const getModuleLabel = (module) => {
    const labels = {
      events: t('events') || 'Événements',
      members: t('members') || 'Membres',
      roles: t('roles') || 'Rôles',
      announcements: t('announcements') || 'Annonces',
      invitations: t('invitations') || 'Invitations',
      settings: t('settings') || 'Paramètres',
      team: t('team') || 'Équipe'
    };
    return labels[module] || module;
  };

  const getActionIcon = (action) => {
    const icons = {
      create: <MdAdd className="text-green-400" size={16} />,
      update: <MdEdit className="text-blue-400" size={16} />,
      delete: <MdDelete className="text-red-400" size={16} />,
      archive: <MdArchive className="text-amber-400" size={16} />,
      publish: <MdPublish className="text-green-400" size={16} />,
      unpublish: <MdUnpublished className="text-gray-400" size={16} />,
      invite: <MdEmail className="text-pink-400" size={16} />,
      assign: <MdAssignment className="text-indigo-400" size={16} />,
      unassign: <MdRemoveCircle className="text-orange-400" size={16} />,
      send_email: <MdEmail className="text-cyan-400" size={16} />
    };
    return icons[action] || <MdHistory className="text-gray-400" size={16} />;
  };

  const getActionLabel = (action) => {
    const labels = {
      create: t('action_create') || 'Créé',
      update: t('action_update') || 'Modifié',
      delete: t('action_delete') || 'Supprimé',
      archive: t('action_archive') || 'Archivé',
      publish: t('action_publish') || 'Publié',
      unpublish: t('action_unpublish') || 'Dépublié',
      invite: t('action_invite') || 'Invité',
      assign: t('action_assign') || 'Assigné',
      unassign: t('action_unassign') || 'Retiré',
      send_email: t('action_send_email') || 'Email envoyé'
    };
    return labels[action] || action;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdHistory className="text-3xl text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('activity_logs') || 'Journaux d\'activité'}</h1>
            <p className="text-gray-400 text-sm">
              {t('activity_logs_subtitle') || 'Historique des actions effectuées par les administrateurs'}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(churchId)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <MdRefresh />
          {t('refresh') || 'Actualiser'}
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-400" />
            <span className="text-gray-300 text-sm">{t('filter_by') || 'Filtrer par'}:</span>
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('all_modules') || 'Tous les modules'}</option>
            <option value="events">{t('events') || 'Événements'}</option>
            <option value="members">{t('members') || 'Membres'}</option>
            <option value="roles">{t('roles') || 'Rôles'}</option>
            <option value="announcements">{t('announcements') || 'Annonces'}</option>
            <option value="team">{t('team') || 'Équipe'}</option>
            <option value="settings">{t('settings') || 'Paramètres'}</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={25}>25 {t('entries') || 'entrées'}</option>
            <option value={50}>50 {t('entries') || 'entrées'}</option>
            <option value={100}>100 {t('entries') || 'entrées'}</option>
          </select>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <MdHistory className="mx-auto text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">{t('no_activity_logs') || 'Aucune activité enregistrée'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icône du module */}
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {getModuleIcon(log.module)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {log.user_name || log.user_email || 'Utilisateur inconnu'}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                        {getActionIcon(log.action)}
                        {getActionLabel(log.action)}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                        {getModuleLabel(log.module)}
                      </span>
                    </div>

                    {log.entity_name && (
                      <p className="text-gray-300 mt-1">
                        {log.entity_type && (
                          <span className="text-gray-500">{log.entity_type}: </span>
                        )}
                        <span className="font-medium">{log.entity_name}</span>
                      </p>
                    )}

                    {log.details && (
                      <p className="text-gray-500 text-sm mt-1">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{formatDate(log.created_at)}</span>
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
        <p className="text-sm text-indigo-300">
          <strong>Note:</strong> {t('activity_logs_note') || 'Les journaux d\'activité sont conservés pour des raisons de traçabilité et de sécurité. Ils permettent de suivre toutes les actions effectuées par les administrateurs.'}
        </p>
      </div>
    </div>
  );
}

export default AdminActivityLogsPage;
