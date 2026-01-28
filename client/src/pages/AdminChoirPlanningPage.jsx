import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
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
  MdEvent
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
    notes: ''
  });

  const eventTypes = ['culte', 'repetition', 'concert', 'autre'];

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (dateFilter === 'upcoming') params.upcoming = true;
      if (dateFilter === 'past') params.past = true;

      const [planningsData, songsData, membersData] = await Promise.all([
        api.admin.getChoirPlannings(params),
        api.admin.getSongs(),
        api.admin.getChoirMembers({ is_lead: true })
      ]);

      setPlannings(planningsData);
      setSongs(songsData);
      setChoirMembers(membersData);
    } catch (err) {
      console.error('Error fetching plannings:', err);
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
      setSongFormData({ song_id: '', lead_choriste_id: '', order_position: 0, notes: '' });
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

  const fetchPlanningDetails = async (planningId) => {
    try {
      const data = await api.admin.getChoirPlanning(planningId);
      setSelectedPlanning(data);
      setPlanningSongs(data.songs || []);
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
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
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="upcoming">{t('choir.upcoming')}</option>
            <option value="past">{t('choir.past')}</option>
            <option value="all">{t('choir.all')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Culte du dimanche"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_name_en')} *</label>
                  <input
                    type="text"
                    value={formData.event_name_en}
                    onChange={(e) => setFormData({ ...formData, event_name_en: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_time')}</label>
                  <input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.event_type')}</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
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

      {/* Planning Detail Modal (Songs) */}
      {isDetailModalOpen && selectedPlanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {i18n.language === 'fr' ? selectedPlanning.event_name_fr : selectedPlanning.event_name_en}
                </h3>
                <p className="text-sm text-gray-400">{formatDate(selectedPlanning.event_date)}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium">{t('choir.songs_in_planning')}</h4>
                <button
                  onClick={() => setIsAddSongModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <MdAdd />
                  {t('choir.add_song')}
                </button>
              </div>

              {planningSongs.length > 0 ? (
                <div className="space-y-2">
                  {planningSongs.map((ps, index) => (
                    <div
                      key={ps.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-white font-medium">{ps.song?.title}</p>
                          {ps.lead_choriste && (
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <MdPerson className="text-amber-400" />
                              {ps.lead_choriste?.member?.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSongFromPlanning(ps.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MdMusicNote className="text-4xl mx-auto mb-2 opacity-50" />
                  <p>{t('choir.no_songs_in_planning')}</p>
                </div>
              )}
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <input
                  type="text"
                  value={songFormData.notes}
                  onChange={(e) => setSongFormData({ ...songFormData, notes: e.target.value })}
                  placeholder={t('choir.song_notes_placeholder')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
