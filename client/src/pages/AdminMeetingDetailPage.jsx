import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import ConfirmModal from '../components/ConfirmModal';
import {
  MdArrowBack, MdEdit, MdSave, MdPeople, MdAdd, MdDelete,
  MdEmail, MdAccessTime, MdLocationOn, MdCheckCircle,
  MdSchedule, MdCancel, MdPlayArrow, MdPerson, MdNotes,
  MdClose, MdLock, MdRefresh
} from 'react-icons/md';

function AdminMeetingDetailPage() {
  const { meetingId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Formulaire d'édition
  const [formData, setFormData] = useState({});

  // Modal ajout participants
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modal de clôture
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeEndTime, setCloseEndTime] = useState('');

  // Modales de confirmation
  const [showSendReportModal, setShowSendReportModal] = useState(false);
  const [showRemoveParticipantModal, setShowRemoveParticipantModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [removingParticipant, setRemovingParticipant] = useState(false);

  useEffect(() => {
    fetchMeeting();
  }, [meetingId]);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getMeeting(meetingId);
      setMeeting(data);
      setFormData({
        title_fr: data.title_fr,
        title_en: data.title_en,
        meeting_date: data.meeting_date?.split('T')[0],
        meeting_time: data.meeting_date?.split('T')[1]?.substring(0, 5),
        meeting_end_time: data.meeting_end_time?.split('T')[1]?.substring(0, 5) || '',
        location: data.location || '',
        agenda_fr: data.agenda_fr || '',
        agenda_en: data.agenda_en || '',
        notes_fr: data.notes_fr || '',
        notes_en: data.notes_en || '',
        status: data.status
      });
    } catch (err) {
      console.error('Error fetching meeting:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const meeting_date = formData.meeting_time
        ? `${formData.meeting_date}T${formData.meeting_time}`
        : formData.meeting_date;

      const meeting_end_time = formData.meeting_end_time
        ? `${formData.meeting_date}T${formData.meeting_end_time}`
        : null;

      await api.admin.updateMeeting(meetingId, {
        ...formData,
        meeting_date,
        meeting_end_time
      });

      setEditMode(false);
      fetchMeeting();
    } catch (err) {
      console.error('Error saving meeting:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.admin.updateMeeting(meetingId, { status: newStatus });
      fetchMeeting();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const handleCloseMeeting = async () => {
    if (!closeEndTime) return;

    try {
      const meeting_end_time = `${formData.meeting_date}T${closeEndTime}`;
      await api.admin.updateMeeting(meetingId, {
        status: 'completed',
        meeting_end_time
      });
      setShowCloseModal(false);
      fetchMeeting();
    } catch (err) {
      console.error('Error closing meeting:', err);
      setError(err.message);
    }
  };

  const handleSendReport = () => {
    setShowSendReportModal(true);
  };

  const confirmSendReport = async () => {
    setSendingReport(true);
    try {
      const result = await api.admin.sendMeetingReport(meetingId, { language: currentLang });
      setShowSendReportModal(false);
      setSuccessMessage(result.message || t('meetings.report_sent_success'));
      setShowSuccessModal(true);
      fetchMeeting();
    } catch (err) {
      console.error('Error sending report:', err);
      setError(err.message);
      setShowSendReportModal(false);
    } finally {
      setSendingReport(false);
    }
  };

  const fetchAvailableMembers = async () => {
    setLoadingMembers(true);
    try {
      const members = await api.admin.getMembers();
      // Filtrer les membres déjà participants
      const participantIds = meeting.participants?.map(p => p.member_id) || [];
      const available = members.filter(m => !participantIds.includes(m.id));
      setAvailableMembers(available);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddParticipants = async () => {
    if (selectedMembers.length === 0) return;

    try {
      await api.admin.addMeetingParticipants(meetingId, { member_ids: selectedMembers });
      setShowAddParticipants(false);
      setSelectedMembers([]);
      fetchMeeting();
    } catch (err) {
      console.error('Error adding participants:', err);
      setError(err.message);
    }
  };

  const handleRemoveParticipant = (participant) => {
    setParticipantToRemove(participant);
    setShowRemoveParticipantModal(true);
  };

  const confirmRemoveParticipant = async () => {
    if (!participantToRemove) return;

    setRemovingParticipant(true);
    try {
      await api.admin.removeMeetingParticipant(meetingId, participantToRemove.id);
      setShowRemoveParticipantModal(false);
      setParticipantToRemove(null);
      fetchMeeting();
    } catch (err) {
      console.error('Error removing participant:', err);
      setError(err.message);
    } finally {
      setRemovingParticipant(false);
    }
  };

  const handleUpdateParticipant = async (participantId, updates) => {
    try {
      await api.admin.updateMeetingParticipant(meetingId, participantId, updates);
      fetchMeeting();
    } catch (err) {
      console.error('Error updating participant:', err);
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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white ${config.color}`}>
        <Icon size={16} />
        {config.label}
      </span>
    );
  };

  // Trouver le secrétaire ou l'organisateur pour les notes
  const getNotesAuthor = () => {
    if (!meeting?.participants) return null;
    const secretary = meeting.participants.find(p => p.role === 'secretary');
    if (secretary) return secretary.member?.full_name;
    const organizer = meeting.participants.find(p => p.role === 'organizer');
    if (organizer) return organizer.member?.full_name;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">{t('loading')}...</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{t('meetings.not_found')}</p>
        <button
          onClick={() => navigate('/admin/meetings')}
          className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  const title = currentLang === 'fr' ? meeting.title_fr : (meeting.title_en || meeting.title_fr);
  const agenda = currentLang === 'fr' ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);
  const notes = currentLang === 'fr' ? meeting.notes_fr : (meeting.notes_en || meeting.notes_fr);
  const notesAuthor = getNotesAuthor();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/meetings')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdArrowBack size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <div className="flex items-center gap-3 mt-1">
              {getStatusBadge(meeting.status)}
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <MdAccessTime size={16} />
                {new Date(meeting.meeting_date).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <MdEdit size={20} />
                {t('edit')}
              </button>
              {meeting.status === 'planned' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <MdPlayArrow size={20} />
                  {t('meetings.start_meeting')}
                </button>
              )}
              {meeting.status === 'in_progress' && (
                <button
                  onClick={() => {
                    setCloseEndTime(new Date().toTimeString().substring(0, 5));
                    setShowCloseModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MdLock size={20} />
                  {t('meetings.close_meeting')}
                </button>
              )}
              {meeting.status === 'completed' && (
                <>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <MdRefresh size={20} />
                    {t('meetings.reopen_meeting')}
                  </button>
                  <button
                    onClick={handleSendReport}
                    disabled={sendingReport || meeting.participants?.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <MdEmail size={20} />
                    {sendingReport ? t('sending') : t('meetings.send_report')}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <MdSave size={20} />
                {saving ? t('saving') : t('save')}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations */}
          {editMode ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">{t('meetings.information')}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('meetings.title_fr')} *</label>
                  <input
                    type="text"
                    value={formData.title_fr}
                    onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('meetings.title_en')}</label>
                  <input
                    type="text"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('meetings.date')} *</label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('meetings.start_time')}</label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('meetings.end_time')}</label>
                  <input
                    type="time"
                    value={formData.meeting_end_time}
                    onChange={(e) => setFormData({ ...formData, meeting_end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('meetings.location')}</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{t('meetings.information')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-300">
                {meeting.location && (
                  <div className="flex items-center gap-2">
                    <MdLocationOn className="text-gray-400" />
                    <span>{meeting.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MdPeople className="text-gray-400" />
                  <span>{meeting.participants?.length || 0} {t('meetings.participants')}</span>
                </div>
                {meeting.meeting_end_time && (
                  <div className="flex items-center gap-2">
                    <MdAccessTime className="text-gray-400" />
                    <span>{t('meetings.end_time')}: {new Date(meeting.meeting_end_time).toLocaleTimeString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ordre du jour */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MdNotes className="text-yellow-400" />
              {t('meetings.agenda')}
            </h2>
            {editMode ? (
              <textarea
                value={formData.agenda_fr}
                onChange={(e) => setFormData({ ...formData, agenda_fr: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={t('meetings.agenda_placeholder')}
              />
            ) : (
              <div className="text-gray-300 whitespace-pre-wrap">
                {agenda || <span className="text-gray-500 italic">{t('meetings.no_agenda')}</span>}
              </div>
            )}
          </div>

          {/* Compte-rendu / Notes */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MdEdit className="text-green-400" />
                {t('meetings.notes')}
              </h2>
              {notesAuthor && notes && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <MdPerson size={16} />
                  {t('meetings.notes_written_by')}: <span className="text-green-400">{notesAuthor}</span>
                </span>
              )}
            </div>
            {editMode ? (
              <textarea
                value={formData.notes_fr}
                onChange={(e) => setFormData({ ...formData, notes_fr: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={t('meetings.notes_placeholder')}
              />
            ) : (
              <div className="text-gray-300 whitespace-pre-wrap">
                {notes || <span className="text-gray-500 italic">{t('meetings.no_notes')}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Participants */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MdPeople className="text-amber-400" />
                {t('meetings.participants')} ({meeting.participants?.length || 0})
              </h2>
              <button
                onClick={() => {
                  setShowAddParticipants(true);
                  fetchAvailableMembers();
                }}
                className="p-2 text-amber-400 hover:bg-gray-700 rounded-lg transition-colors"
                title={t('meetings.add_participants')}
              >
                <MdAdd size={20} />
              </button>
            </div>

            {meeting.participants?.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('meetings.no_participants')}</p>
            ) : (
              <div className="space-y-3">
                {meeting.participants?.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {participant.member?.profile_photo_url ? (
                        <img
                          src={participant.member.profile_photo_url}
                          alt={participant.member?.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-300">
                          <MdPerson size={20} />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">
                          {participant.member?.full_name || 'N/A'}
                        </p>
                        <div className="flex items-center gap-2">
                          <select
                            value={participant.role}
                            onChange={(e) => handleUpdateParticipant(participant.id, { role: e.target.value, attendance_status: participant.attendance_status })}
                            className="text-xs bg-gray-600 text-gray-300 rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="participant">{t('meetings.role_participant')}</option>
                            <option value="organizer">{t('meetings.role_organizer')}</option>
                            <option value="secretary">{t('meetings.role_secretary')}</option>
                          </select>
                          <select
                            value={participant.attendance_status}
                            onChange={(e) => handleUpdateParticipant(participant.id, { role: participant.role, attendance_status: e.target.value })}
                            className="text-xs bg-gray-600 text-gray-300 rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="invited">{t('meetings.status_invited')}</option>
                            <option value="confirmed">{t('meetings.status_confirmed')}</option>
                            <option value="present">{t('meetings.status_present')}</option>
                            <option value="absent">{t('meetings.status_absent')}</option>
                            <option value="excused">{t('meetings.status_excused')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(participant)}
                      className="p-1 text-red-400 hover:bg-gray-600 rounded transition-colors"
                    >
                      <MdDelete size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info création */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <p className="text-xs text-gray-400">
              {t('meetings.created_at')}: {new Date(meeting.created_at).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US')}
            </p>
            {meeting.updated_at && meeting.updated_at !== meeting.created_at && (
              <p className="text-xs text-gray-400 mt-1">
                {t('meetings.updated_at')}: {new Date(meeting.updated_at).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal ajout participants */}
      {showAddParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t('meetings.add_participants')}</h2>
              <button
                onClick={() => {
                  setShowAddParticipants(false);
                  setSelectedMembers([]);
                }}
                className="p-1 text-white/80 hover:text-white"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-96">
              {loadingMembers ? (
                <p className="text-gray-400 text-center">{t('loading')}...</p>
              ) : availableMembers.length === 0 ? (
                <p className="text-gray-400 text-center">{t('meetings.no_members_available')}</p>
              ) : (
                <div className="space-y-2">
                  {availableMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
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
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-300">
                          <MdPerson size={20} />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm">{member.full_name}</p>
                        <p className="text-gray-400 text-xs">{member.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAddParticipants(false);
                  setSelectedMembers([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddParticipants}
                disabled={selectedMembers.length === 0}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {t('add')} ({selectedMembers.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de clôture */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MdLock size={24} />
                {t('meetings.close_meeting')}
              </h2>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-300">{t('meetings.close_meeting_desc')}</p>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t('meetings.actual_end_time')} *
                </label>
                <input
                  type="time"
                  value={closeEndTime}
                  onChange={(e) => setCloseEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleCloseMeeting}
                  disabled={!closeEndTime}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MdCheckCircle size={20} />
                  {t('meetings.confirm_close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation d'envoi de rapport */}
      <ConfirmModal
        isOpen={showSendReportModal}
        onClose={() => setShowSendReportModal(false)}
        onConfirm={confirmSendReport}
        title={t('meetings.send_report')}
        message={t('meetings.confirm_send_report_message')}
        confirmText={t('send')}
        cancelText={t('cancel')}
        type="send"
        loading={sendingReport}
      />

      {/* Modal de confirmation de suppression de participant */}
      <ConfirmModal
        isOpen={showRemoveParticipantModal}
        onClose={() => {
          setShowRemoveParticipantModal(false);
          setParticipantToRemove(null);
        }}
        onConfirm={confirmRemoveParticipant}
        title={t('meetings.remove_participant')}
        message={t('meetings.confirm_remove_participant_message', {
          name: participantToRemove?.member?.full_name || ''
        })}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        type="danger"
        loading={removingParticipant}
      />

      {/* Modal de succès */}
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title={t('success')}
        message={successMessage}
        confirmText={t('ok')}
        type="info"
      />
    </div>
  );
}

export default AdminMeetingDetailPage;
