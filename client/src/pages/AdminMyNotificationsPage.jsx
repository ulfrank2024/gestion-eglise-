import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MdNotifications, MdNotificationsNone, MdMarkEmailRead,
  MdDeleteOutline, MdEvent, MdGroups, MdMusicNote,
  MdBadge, MdAnnouncement, MdInfo
} from 'react-icons/md';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const TYPE_CONFIG = {
  event:        { icon: MdEvent,         color: 'text-indigo-400', bg: 'bg-indigo-900/30 border-indigo-700' },
  meeting:      { icon: MdGroups,        color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-700' },
  role:         { icon: MdBadge,         color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-700' },
  announcement: { icon: MdAnnouncement,  color: 'text-amber-400',  bg: 'bg-amber-900/30 border-amber-700' },
  choir:        { icon: MdMusicNote,     color: 'text-pink-400',   bg: 'bg-pink-900/30 border-pink-700' },
  info:         { icon: MdInfo,          color: 'text-gray-400',   bg: 'bg-gray-700/50 border-gray-600' },
};

export default function AdminMyNotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'en' ? 'en' : 'fr';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getMyNotifications();
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.admin.markMyNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silencieux */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.admin.markAllMyNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silencieux */ }
  };

  const getTitle = (n) => lang === 'fr' ? n.title_fr : (n.title_en || n.title_fr);
  const getMessage = (n) => lang === 'fr' ? n.message_fr : (n.message_en || n.message_fr);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <MdNotifications size={28} className="text-indigo-400" />
            {t('my_notifications') || 'Mes Notifications'}
          </h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {unreadCount} {t('unread') || 'non lue(s)'}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            <MdMarkEmailRead size={18} />
            {t('mark_all_read') || 'Tout marquer lu'}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {['all', 'unread'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {f === 'all' ? (t('all') || 'Toutes') : (t('unread') || 'Non lues')}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdNotificationsNone size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">
            {filter === 'unread'
              ? (t('no_unread_notifications') || 'Aucune notification non lue')
              : (t('no_notifications') || 'Aucune notification')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    : `${config.bg} hover:brightness-110`
                }`}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                  if (n.link) navigate(n.link);
                }}
              >
                {/* Icône type */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-gray-700' : 'bg-gray-800/50'
                }`}>
                  <Icon size={20} className={n.is_read ? 'text-gray-500' : config.color} />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                    {getTitle(n)}
                  </p>
                  {getMessage(n) && (
                    <p className={`text-sm mt-0.5 ${n.is_read ? 'text-gray-500' : 'text-gray-300'}`}>
                      {getMessage(n)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatDate(n.created_at)}</p>
                </div>

                {/* Badge non lu */}
                <div className="flex flex-col items-end gap-2">
                  {!n.is_read && (
                    <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full shrink-0 mt-1" />
                  )}
                  {!n.is_read && (
                    <button
                      onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                      className="text-gray-500 hover:text-indigo-400 transition-colors"
                      title={t('mark_as_read') || 'Marquer comme lu'}
                    >
                      <MdMarkEmailRead size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
