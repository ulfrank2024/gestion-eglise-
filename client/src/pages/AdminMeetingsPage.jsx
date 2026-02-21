import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import {
  MdAdd, MdSearch, MdFilterList, MdEvent, MdPeople,
  MdLocationOn, MdAccessTime, MdEdit, MdDelete,
  MdCheckCircle, MdSchedule, MdCancel, MdPlayArrow, MdPerson,
  MdClose, MdArrowBack, MdFlashOn, MdNotes
} from 'react-icons/md';
import { InlineSpinner } from '../components/LoadingSpinner';

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

  // États pour le formulaire de compte-rendu rapide
  const todayDate = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [showQuickReportModal, setShowQuickReportModal] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    title_fr: '',
    meeting_date: todayDate,
    meeting_time: nowTime,
    location: '',
    notes_fr: ''
  });
  const [creatingQuick, setCreatingQuick] = useState(false);
  const [quickSelectedMembers, setQuickSelectedMembers] = useState([]);
  const [quickMemberSearch, setQuickMemberSearch] = useState('');

  // États pour la sélection des participants
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // États pour la modal de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      // Utiliser le pool unifié (membres + admins)
      const pool = await api.admin.getMeetingParticipantPool();
      setAvailableMembers(Array.isArray(pool) ? pool : []);
    } catch (err) {
      console.error('Error fetching participant pool:', err);
      setAvailableMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    fetchMembers();
  };

  const handleOpenQuickReportModal = () => {
    setShowQuickReportModal(true);
    setQuickFormData({
      title_fr: '',
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_time: new Date().toTimeString().slice(0, 5),
      location: '',
      notes_fr: ''
    });
    setQuickSelectedMembers([]);
    setQuickMemberSearch('');
    fetchMembers();
  };

  const handleCreateQuickReport = async (e) => {
    e.preventDefault();
    setCreatingQuick(true);
    try {
      const meeting_date = quickFormData.meeting_time
        ? `${quickFormData.meeting_date}T${quickFormData.meeting_time}`
        : quickFormData.meeting_date;

      const { memberIds, nonMembers } = splitParticipants(quickSelectedMembers, availableMembers);

      await api.admin.createMeeting({
        title_fr: quickFormData.title_fr,
        title_en: quickFormData.title_fr,
        meeting_date,
        location: quickFormData.location,
        notes_fr: quickFormData.notes_fr,
        participant_ids: memberIds,
        non_member_participants: nonMembers,
        status: 'closed',
        initial_attendance_status: 'present'
      });

      setShowQuickReportModal(false);
      fetchMeetings();
    } catch (err) {
      console.error('Error creating quick report:', err);
      setError(err.message);
    } finally {
      setCreatingQuick(false);
    }
  };

  // Sépare les IDs membres des participants admin (non membres)
  const splitParticipants = (selectedIds, pool) => {
    const memberIds = [];
    const nonMembers = [];
    selectedIds.forEach(id => {
      const p = pool.find(m => m.id === id || m.user_id === id);
      if (!p) return;
      if (p.is_admin) {
        nonMembers.push({ name: p.full_name, email: p.email });
      } else {
        memberIds.push(p.id);
      }
    });
    return { memberIds, nonMembers };
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const meeting_date = formData.meeting_time
        ? `${formData.meeting_date}T${formData.meeting_time}`
        : formData.meeting_date;

      const { memberIds, nonMembers } = splitParticipants(selectedMembers, availableMembers);

      await api.admin.createMeeting({
        title_fr: formData.title_fr,
        title_en: formData.title_en || formData.title_fr,
        meeting_date,
        location: formData.location,
        agenda_fr: formData.agenda_fr,
        agenda_en: formData.agenda_en || formData.agenda_fr,
        participant_ids: memberIds,
        non_member_participants: nonMembers
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

  const handleDeleteMeeting = (meeting) => {
    setMeetingToDelete(meeting);
    setShowDeleteModal(true);
  };

  const confirmDeleteMeeting = async () => {
    if (!meetingToDelete) return;

    setDeleting(true);
    try {
      await api.admin.deleteMeeting(meetingToDelete.id);
      setShowDeleteModal(false);
      setMeetingToDelete(null);
      fetchMeetings();
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      planned: { color: 'bg-blue-500', icon: MdSchedule, label: t('meetings.status_planned') },
      in_progress: { color: 'bg-yellow-500', icon: MdPlayArrow, label: t('meetings.status_in_progress') },
      completed: { color: 'bg-green-500', icon: MdCheckCircle, label: t('meetings.status_completed') },
      cancelled: { color: 'bg-red-500', icon: MdCancel, label: t('meetings.status_cancelled') },
      closed: { color: 'bg-teal-600', icon: MdNotes, label: t('meetings.status_closed') || 'Compte-rendu' }
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
    return <LoadingSpinner />;
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
        <div className="flex gap-2">
          <button
            onClick={handleOpenQuickReportModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg hover:from-teal-700 hover:to-green-700 transition-all"
          >
            <MdFlashOn size={20} />
            {t('meetings.quick_report') || 'Compte-rendu rapide'}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all"
          >
            <MdAdd size={20} />
            {t('meetings.create')}
          </button>
        </div>
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
                      onClick={() => handleDeleteMeeting(meeting)}
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
                      {filteredMembers.map((member) => {
                        const uid = member.is_admin ? member.user_id : member.id;
                        return (
                        <label
                          key={uid}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(uid)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMembers([...selectedMembers, uid]);
                              else setSelectedMembers(selectedMembers.filter(id => id !== uid));
                            }}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          {member.profile_photo_url ? (
                            <img src={member.profile_photo_url} alt={member.full_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-300">
                              <MdPerson size={16} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate flex items-center gap-2">
                              {member.full_name}
                              {member.is_admin && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-full">Admin</span>}
                            </p>
                            <p className="text-gray-400 text-xs truncate">{member.email}</p>
                          </div>
                        </label>
                        );
                      })}
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

      {/* Modal Compte-rendu rapide */}
      {showQuickReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-green-600 p-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MdFlashOn size={24} />
                  {t('meetings.quick_report') || 'Compte-rendu rapide'}
                </h2>
                <p className="text-teal-100 text-sm mt-0.5">
                  {t('meetings.quick_report_subtitle') || 'Rencontre non planifiée — enregistrez directement ce qui s\'est passé'}
                </p>
              </div>
              <button
                onClick={() => setShowQuickReportModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickReport} className="p-6 space-y-5">

              {/* Titre */}
              <div>
                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <MdNotes size={16} className="text-teal-400" />
                  {t('meetings.title_fr') || 'Titre de la rencontre'} *
                </label>
                <input
                  type="text"
                  value={quickFormData.title_fr}
                  onChange={(e) => setQuickFormData({ ...quickFormData, title_fr: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={t('meetings.quick_report_title_placeholder') || 'Ex: Rencontre pastorale, Visite de membre...'}
                  required
                />
              </div>

              {/* Date et Heure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                    <MdAccessTime size={16} className="text-teal-400" />
                    {t('meetings.date') || 'Date'} *
                  </label>
                  <input
                    type="date"
                    value={quickFormData.meeting_date}
                    onChange={(e) => setQuickFormData({ ...quickFormData, meeting_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    {t('meetings.start_time') || 'Heure'}
                  </label>
                  <input
                    type="time"
                    value={quickFormData.meeting_time}
                    onChange={(e) => setQuickFormData({ ...quickFormData, meeting_time: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <MdLocationOn size={16} className="text-teal-400" />
                  {t('meetings.location') || 'Lieu'} ({t('optional') || 'optionnel'})
                </label>
                <input
                  type="text"
                  value={quickFormData.location}
                  onChange={(e) => setQuickFormData({ ...quickFormData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={t('meetings.location_placeholder') || 'Salle de réunion, bureau du pasteur...'}
                />
              </div>

              {/* Compte-rendu */}
              <div>
                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <MdNotes size={16} className="text-teal-400" />
                  {t('meetings.notes') || 'Compte-rendu'} *
                </label>
                <textarea
                  value={quickFormData.notes_fr}
                  onChange={(e) => setQuickFormData({ ...quickFormData, notes_fr: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder={t('meetings.quick_report_notes_placeholder') || 'Décrivez ce qui s\'est passé lors de cette rencontre : sujets abordés, décisions prises, points importants...'}
                  required
                />
              </div>

              {/* Personnes présentes */}
              <div>
                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                  <MdPeople size={16} className="text-teal-400" />
                  {t('meetings.quick_report_present') || 'Personnes présentes'} ({t('optional') || 'optionnel'})
                </label>
                <div className="relative mb-3">
                  <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={t('meetings.search_members') || 'Rechercher un membre...'}
                    value={quickMemberSearch}
                    onChange={(e) => setQuickMemberSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {quickSelectedMembers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quickSelectedMembers.map(uid => {
                      const member = availableMembers.find(m => (m.is_admin ? m.user_id : m.id) === uid);
                      return member ? (
                        <span key={uid} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600/20 text-teal-300 rounded-full text-sm">
                          {member.full_name}
                          {member.is_admin && <span className="text-[10px] bg-indigo-600/30 text-indigo-300 px-1 rounded-full">Admin</span>}
                          <button type="button" onClick={() => setQuickSelectedMembers(quickSelectedMembers.filter(id => id !== uid))} className="hover:text-teal-100">
                            <MdClose size={14} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto bg-gray-900 rounded-lg border border-gray-600">
                  {loadingMembers ? (
                    <p className="text-gray-400 text-center p-3 text-sm">{t('loading')}...</p>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {availableMembers
                        .filter(m => m.full_name?.toLowerCase().includes(quickMemberSearch.toLowerCase()))
                        .map((member) => {
                          const uid = member.is_admin ? member.user_id : member.id;
                          return (
                          <label key={uid} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={quickSelectedMembers.includes(uid)}
                              onChange={(e) => {
                                if (e.target.checked) setQuickSelectedMembers([...quickSelectedMembers, uid]);
                                else setQuickSelectedMembers(quickSelectedMembers.filter(id => id !== uid));
                              }}
                              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                            />
                            {member.profile_photo_url ? (
                              <img src={member.profile_photo_url} alt={member.full_name} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center">
                                <MdPerson size={14} className="text-gray-300" />
                              </div>
                            )}
                            <span className="text-white text-sm flex items-center gap-2">
                              {member.full_name}
                              {member.is_admin && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-full">Admin</span>}
                            </span>
                          </label>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {quickSelectedMembers.length} {t('meetings.participants_selected') || 'participant(s) sélectionné(s)'}
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowQuickReportModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creatingQuick}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg hover:from-teal-700 hover:to-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingQuick ? <><InlineSpinner /> {t('saving')}...</> : <><MdFlashOn size={18} /> {t('meetings.save_quick_report') || 'Enregistrer le compte-rendu'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMeetingToDelete(null);
        }}
        onConfirm={confirmDeleteMeeting}
        title={t('meetings.delete_meeting')}
        message={t('meetings.confirm_delete_message', {
          title: meetingToDelete ? (currentLang === 'fr' ? meetingToDelete.title_fr : (meetingToDelete.title_en || meetingToDelete.title_fr)) : ''
        })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        loading={deleting}
      />
    </div>
  );
}

export default AdminMeetingsPage;
