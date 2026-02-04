import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdAdd, MdSearch, MdFilterList, MdEvent, MdPeople,
  MdLocationOn, MdAccessTime, MdEdit, MdDelete, MdEmail,
  MdCheckCircle, MdSchedule, MdCancel, MdPlayArrow, MdPerson,
  MdClose, MdArrowBack
} from 'react-icons/md';

function AdminMeetingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentLang = i18n.language;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // États pour le formulaire de création
  const [formData, setFormData] = useState({
    title_fr: '',
    title_en: '',
    meeting_date: '',
    meeting_time: '',
    location: '',
    agenda_fr: '',
    agenda_en: ''
  });
  const [creating, setCreating] = useState(false);

  // États pour la sélection des participants
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

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

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const members = await api.admin.getMembers();
      setAvailableMembers(members);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    fetchMembers();
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Combiner date et heure
      const meeting_date = formData.meeting_time
        ? `${formData.meeting_date}T${formData.meeting_time}`
        : formData.meeting_date;

      await api.admin.createMeeting({
        title_fr: formData.title_fr,
        title_en: formData.title_en || formData.title_fr,
        meeting_date,
        location: formData.location,
        agenda_fr: formData.agenda_fr,
        agenda_en: formData.agenda_en || formData.agenda_fr,
        participant_ids: selectedMembers
      });

      setShowCreateModal(false);
      setFormData({
        title_fr: '',
        title_en: '',
        meeting_date: '',
        meeting_time: '',
        location: '',
        agenda_fr: '',
        agenda_en: ''
      });
      setSelectedMembers([]);
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

  const filteredMembers = availableMembers.filter(member =>
    member.full_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/meetings-dashboard')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdArrowBack size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MdEvent size={28} className="text-amber-400" />
              {t('meetings.all_meetings') || 'Toutes les réunions'}
            </h1>
            <p className="text-gray-400 mt-1">{filteredMeetings.length} {t('meetings.total') || 'réunion(s)'}</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all"
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
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <MdFilterList className="text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
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
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-amber-500 transition-colors cursor-pointer"
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
                      className="p-2 text-amber-400 hover:bg-gray-700 rounded-lg transition-colors"
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
          <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdAdd size={24} />
                {t('meetings.create')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-6">
              {/* Titre FR */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.title_fr')} *
                </label>
                <input
                  type="text"
                  value={formData.title_fr}
                  onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('meetings.title_placeholder') || 'Ex: Réunion du conseil pastoral'}
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('meetings.title_en_placeholder')}
                />
              </div>

              {/* Date et Heure de début */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    {t('meetings.date')} *
                  </label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('meetings.location_placeholder')}
                />
              </div>

              {/* Ordre du jour */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.agenda_fr')}
                </label>
                <textarea
                  value={formData.agenda_fr}
                  onChange={(e) => setFormData({ ...formData, agenda_fr: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={t('meetings.agenda_placeholder')}
                />
              </div>

              {/* Sélection des participants */}
              <div>
                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <MdPeople size={18} />
                  {t('meetings.select_participants') || 'Sélectionner les participants'}
                </label>

                {/* Recherche de membres */}
                <div className="relative mb-3">
                  <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('meetings.search_members') || 'Rechercher un membre...'}
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Participants sélectionnés */}
                {selectedMembers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedMembers.map(memberId => {
                      const member = availableMembers.find(m => m.id === memberId);
                      return member ? (
                        <span
                          key={memberId}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-sm"
                        >
                          {member.full_name}
                          <button
                            type="button"
                            onClick={() => setSelectedMembers(selectedMembers.filter(id => id !== memberId))}
                            className="hover:text-amber-200"
                          >
                            <MdClose size={16} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Liste des membres */}
                <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg border border-gray-600">
                  {loadingMembers ? (
                    <p className="text-gray-400 text-center p-4">{t('loading')}...</p>
                  ) : filteredMembers.length === 0 ? (
                    <p className="text-gray-400 text-center p-4">{t('meetings.no_members_found') || 'Aucun membre trouvé'}</p>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {filteredMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers([...selectedMembers, member.id]);
                              } else {
                                setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                              }
                            }}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          {member.profile_photo_url ? (
                            <img
                              src={member.profile_photo_url}
                              alt={member.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-300">
                              <MdPerson size={16} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{member.full_name}</p>
                            <p className="text-gray-400 text-xs truncate">{member.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedMembers.length} {t('meetings.participants_selected') || 'participant(s) sélectionné(s)'}
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedMembers([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50"
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
