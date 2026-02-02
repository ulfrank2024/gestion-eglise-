import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdLibraryMusic,
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdArrowBack,
  MdClose,
  MdMusicNote,
  MdDragIndicator,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdPlaylistAdd
} from 'react-icons/md';

const AdminChoirCompilationsPage = () => {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compilations, setCompilations] = useState([]);
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddSongsModalOpen, setIsAddSongsModalOpen] = useState(false);
  const [selectedCompilation, setSelectedCompilation] = useState(null);
  const [expandedCompilationId, setExpandedCompilationId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    song_ids: []
  });

  // Songs selection for adding to compilation
  const [selectedSongIds, setSelectedSongIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch compilations
      try {
        const compilationsData = await api.admin.getCompilations();
        setCompilations(Array.isArray(compilationsData) ? compilationsData : []);
      } catch (err) {
        console.error('Error fetching compilations:', err);
        setCompilations([]);
      }

      // Fetch songs
      try {
        const songsData = await api.admin.getSongs();
        setSongs(Array.isArray(songsData) ? songsData : []);
      } catch (err) {
        console.error('Error fetching songs:', err);
        setSongs([]);
      }

      // Fetch categories
      try {
        const categoriesData = await api.admin.getSongCategories();
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategories([]);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('choir.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompilation = async () => {
    try {
      await api.admin.createCompilation({
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || null,
        song_ids: formData.song_ids
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error creating compilation:', err);
      setError(err.response?.data?.error || t('choir.error_creating_compilation'));
    }
  };

  const handleUpdateCompilation = async () => {
    try {
      await api.admin.updateCompilation(selectedCompilation.id, {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || null
      });
      setIsEditModalOpen(false);
      setSelectedCompilation(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error updating compilation:', err);
      setError(err.response?.data?.error || t('choir.error_updating_compilation'));
    }
  };

  const handleDeleteCompilation = async () => {
    try {
      await api.admin.deleteCompilation(selectedCompilation.id);
      setIsDeleteModalOpen(false);
      setSelectedCompilation(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting compilation:', err);
      setError(err.response?.data?.error || t('choir.error_deleting_compilation'));
    }
  };

  const handleAddSongsToCompilation = async () => {
    try {
      for (const songId of selectedSongIds) {
        await api.admin.addSongToCompilation(selectedCompilation.id, { song_id: songId });
      }
      setIsAddSongsModalOpen(false);
      setSelectedSongIds([]);
      fetchData();
    } catch (err) {
      console.error('Error adding songs to compilation:', err);
      setError(err.response?.data?.error || t('choir.error_adding_song'));
    }
  };

  const handleRemoveSongFromCompilation = async (compilationSongId) => {
    try {
      await api.admin.removeSongFromCompilation(compilationSongId);
      fetchData();
    } catch (err) {
      console.error('Error removing song from compilation:', err);
      setError(err.response?.data?.error || t('choir.error_removing_song'));
    }
  };

  const openEditModal = (compilation) => {
    setSelectedCompilation(compilation);
    setFormData({
      name: compilation.name,
      description: compilation.description || '',
      category_id: compilation.category_id || '',
      song_ids: []
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (compilation) => {
    setSelectedCompilation(compilation);
    setIsDeleteModalOpen(true);
  };

  const openAddSongsModal = (compilation) => {
    setSelectedCompilation(compilation);
    const existingSongIds = compilation.songs?.map(s => s.song?.id) || [];
    setSelectedSongIds([]);
    setIsAddSongsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      song_ids: []
    });
  };

  const toggleSongSelection = (songId) => {
    setFormData(prev => ({
      ...prev,
      song_ids: prev.song_ids.includes(songId)
        ? prev.song_ids.filter(id => id !== songId)
        : [...prev.song_ids, songId]
    }));
  };

  const toggleAddSongSelection = (songId) => {
    setSelectedSongIds(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const filteredCompilations = compilations.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <MdLibraryMusic className="text-purple-400" />
              {t('choir.compilations_title')}
            </h1>
            <p className="text-gray-400 text-sm">{compilations.length} {t('choir.compilations')}</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
        >
          <MdAdd className="text-xl" />
          {t('choir.create_compilation')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('choir.search_compilation')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Compilations List */}
      {filteredCompilations.length > 0 ? (
        <div className="space-y-4">
          {filteredCompilations.map((compilation) => (
            <div
              key={compilation.id}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Compilation Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <MdLibraryMusic className="text-purple-400 text-xl" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{compilation.name}</h3>
                        {compilation.category && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${compilation.category.color}30`, color: compilation.category.color }}
                          >
                            {i18n.language === 'fr' ? compilation.category.name_fr : compilation.category.name_en}
                          </span>
                        )}
                      </div>
                      {compilation.description && (
                        <p className="text-sm text-gray-400 mt-1">{compilation.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        <MdMusicNote className="inline mr-1" />
                        {compilation.songs?.length || 0} {t('choir.songs')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedCompilationId(
                        expandedCompilationId === compilation.id ? null : compilation.id
                      )}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {expandedCompilationId === compilation.id ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                    </button>
                    <button
                      onClick={() => openAddSongsModal(compilation)}
                      className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('choir.add_song')}
                    >
                      <MdPlaylistAdd />
                    </button>
                    <button
                      onClick={() => openEditModal(compilation)}
                      className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MdEdit />
                    </button>
                    <button
                      onClick={() => openDeleteModal(compilation)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MdDelete />
                    </button>
                  </div>
                </div>
              </div>

              {/* Songs List (Expanded) */}
              {expandedCompilationId === compilation.id && (
                <div className="border-t border-gray-700 bg-gray-700/30">
                  {compilation.songs && compilation.songs.length > 0 ? (
                    <div className="divide-y divide-gray-700/50">
                      {compilation.songs.map((cs, index) => (
                        <div key={cs.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-700/50">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-700 text-gray-400 rounded text-xs font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-white">{cs.song?.title}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {cs.song?.author && <span>{cs.song.author}</span>}
                                {cs.song?.key_signature && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                    {cs.song.key_signature}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSongFromCompilation(cs.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                          >
                            <MdDelete className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>{t('choir.no_songs_in_compilation')}</p>
                      <button
                        onClick={() => openAddSongsModal(compilation)}
                        className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        {t('choir.add_songs')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
          <MdLibraryMusic className="text-5xl text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('choir.no_compilations')}</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 text-purple-400 hover:text-purple-300"
          >
            {t('choir.create_first_compilation')}
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <h3 className="text-lg font-semibold text-white">
                {isEditModalOpen ? t('choir.edit_compilation') : t('choir.create_compilation')}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedCompilation(null);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.compilation_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('choir.compilation_name_placeholder')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('choir.compilation_description_placeholder')}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.category')}</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('choir.no_category')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {i18n.language === 'fr' ? cat.name_fr : cat.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Songs selection (only for create) */}
              {isCreateModalOpen && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.select_songs')}</label>
                  <div className="max-h-60 overflow-y-auto bg-gray-700/50 rounded-lg p-2 space-y-1">
                    {songs.map(song => (
                      <button
                        key={song.id}
                        onClick={() => toggleSongSelection(song.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                          formData.song_ids.includes(song.id)
                            ? 'bg-purple-600/20 border border-purple-500'
                            : 'hover:bg-gray-600 border border-transparent'
                        }`}
                      >
                        <span className={`w-5 h-5 flex items-center justify-center rounded border ${
                          formData.song_ids.includes(song.id)
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'border-gray-500'
                        }`}>
                          {formData.song_ids.includes(song.id) && '✓'}
                        </span>
                        <div>
                          <p className="text-white text-sm">{song.title}</p>
                          {song.author && <p className="text-xs text-gray-500">{song.author}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.song_ids.length} {t('choir.songs_selected')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700 shrink-0">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedCompilation(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={isEditModalOpen ? handleUpdateCompilation : handleCreateCompilation}
                disabled={!formData.name}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditModalOpen ? t('save') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Songs Modal */}
      {isAddSongsModalOpen && selectedCompilation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('choir.add_songs_to_compilation')}</h3>
                <p className="text-sm text-gray-400">{selectedCompilation.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsAddSongsModalOpen(false);
                  setSelectedSongIds([]);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                {songs
                  .filter(song => !selectedCompilation.songs?.some(s => s.song?.id === song.id))
                  .map(song => (
                    <button
                      key={song.id}
                      onClick={() => toggleAddSongSelection(song.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                        selectedSongIds.includes(song.id)
                          ? 'bg-purple-600/20 border border-purple-500'
                          : 'hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center rounded border ${
                        selectedSongIds.includes(song.id)
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'border-gray-500'
                      }`}>
                        {selectedSongIds.includes(song.id) && '✓'}
                      </span>
                      <div>
                        <p className="text-white text-sm">{song.title}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          {song.author && <span>{song.author}</span>}
                          {song.key_signature && <span>• {song.key_signature}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700 shrink-0">
              <button
                onClick={() => {
                  setIsAddSongsModalOpen(false);
                  setSelectedSongIds([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddSongsToCompilation}
                disabled={selectedSongIds.length === 0}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('add')} ({selectedSongIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCompilation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <MdDelete className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('choir.delete_compilation')}</h3>
              <p className="text-gray-400">
                {t('choir.delete_compilation_confirm', { name: selectedCompilation.name })}
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
                onClick={handleDeleteCompilation}
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

export default AdminChoirCompilationsPage;
