import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdAdd, MdSearch, MdFilterList, MdEvent, MdPeople,
  MdLocationOn, MdAccessTime, MdEdit, MdDelete, MdEmail,
  MdCheckCircle, MdSchedule, MdCancel, MdPlayArrow
} from 'react-icons/md';

function AdminMeetingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // États pour le formulaire de création
  const [formData, setFormData] = useState({
    title_fr: '',
    title_en: '',
    meeting_date: '',
    meeting_time: '',
    meeting_end_time: '',
    location: '',
    agenda_fr: '',
    agenda_en: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await api.admin.getMeetings(params);
      setMeetings(data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Combiner date et heure
      const meeting_date = formData.meeting_time
        ? `${formData.meeting_date}T${formData.meeting_time}`
        : formData.meeting_date;

      const meeting_end_time = formData.meeting_end_time
        ? `${formData.meeting_date}T${formData.meeting_end_time}`
        : null;

      await api.admin.createMeeting({
        title_fr: formData.title_fr,
        title_en: formData.title_en || formData.title_fr,
        meeting_date,
        meeting_end_time,
        location: formData.location,
        agenda_fr: formData.agenda_fr,
        agenda_en: formData.agenda_en || formData.agenda_fr
      });

      setShowCreateModal(false);
      setFormData({
        title_fr: '',
        title_en: '',
        meeting_date: '',
        meeting_time: '',
        meeting_end_time: '',
        location: '',
        agenda_fr: '',
        agenda_en: ''
      });
      fetchMeetings();
    } catch (err) {
      console.error('Error creating meeting:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm(t('meetings.confirm_delete'))) return;

    try {
      await api.admin.deleteMeeting(id);
      fetchMeetings();
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      planned: { color: 'bg-blue-500', icon: MdSchedule, label: t('meetings.status_planned') },
      in_progress: { color: 'bg-yellow-500', icon: MdPlayArrow, label: t('meetings.status_in_progress') },
      completed: { color: 'bg-green-500', icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled: { color: 'bg-red-500', icon: MdCancel, label: t('meetings.status_cancelled') }
    };

    const config = statusConfig[status] || statusConfig.planned;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const filteredMeetings = meetings.filter(meeting => {
    const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">{t('loading')}...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdEvent size={28} className="text-indigo-400" />
            {t('meetings.title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('meetings.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          <MdAdd size={20} />
          {t('meetings.create')}
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('meetings.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <MdFilterList className="text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t('meetings.filter_all')}</option>
            <option value="planned">{t('meetings.status_planned')}</option>
            <option value="in_progress">{t('meetings.status_in_progress')}</option>
            <option value="completed">{t('meetings.status_completed')}</option>
            <option value="cancelled">{t('meetings.status_cancelled')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste des réunions */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdEvent className="mx-auto text-gray-600 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">{t('meetings.no_meetings')}</h3>
          <p className="text-gray-400 mb-4">{t('meetings.no_meetings_hint')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <MdAdd size={20} />
            {t('meetings.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeetings.map((meeting) => {
            const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
            const meetingDate = new Date(meeting.meeting_date);

            return (
              <div
                key={meeting.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-indigo-500 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                      {getStatusBadge(meeting.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <MdAccessTime size={16} />
                        {meetingDate.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MdLocationOn size={16} />
                          {meeting.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MdPeople size={16} />
                        {meeting.participants_count} {t('meetings.participants')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
                      className="p-2 text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('edit')}
                    >
                      <MdEdit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <MdDelete size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdAdd size={24} />
                {t('meetings.create')}
              </h2>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              {/* Titre FR */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.title_fr')} *
                </label>
                <input
                  type="text"
                  value={formData.title_fr}
                  onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Titre EN */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.title_en')}
                </label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('meetings.title_en_placeholder')}
                />
              </div>

              {/* Date et Heures */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    {t('meetings.date')} *
                  </label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    {t('meetings.start_time')}
                  </label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    {t('meetings.end_time')}
                  </label>
                  <input
                    type="time"
                    value={formData.meeting_end_time}
                    onChange={(e) => setFormData({ ...formData, meeting_end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.location')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('meetings.location_placeholder')}
                />
              </div>

              {/* Ordre du jour FR */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.agenda_fr')}
                </label>
                <textarea
                  value={formData.agenda_fr}
                  onChange={(e) => setFormData({ ...formData, agenda_fr: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('meetings.agenda_placeholder')}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {creating ? t('creating') : t('meetings.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMeetingsPage;
