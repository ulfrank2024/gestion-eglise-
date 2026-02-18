import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { MdAnnouncement, MdCalendarToday, MdFilterList } from 'react-icons/md';

function MemberAnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

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

  // Dériver les mois disponibles depuis les données
  const availableMonths = useMemo(() => {
    const months = new Set();
    announcements.forEach(a => {
      const dateRef = a.published_at || a.created_at;
      if (dateRef) {
        const d = new Date(dateRef);
        if (!isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [announcements]);

  // Filtrer les annonces par mois sélectionné
  const filteredAnnouncements = useMemo(() => {
    if (selectedMonth === 'all') return announcements;
    return announcements.filter(a => {
      const dateRef = a.published_at || a.created_at;
      if (!dateRef) return false;
      const d = new Date(dateRef);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [announcements, selectedMonth]);

  const formatMonthLabel = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Titre */}
        <div className="flex items-center gap-3">
          <MdAnnouncement className="text-3xl text-pink-400 flex-shrink-0" />
          <h1 className="text-2xl font-bold text-white">{t('announcements')}</h1>
        </div>

        {/* Filtre par mois */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 self-start sm:self-auto">
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
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Compteur filtré */}
      {selectedMonth !== 'all' && (
        <p className="text-sm text-gray-400">
          {filteredAnnouncements.length} {t('announcements') || 'annonce(s)'} — {formatMonthLabel(selectedMonth)}
        </p>
      )}

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdAnnouncement className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_announcements')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Header carte */}
              <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-4 py-3 border-b border-gray-700">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-base font-semibold text-white leading-tight">
                    {lang === 'fr' ? announcement.title_fr : announcement.title_en}
                  </h3>
                  {announcement.published_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
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
              <div className="p-4">
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
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
