import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdAnnouncement, MdCalendarToday } from 'react-icons/md';

function MemberAnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await api.member.getAnnouncements();
        setAnnouncements(data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="text-gray-300">{t('loading')}...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdAnnouncement className="text-3xl text-pink-400" />
        <h1 className="text-2xl font-bold text-white">{t('announcements')}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdAnnouncement className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_announcements')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-5 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {lang === 'fr' ? announcement.title_fr : announcement.title_en}
                  </h3>
                  {announcement.published_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MdCalendarToday size={14} />
                      {new Date(announcement.published_at).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-US',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {lang === 'fr' ? announcement.content_fr : announcement.content_en}
                </p>

                {/* Expiration notice */}
                {announcement.expires_at && (
                  <p className="mt-4 text-xs text-amber-400 flex items-center gap-1">
                    <MdCalendarToday size={12} />
                    {t('expires')} {new Date(announcement.expires_at).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US'
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberAnnouncementsPage;
