import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdCalendarMonth,
  MdAdd,
  MdSearch,
  MdFilterList,
  MdEdit,
  MdDelete,
  MdArrowBack,
  MdClose,
  MdMusicNote,
  MdPerson,
  MdAccessTime,
  MdEvent,
  MdPeople,
  MdStar,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdLibraryMusic,
  MdPlaylistPlay
} from 'react-icons/md';

const AdminChoirPlanningPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plannings, setPlannings] = useState([]);
  const [songs, setSongs] = useState([]);
  const [choirMembers, setChoirMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming'); // upcoming, past, all

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    event_name_fr: '',
    event_name_en: '',
    event_date: '',
    event_time: '',
    event_type: 'culte',
    notes: ''
  });

  // Songs in planning
  const [planningSongs, setPlanningSongs] = useState([]);
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [songFormData, setSongFormData] = useState({
    song_id: '',
    lead_choriste_id: '',
    order_position: 0,
    notes: '',
    medley_name: ''
  });

  // Liste des medleys existants pour suggestions
  const existingMedleys = [...new Set(planningSongs.filter(ps => ps.medley_name).map(ps => ps.medley_name))];

  // Participants in planning
  const [planningParticipants, setPlanningParticipants] = useState([]);
  const [allChoirMembers, setAllChoirMembers] = useState([]);
  const [isSelectParticipantsOpen, setIsSelectParticipantsOpen] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  // Detail modal tabs and song lyrics viewer
  const [activeDetailTab, setActiveDetailTab] = useState('songs'); // 'songs' | 'participants'
  const [expandedSongId, setExpandedSongId] = useState(null);

  // Compilations
  const [compilations, setCompilations] = useState([]);
  const [isAddCompilationModalOpen, setIsAddCompilationModalOpen] = useState(false);
  const [compilationFormData, setCompilationFormData] = useState({
    compilation_id: '',
    lead_choriste_id: '',
    order_position: 0,
    notes: ''
  });
  const [expandedCompilationId, setExpandedCompilationId] = useState(null);

  const eventTypes = ['culte', 'repetition', 'concert', 'autre'];

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (dateFilter === 'upcoming') params.upcoming = true;
      if (dateFilter === 'past') params.past = true;

      // Récupérer les plannings
      try {
        const planningsData = await api.admin.getChoirPlannings(params);
        setPlannings(Array.isArray(planningsData) ? planningsData : []);
      } catch (planErr) {
        console.error('Error fetching plannings:', planErr);
        setPlannings([]);
      }

      // Récupérer les chants
      try {
        const songsData = await api.admin.getSongs();
        setSongs(Array.isArray(songsData) ? songsData : []);
      } catch (songsErr) {
        console.error('Error fetching songs:', songsErr);
        setSongs([]);
      }

      // Récupérer les choristes leads
      try {
        const membersData = await api.admin.getChoirMembers({ is_lead: true });
        setChoirMembers(Array.isArray(membersData) ? membersData : []);
      } catch (membersErr) {
        console.error('Error fetching choir members:', membersErr);
        setChoirMembers([]);
      }

      // Récupérer tous les choristes (pour la sélection des participants)
      try {
        const allMembersData = await api.admin.getChoirMembers();
        setAllChoirMembers(Array.isArray(allMembersData) ? allMembersData : []);
      } catch (allMembersErr) {
        console.error('Error fetching all choir members:', allMembersErr);
        setAllChoirMembers([]);
      }

      // Récupérer les compilations
      try {
        const compilationsData = await api.admin.getCompilations();
        setCompilations(Array.isArray(compilationsData) ? compilationsData : []);
      } catch (compErr) {
        console.error('Error fetching compilations:', compErr);
        setCompilations([]);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('choir.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlanning = async () => {
    try {
      await api.admin.createChoirPlanning(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error creating planning:', err);
      setError(err.response?.data?.error || t('choir.error_creating_planning'));
    }
  };

  const handleUpdatePlanning = async () => {
    try {
      await api.admin.updateChoirPlanning(selectedPlanning.id, formData);
      setIsEditModalOpen(false);
      setSelectedPlanning(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error updating planning:', err);
      setError(err.response?.data?.error || t('choir.error_updating_planning'));
    }
  };

  const handleDeletePlanning = async () => {
    try {
      await api.admin.deleteChoirPlanning(selectedPlanning.id);
      setIsDeleteModalOpen(false);
      setSelectedPlanning(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting planning:', err);
      setError(err.response?.data?.error || t('choir.error_deleting_planning'));
    }
  };

  const handleAddSongToPlanning = async () => {
    try {
      await api.admin.addSongToPlanning(selectedPlanning.id, {
        ...songFormData,
        order_position: planningSongs.length + 1
      });
      setIsAddSongModalOpen(false);
      setSongFormData({ song_id: '', lead_choriste_id: '', order_position: 0, notes: '', medley_name: '' });
      fetchPlanningDetails(selectedPlanning.id);
    } catch (err) {
      console.error('Error adding song to planning:', err);
      setError(err.response?.data?.error || t('choir.error_adding_song'));
    }
  };

  const handleRemoveSongFromPlanning = async (planningSongId) => {
    try {
      await api.admin.removeSongFromPlanning(planningSongId);
      fetchPlanningDetails(selectedPlanning.id);
    } catch (err) {
      console.error('Error removing song from planning:', err);
      setError(err.response?.data?.error || t('choir.error_removing_song'));
    }
  };

  const handleAddCompilationToPlanning = async () => {
    try {
      await api.admin.addCompilationToPlanning(selectedPlanning.id, {
        ...compilationFormData,
        order_position: planningSongs.length + 1
      });
      setIsAddCompilationModalOpen(false);
      setCompilationFormData({ compilation_id: '', lead_choriste_id: '', order_position: 0, notes: '' });
      fetchPlanningDetails(selectedPlanning.id);
    } catch (err) {
      console.error('Error adding compilation to planning:', err);
      setError(err.response?.data?.error || t('choir.error_adding_compilation'));
    }
  };

  const toggleCompilationExpand = (compilationId) => {
    setExpandedCompilationId(prev => prev === compilationId ? null : compilationId);
  };

  // Gestion des participants
  const handleSaveParticipants = async () => {
    try {
      // Ajouter les nouveaux participants sélectionnés
      if (selectedParticipantIds.length > 0) {
        await api.admin.addPlanningParticipants(selectedPlanning.id, selectedParticipantIds);
      }
      // Supprimer ceux qui ne sont plus sélectionnés
      await api.admin.clearPlanningParticipants(selectedPlanning.id, selectedParticipantIds);

      setIsSelectParticipantsOpen(false);
      fetchPlanningDetails(selectedPlanning.id);
    } catch (err) {
      console.error('Error saving participants:', err);
      setError(err.response?.data?.error || t('choir.error_saving_participants'));
    }
  };

  const toggleParticipantSelection = (choirMemberId) => {
    setSelectedParticipantIds(prev => {
      if (prev.includes(choirMemberId)) {
        return prev.filter(id => id !== choirMemberId);
      } else {
        return [...prev, choirMemberId];
      }
    });
  };

  const toggleSongLyrics = (songId) => {
    setExpandedSongId(prev => prev === songId ? null : songId);
  };

  // Fonction pour obtenir la couleur de la voix
  const getVoiceTypeBadge = (voiceType) => {
    const colors = {
      soprano: 'bg-pink-500/20 text-pink-400',
      alto: 'bg-purple-500/20 text-purple-400',
      tenor: 'bg-blue-500/20 text-blue-400',
      basse: 'bg-emerald-500/20 text-emerald-400',
      autre: 'bg-gray-500/20 text-gray-400'
    };
    return colors[voiceType] || colors.autre;
  };

  const fetchPlanningDetails = async (planningId) => {
    try {
      const data = await api.admin.getChoirPlanning(planningId);
      setSelectedPlanning(data);
      setPlanningSongs(data.songs || []);
      setPlanningParticipants(data.participants || []);
      // Pré-sélectionner les participants existants
      const existingParticipantIds = (data.participants || []).map(p => p.choir_member?.id).filter(Boolean);
      setSelectedParticipantIds(existingParticipantIds);
    } catch (err) {
      console.error('Error fetching planning details:', err);
    }
  };

  const openDetailModal = async (planning) => {
    setSelectedPlanning(planning);
    await fetchPlanningDetails(planning.id);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (planning) => {
    setSelectedPlanning(planning);
    setFormData({
      event_name_fr: planning.event_name_fr,
      event_name_en: planning.event_name_en,
      event_date: planning.event_date,
      event_time: planning.event_time || '',
      event_type: planning.event_type,
      notes: planning.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (planning) => {
    setSelectedPlanning(planning);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      event_name_fr: '',
      event_name_en: '',
      event_date: '',
      event_time: '',
      event_type: 'culte',
      notes: ''
    });
  };

  // Filtrer les plannings
  const filteredPlannings = plannings.filter(planning => {
    const eventName = i18n.language === 'fr' ? planning.event_name_fr : planning.event_name_en;
    const matchesSearch = eventName.toLowerCase().includes(searchTerm.toLowerCase());

    if (typeFilter === 'all') return matchesSearch;
    return matchesSearch && planning.event_type === typeFilter;
  });

  const getEventTypeBadge = (eventType) => {
    const colors = {
      culte: 'bg-indigo-500/20 text-indigo-400',
      repetition: 'bg-amber-500/20 text-amber-400',
      concert: 'bg-pink-500/20 text-pink-400',
      autre: 'bg-gray-500/20 text-gray-400'
    };
    return colors[eventType] || colors.autre;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/choir"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdArrowBack className="text-xl" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MdCalendarMonth className="text-amber-400" />
              {t('choir.planning_title')}
            </h1>
            <p className="text-gray-400 text-sm">{plannings.length} {t('choir.events')}</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-colors"
        >
          <MdAdd className="text-xl" />
          {t('choir.create_planning')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('choir.search_planning')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="upcoming">{t('choir.upcoming')}</option>
            <option value="past">{t('choir.past')}</option>
            <option value="all">{t('choir.all')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{t('choir.all_types')}</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{t(`choir.event_type_${type}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Plannings List */}
      {filteredPlannings.length > 0 ? (
        <div className="space-y-4">
          {filteredPlannings.map((planning) => (
            <div
              key={planning.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {i18n.language === 'fr' ? planning.event_name_fr : planning.event_name_en}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getEventTypeBadge(planning.event_type)}`}>
                      {t(`choir.event_type_${planning.event_type}`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <MdEvent />
                      {formatDate(planning.event_date)}
                    </div>
                    {planning.event_time && (
                      <div className="flex items-center gap-1">
                        <MdAccessTime />
                        {planning.event_time.slice(0, 5)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MdMusicNote />
                      {planning.songs_count || 0} {t('choir.songs')}
                    </div>
                  </div>

                  {planning.notes && (
                    <p className="mt-2 text-sm text-gray-500">{planning.notes}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openDetailModal(planning)}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t('choir.view_songs')}
                  </button>
                  <button
                    onClick={() => openEditModal(planning)}
                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdEdit />
                  </button>
                  <button
                    onClick={() => openDeleteModal(planning)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
          <MdCalendarMonth className="text-5xl text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('choir.no_plannings')}</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 text-amber-400 hover:text-amber-300"
          >
            {t('choir.create_first_planning')}
          </button>
        </div>
      )}

      {/* Add/Edit Planning Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {isEditModalOpen ? t('choir.edit_planning') : t('choir.create_planning')}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_name_fr')} *</label>
                  <input
                    type="text"
                    value={formData.event_name_fr}
                    onChange={(e) => setFormData({ ...formData, event_name_fr: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Culte du dimanche"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_name_en')} *</label>
                  <input
                    type="text"
                    value={formData.event_name_en}
                    onChange={(e) => setFormData({ ...formData, event_name_en: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Sunday Service"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_date')} *</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_time')}</label>
                  <input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_type')}</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {eventTypes.map(type => (
                      <option key={type} value={type}>{t(`choir.event_type_${type}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('choir.planning_notes_placeholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={isEditModalOpen ? handleUpdatePlanning : handleAddPlanning}
                disabled={!formData.event_name_fr || !formData.event_name_en || !formData.event_date}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditModalOpen ? t('save') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Planning Detail Modal (Songs & Participants) */}
      {isDetailModalOpen && selectedPlanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {i18n.language === 'fr' ? selectedPlanning.event_name_fr : selectedPlanning.event_name_en}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MdEvent />
                    {formatDate(selectedPlanning.event_date)}
                  </span>
                  {selectedPlanning.event_time && (
                    <span className="flex items-center gap-1">
                      <MdAccessTime />
                      {selectedPlanning.event_time.slice(0, 5)}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getEventTypeBadge(selectedPlanning.event_type)}`}>
                    {t(`choir.event_type_${selectedPlanning.event_type}`)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setActiveDetailTab('songs');
                  setExpandedSongId(null);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 shrink-0">
              <button
                onClick={() => setActiveDetailTab('songs')}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeDetailTab === 'songs'
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <MdLibraryMusic />
                {t('choir.songs_tab')} ({planningSongs.length})
              </button>
              <button
                onClick={() => setActiveDetailTab('participants')}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeDetailTab === 'participants'
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <MdPeople />
                {t('choir.participants_tab')} ({planningParticipants.length})
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Songs Tab */}
              {activeDetailTab === 'songs' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">{t('choir.songs_in_planning')}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAddCompilationModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <MdPlaylistPlay />
                        {t('choir.add_compilation')}
                      </button>
                      <button
                        onClick={() => setIsAddSongModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <MdAdd />
                        {t('choir.add_song')}
                      </button>
                    </div>
                  </div>

                  {planningSongs.length > 0 ? (
                    <div className="space-y-4">
                      {/* Regrouper les chants : d'abord les compilations du répertoire, puis les medleys ad-hoc, puis les chants individuels */}
                      {(() => {
                        // Séparer les compilations, les medleys ad-hoc et les chants individuels
                        const compilationItems = []; // Compilations du répertoire
                        const medleyGroups = {}; // Medleys ad-hoc (via medley_name)
                        const individualSongs = [];

                        planningSongs.forEach((ps) => {
                          if (ps.compilation_id && ps.compilation) {
                            // C'est une compilation du répertoire
                            compilationItems.push(ps);
                          } else if (ps.medley_name) {
                            // C'est un medley ad-hoc
                            if (!medleyGroups[ps.medley_name]) {
                              medleyGroups[ps.medley_name] = [];
                            }
                            medleyGroups[ps.medley_name].push(ps);
                          } else {
                            // Chant individuel
                            individualSongs.push(ps);
                          }
                        });

                        let globalIndex = 0;

                        return (
                          <>
                            {/* Afficher les compilations du répertoire */}
                            {compilationItems.map((ps) => {
                              globalIndex++;
                              const compilation = ps.compilation;
                              const compilationSongs = compilation?.songs || [];
                              const isExpanded = expandedCompilationId === ps.id;

                              return (
                                <div key={ps.id} className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl overflow-hidden border border-purple-700/50">
                                  {/* Compilation Header */}
                                  <div
                                    className="p-3 bg-purple-800/30 border-b border-purple-700/50 cursor-pointer hover:bg-purple-800/40 transition-colors"
                                    onClick={() => toggleCompilationExpand(ps.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 flex items-center justify-center bg-purple-500/30 text-purple-300 rounded-lg text-sm font-bold">
                                          {globalIndex}
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <MdPlaylistPlay className="text-purple-400 text-lg" />
                                            <p className="text-white font-semibold">{compilation?.name}</p>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                                              {t('choir.compilation')} • {compilationSongs.length} {t('choir.songs')}
                                            </span>
                                          </div>
                                          {ps.lead_choriste && (
                                            <div className="flex items-center gap-2 mt-1">
                                              <MdStar className="text-amber-400 text-sm" />
                                              <span className="text-sm text-gray-300">{ps.lead_choriste?.member?.full_name}</span>
                                              <span className={`text-xs px-2 py-0.5 rounded-full ${getVoiceTypeBadge(ps.lead_choriste?.voice_type)}`}>
                                                {t(`choir.voice_${ps.lead_choriste?.voice_type}`)}
                                              </span>
                                            </div>
                                          )}
                                          {compilation?.description && (
                                            <p className="text-xs text-gray-400 mt-1">{compilation.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? <MdKeyboardArrowUp className="text-gray-400" /> : <MdKeyboardArrowDown className="text-gray-400" />}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRemoveSongFromPlanning(ps.id); }}
                                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                                        >
                                          <MdDelete className="text-sm" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Compilation Songs (si expanded) */}
                                  {isExpanded && compilationSongs.length > 0 && (
                                    <div className="divide-y divide-purple-700/30">
                                      {compilationSongs.map((cs, songIdx) => (
                                        <div key={cs.id} className="p-3 hover:bg-purple-800/20 transition-colors">
                                          <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center bg-gray-700/50 text-gray-400 rounded text-xs">
                                              {songIdx + 1}
                                            </span>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <p className="text-white">{cs.song?.title}</p>
                                                {cs.song?.key_signature && (
                                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                                    {cs.song.key_signature}
                                                  </span>
                                                )}
                                              </div>
                                              {cs.song?.author && (
                                                <p className="text-xs text-gray-500">{cs.song.author}</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Afficher les medleys ad-hoc */}
                            {Object.entries(medleyGroups).map(([medleyName, medleySongs]) => {
                              const firstSong = medleySongs[0];
                              const leadChoriste = firstSong?.lead_choriste;
                              globalIndex++;
                              const medleyIndex = globalIndex;

                              return (
                                <div key={medleyName} className="bg-gradient-to-r from-indigo-900/30 to-blue-900/30 rounded-xl overflow-hidden border border-indigo-700/50">
                                  {/* Medley Header */}
                                  <div className="p-3 bg-indigo-800/30 border-b border-indigo-700/50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 flex items-center justify-center bg-indigo-500/30 text-indigo-300 rounded-lg text-sm font-bold">
                                          {medleyIndex}
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <MdLibraryMusic className="text-indigo-400" />
                                            <p className="text-white font-semibold">{medleyName}</p>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                                              {t('choir.medley')} • {medleySongs.length} {t('choir.songs')}
                                            </span>
                                          </div>
                                          {leadChoriste && (
                                            <div className="flex items-center gap-2 mt-1">
                                              <MdStar className="text-amber-400 text-sm" />
                                              <span className="text-sm text-gray-300">{leadChoriste?.member?.full_name}</span>
                                              <span className={`text-xs px-2 py-0.5 rounded-full ${getVoiceTypeBadge(leadChoriste?.voice_type)}`}>
                                                {t(`choir.voice_${leadChoriste?.voice_type}`)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Medley Songs */}
                                  <div className="divide-y divide-indigo-700/30">
                                    {medleySongs.map((ps, songIdx) => (
                                      <div key={ps.id} className="p-3 hover:bg-indigo-800/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 flex-1">
                                            <span className="w-6 h-6 flex items-center justify-center bg-gray-700/50 text-gray-400 rounded text-xs">
                                              {songIdx + 1}
                                            </span>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <p className="text-white">{ps.song?.title}</p>
                                                {ps.song?.key_signature && (
                                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                                    {ps.song.key_signature}
                                                  </span>
                                                )}
                                              </div>
                                              {ps.song?.author && (
                                                <p className="text-xs text-gray-500">{ps.song.author}</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {ps.song?.lyrics && (
                                              <button
                                                onClick={() => toggleSongLyrics(ps.id)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-600 rounded transition-colors"
                                              >
                                                {expandedSongId === ps.id ? <MdKeyboardArrowUp className="text-sm" /> : <MdKeyboardArrowDown className="text-sm" />}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleRemoveSongFromPlanning(ps.id)}
                                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                                            >
                                              <MdDelete className="text-sm" />
                                            </button>
                                          </div>
                                        </div>
                                        {/* Song Lyrics (Expanded) */}
                                        {expandedSongId === ps.id && ps.song?.lyrics && (
                                          <div className="mt-2 p-2 bg-gray-800/50 rounded-lg">
                                            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">
                                              {ps.song.lyrics}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Afficher les chants individuels */}
                            {individualSongs.map((ps) => {
                              globalIndex++;
                              return (
                                <div
                                  key={ps.id}
                                  className="bg-gray-700/50 rounded-lg overflow-hidden"
                                >
                                  {/* Song Header */}
                                  <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <span className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-bold">
                                        {globalIndex}
                                      </span>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-white font-medium">{ps.song?.title}</p>
                                          {ps.song?.key_signature && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                              {t('choir.key')}: {ps.song.key_signature}
                                            </span>
                                          )}
                                          {ps.song?.tempo && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                              {t(`choir.tempo_${ps.song.tempo}`)}
                                            </span>
                                          )}
                                        </div>
                                        {ps.song?.author && (
                                          <p className="text-xs text-gray-500">{ps.song.author}</p>
                                        )}
                                        {ps.lead_choriste && (
                                          <div className="flex items-center gap-2 mt-1">
                                            <MdStar className="text-amber-400 text-sm" />
                                            <span className="text-sm text-gray-300">{ps.lead_choriste?.member?.full_name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getVoiceTypeBadge(ps.lead_choriste?.voice_type)}`}>
                                              {t(`choir.voice_${ps.lead_choriste?.voice_type}`)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {ps.song?.lyrics && (
                                        <button
                                          onClick={() => toggleSongLyrics(ps.id)}
                                          className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-600 rounded-lg transition-colors"
                                          title={t('choir.view_lyrics')}
                                        >
                                          {expandedSongId === ps.id ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleRemoveSongFromPlanning(ps.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                                      >
                                        <MdDelete />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Song Lyrics (Expanded) */}
                                  {expandedSongId === ps.id && ps.song?.lyrics && (
                                    <div className="px-4 pb-4 border-t border-gray-600">
                                      <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                                        <h5 className="text-sm font-medium text-indigo-400 mb-2">{t('choir.lyrics')}</h5>
                                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                                          {ps.song.lyrics}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MdMusicNote className="text-4xl mx-auto mb-2 opacity-50" />
                      <p>{t('choir.no_songs_in_planning')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Participants Tab */}
              {activeDetailTab === 'participants' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">{t('choir.participants_in_planning')}</h4>
                    <button
                      onClick={() => setIsSelectParticipantsOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <MdEdit />
                      {t('choir.select_participants')}
                    </button>
                  </div>

                  {planningParticipants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Grouper par type de voix */}
                      {['soprano', 'alto', 'tenor', 'basse', 'autre'].map(voiceType => {
                        const voiceParticipants = planningParticipants.filter(
                          p => p.choir_member?.voice_type === voiceType
                        );
                        if (voiceParticipants.length === 0) return null;

                        return (
                          <div key={voiceType} className="bg-gray-700/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getVoiceTypeBadge(voiceType)}`}>
                                {t(`choir.voice_${voiceType}`)}
                              </span>
                              <span className="text-xs text-gray-500">({voiceParticipants.length})</span>
                            </div>
                            <div className="space-y-2">
                              {voiceParticipants.map(participant => (
                                <div
                                  key={participant.id}
                                  className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg"
                                >
                                  {participant.choir_member?.member?.profile_photo_url ? (
                                    <img
                                      src={participant.choir_member.member.profile_photo_url}
                                      alt={participant.choir_member.member.full_name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                      <MdPerson className="text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm text-white">{participant.choir_member?.member?.full_name}</p>
                                    {participant.choir_member?.is_lead && (
                                      <span className="text-xs text-amber-400 flex items-center gap-1">
                                        <MdStar className="text-xs" /> Lead
                                      </span>
                                    )}
                                  </div>
                                  {participant.confirmed && (
                                    <MdCheckCircle className="text-green-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MdPeople className="text-4xl mx-auto mb-2 opacity-50" />
                      <p>{t('choir.no_participants_in_planning')}</p>
                      <button
                        onClick={() => setIsSelectParticipantsOpen(true)}
                        className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        {t('choir.add_participants')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Select Participants Modal */}
      {isSelectParticipantsOpen && selectedPlanning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('choir.select_participants')}</h3>
                <p className="text-sm text-gray-400">
                  {selectedParticipantIds.length} {t('choir.selected')}
                </p>
              </div>
              <button
                onClick={() => setIsSelectParticipantsOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Select All / Deselect All */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedParticipantIds(allChoirMembers.map(m => m.id))}
                  className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                >
                  {t('choir.select_all')}
                </button>
                <button
                  onClick={() => setSelectedParticipantIds([])}
                  className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                >
                  {t('choir.deselect_all')}
                </button>
              </div>

              {/* Liste des choristes groupés par voix */}
              {['soprano', 'alto', 'tenor', 'basse', 'autre'].map(voiceType => {
                const voiceMembers = allChoirMembers.filter(m => m.voice_type === voiceType);
                if (voiceMembers.length === 0) return null;

                return (
                  <div key={voiceType} className="mb-4">
                    <h5 className={`text-sm font-medium mb-2 px-2 py-1 rounded ${getVoiceTypeBadge(voiceType)}`}>
                      {t(`choir.voice_${voiceType}`)} ({voiceMembers.length})
                    </h5>
                    <div className="space-y-1">
                      {voiceMembers.map(cm => (
                        <button
                          key={cm.id}
                          onClick={() => toggleParticipantSelection(cm.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedParticipantIds.includes(cm.id)
                              ? 'bg-indigo-600/20 border border-indigo-500'
                              : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                          }`}
                        >
                          {selectedParticipantIds.includes(cm.id) ? (
                            <MdCheckCircle className="text-indigo-400 text-xl" />
                          ) : (
                            <MdRadioButtonUnchecked className="text-gray-500 text-xl" />
                          )}
                          {cm.member?.profile_photo_url ? (
                            <img
                              src={cm.member.profile_photo_url}
                              alt={cm.member?.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                              <MdPerson className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm text-white">{cm.member?.full_name}</p>
                            {cm.is_lead && (
                              <span className="text-xs text-amber-400 flex items-center gap-1">
                                <MdStar className="text-xs" /> Lead
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700 shrink-0">
              <button
                onClick={() => setIsSelectParticipantsOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveParticipants}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('save')} ({selectedParticipantIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Song to Planning Modal */}
      {isAddSongModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{t('choir.add_song_to_planning')}</h3>
              <button
                onClick={() => setIsAddSongModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.select_song')} *</label>
                <select
                  value={songFormData.song_id}
                  onChange={(e) => setSongFormData({ ...songFormData, song_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('choir.choose_song')}</option>
                  {songs.map(song => (
                    <option key={song.id} value={song.id}>
                      {song.title} {song.author && `- ${song.author}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.lead_choriste')}</label>
                <select
                  value={songFormData.lead_choriste_id}
                  onChange={(e) => setSongFormData({ ...songFormData, lead_choriste_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('choir.no_lead')}</option>
                  {choirMembers.map(cm => (
                    <option key={cm.id} value={cm.id}>
                      {cm.member?.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.medley_compilation')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={songFormData.medley_name}
                    onChange={(e) => setSongFormData({ ...songFormData, medley_name: e.target.value })}
                    placeholder={t('choir.medley_placeholder')}
                    list="medley-suggestions"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="medley-suggestions">
                    {existingMedleys.map((medley, idx) => (
                      <option key={idx} value={medley} />
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('choir.medley_hint')}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <input
                  type="text"
                  value={songFormData.notes}
                  onChange={(e) => setSongFormData({ ...songFormData, notes: e.target.value })}
                  placeholder={t('choir.song_notes_placeholder')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsAddSongModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddSongToPlanning}
                disabled={!songFormData.song_id}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Compilation to Planning Modal */}
      {isAddCompilationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-xl">
              <div className="flex items-center gap-2">
                <MdPlaylistPlay className="text-white text-xl" />
                <h3 className="text-lg font-semibold text-white">{t('choir.add_compilation_to_planning')}</h3>
              </div>
              <button
                onClick={() => setIsAddCompilationModalOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.select_compilation')} *</label>
                <select
                  value={compilationFormData.compilation_id}
                  onChange={(e) => setCompilationFormData({ ...compilationFormData, compilation_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('choir.choose_compilation')}</option>
                  {compilations.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.songs?.length || 0} {t('choir.songs')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview de la compilation sélectionnée */}
              {compilationFormData.compilation_id && (() => {
                const selectedComp = compilations.find(c => c.id === compilationFormData.compilation_id);
                if (!selectedComp) return null;
                return (
                  <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-purple-300 mb-2">{t('choir.songs_in_compilation')}:</p>
                    <div className="space-y-1">
                      {selectedComp.songs?.map((cs, idx) => (
                        <div key={cs.id} className="flex items-center gap-2 text-sm text-gray-300">
                          <span className="text-gray-500">{idx + 1}.</span>
                          <span>{cs.song?.title}</span>
                        </div>
                      ))}
                    </div>
                    {selectedComp.description && (
                      <p className="text-xs text-gray-400 mt-2 italic">{selectedComp.description}</p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.lead_for_compilation')}</label>
                <select
                  value={compilationFormData.lead_choriste_id}
                  onChange={(e) => setCompilationFormData({ ...compilationFormData, lead_choriste_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('choir.no_lead')}</option>
                  {choirMembers.map(cm => (
                    <option key={cm.id} value={cm.id}>
                      {cm.member?.full_name} ({t(`choir.voice_${cm.voice_type}`)})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('choir.lead_compilation_hint')}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <input
                  type="text"
                  value={compilationFormData.notes}
                  onChange={(e) => setCompilationFormData({ ...compilationFormData, notes: e.target.value })}
                  placeholder={t('choir.compilation_notes_placeholder')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsAddCompilationModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddCompilationToPlanning}
                disabled={!compilationFormData.compilation_id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPlanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <MdDelete className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('choir.delete_planning')}</h3>
              <p className="text-gray-400">
                {t('choir.delete_planning_confirm', {
                  name: i18n.language === 'fr' ? selectedPlanning.event_name_fr : selectedPlanning.event_name_en
                })}
              </p>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeletePlanning}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChoirPlanningPage;
