import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdNotifications, MdCheck, MdInfo, MdWarning, MdCheckCircle,
  MdMarkEmailRead, MdFilterList
} from 'react-icons/md';

function MemberNotificationsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.member.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.member.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.member.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return <MdWarning className="text-amber-400" />;
      case 'success':
        return <MdCheckCircle className="text-green-400" />;
      default:
        return <MdInfo className="text-indigo-400" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning':
        return 'border-l-amber-500';
      case 'success':
        return 'border-l-green-500';
      default:
        return 'border-l-indigo-500';
    }
  };

  // Dériver les mois disponibles depuis les données
  const availableMonths = useMemo(() => {
    const months = new Set();
    notifications.forEach(n => {
      if (n.created_at) {
        const d = new Date(n.created_at);
        if (!isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [notifications]);

  // Filtrer les notifications par mois sélectionné
  const filteredNotifications = useMemo(() => {
    if (selectedMonth === 'all') return notifications;
    return notifications.filter(n => {
      if (!n.created_at) return false;
      const d = new Date(n.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [notifications, selectedMonth]);

  const formatMonthLabel = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  };

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;
  const totalUnread = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Titre + badge */}
        <div className="flex items-center gap-3">
          <MdNotifications className="text-3xl text-amber-400 flex-shrink-0" />
          <h1 className="text-2xl font-bold text-white">{t('my_notifications')}</h1>
          {totalUnread > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              {totalUnread}
            </span>
          )}
        </div>

        {/* Actions: filtre mois + bouton tout marquer */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre par mois */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <MdFilterList className="text-gray-400 flex-shrink-0" size={18} />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-gray-300 text-sm focus:outline-none cursor-pointer"
              >
                <option value="all">{t('all_months') || 'Tous les mois'}</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Bouton tout marquer comme lu */}
          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm whitespace-nowrap"
            >
              <MdMarkEmailRead size={18} className="flex-shrink-0" />
              <span className="hidden sm:inline">{t('mark_all_read')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Compteur filtré */}
      {selectedMonth !== 'all' && (
        <p className="text-sm text-gray-400">
          {filteredNotifications.length} {t('notifications') || 'notification(s)'} — {formatMonthLabel(selectedMonth)}
          {unreadCount > 0 && (
            <span className="ml-2 text-red-400">({unreadCount} {t('unread') || 'non lue(s)'})</span>
          )}
        </p>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdNotifications className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_notifications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-gray-800 rounded-xl border border-gray-700 border-l-4 ${getTypeColor(notification.type)} overflow-hidden transition-all ${
                !notification.is_read ? 'bg-gray-800' : 'bg-gray-800/50'
              }`}
            >
              <div className="p-4 flex items-start gap-3">
                {/* Type Icon */}
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-medium text-sm sm:text-base ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
                        {lang === 'fr' ? notification.title_fr : notification.title_en}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 break-words">
                        {lang === 'fr' ? notification.message_fr : notification.message_en}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-US',
                          { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                    </div>

                    {/* Mark as Read Button */}
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('mark_as_read')}
                      >
                        <MdCheck size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberNotificationsPage;
