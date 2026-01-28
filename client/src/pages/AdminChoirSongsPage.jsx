import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdLibraryMusic,
  MdAdd,
  MdSearch,
  MdFilterList,
  MdEdit,
  MdDelete,
  MdArrowBack,
  MdClose,
  MdCategory,
  MdMusicNote,
  MdPerson
} from 'react-icons/md';

const AdminChoirSongsPage = () => {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category_id: '',
    lyrics: '',
    notes: '',
    tempo: '',
    key_signature: ''
  });

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name_fr: '',
    name_en: '',
    color: '#6366f1'
  });

  const tempoOptions = ['lent', 'modéré', 'rapide'];
  const keyOptions = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [songsData, categoriesData] = await Promise.all([
        api.admin.getSongs(),
        api.admin.getSongCategories()
      ]);

      setSongs(songsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching songs:', err);
      setError(t('choir.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async () => {
    try {
      await api.admin.createSong(formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error creating song:', err);
      setError(err.response?.data?.error || t('choir.error_creating_song'));
    }
  };

  const handleUpdateSong = async () => {
    try {
      await api.admin.updateSong(selectedSong.id, formData);
      setIsEditModalOpen(false);
      setSelectedSong(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error updating song:', err);
      setError(err.response?.data?.error || t('choir.error_updating_song'));
    }
  };

  const handleDeleteSong = async () => {
    try {
      await api.admin.deleteSong(selectedSong.id);
      setIsDeleteModalOpen(false);
      setSelectedSong(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting song:', err);
      setError(err.response?.data?.error || t('choir.error_deleting_song'));
    }
  };

  const handleAddCategory = async () => {
    try {
      await api.admin.createSongCategory(categoryForm);
      setIsCategoryModalOpen(false);
      setCategoryForm({ name_fr: '', name_en: '', color: '#6366f1' });
      fetchData();
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.error || t('choir.error_creating_category'));
    }
  };

  const openEditModal = (song) => {
    setSelectedSong(song);
    setFormData({
      title: song.title,
      author: song.author || '',
      category_id: song.category_id || '',
      lyrics: song.lyrics || '',
      notes: song.notes || '',
      tempo: song.tempo || '',
      key_signature: song.key_signature || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (song) => {
    setSelectedSong(song);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      category_id: '',
      lyrics: '',
      notes: '',
      tempo: '',
      key_signature: ''
    });
  };

  // Filtrer les chants
  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         song.author?.toLowerCase().includes(searchTerm.toLowerCase());

    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && song.category_id === categoryFilter;
  });

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return null;
    return i18n.language === 'fr' ? category.name_fr : category.name_en;
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6366f1';
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
              <MdLibraryMusic className="text-emerald-400" />
              {t('choir.repertoire_title')}
            </h1>
            <p className="text-gray-400 text-sm">{songs.length} {t('choir.songs')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MdCategory />
            {t('choir.manage_categories')}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors"
          >
            <MdAdd className="text-xl" />
            {t('choir.add_song')}
          </button>
        </div>
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
            placeholder={t('choir.search_song')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <MdFilterList className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t('choir.all_categories')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {i18n.language === 'fr' ? category.name_fr : category.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Songs List */}
      {filteredSongs.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left p-4 text-gray-300 font-medium">{t('choir.song_title')}</th>
                <th className="text-left p-4 text-gray-300 font-medium">{t('choir.author')}</th>
                <th className="text-left p-4 text-gray-300 font-medium">{t('choir.category')}</th>
                <th className="text-left p-4 text-gray-300 font-medium">{t('choir.tempo')}</th>
                <th className="text-left p-4 text-gray-300 font-medium">{t('choir.key')}</th>
                <th className="text-right p-4 text-gray-300 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                <tr key={song.id} className="border-t border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <MdMusicNote className="text-emerald-400" />
                      </div>
                      <span className="font-medium text-white">{song.title}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">
                    {song.author || '-'}
                  </td>
                  <td className="p-4">
                    {song.category_id ? (
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${getCategoryColor(song.category_id)}20`,
                          color: getCategoryColor(song.category_id)
                        }}
                      >
                        {getCategoryName(song.category_id)}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-400">
                    {song.tempo ? t(`choir.tempo_${song.tempo}`) : '-'}
                  </td>
                  <td className="p-4 text-gray-400">
                    {song.key_signature || '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(song)}
                        className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => openDeleteModal(song)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
          <MdLibraryMusic className="text-5xl text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('choir.no_songs')}</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 text-emerald-400 hover:text-emerald-300"
          >
            {t('choir.add_first_song')}
          </button>
        </div>
      )}

      {/* Add/Edit Song Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {isEditModalOpen ? t('choir.edit_song') : t('choir.add_song')}
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

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.song_title')} *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('choir.song_title_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.author')}</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('choir.author_placeholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.category')}</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">{t('choir.select_category')}</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {i18n.language === 'fr' ? category.name_fr : category.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.tempo')}</label>
                  <select
                    value={formData.tempo}
                    onChange={(e) => setFormData({ ...formData, tempo: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">{t('choir.select_tempo')}</option>
                    {tempoOptions.map(tempo => (
                      <option key={tempo} value={tempo}>{t(`choir.tempo_${tempo}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.key')}</label>
                  <select
                    value={formData.key_signature}
                    onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">{t('choir.select_key')}</option>
                    {keyOptions.map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.lyrics')}</label>
                <textarea
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder={t('choir.lyrics_placeholder')}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('choir.song_notes_placeholder')}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                onClick={isEditModalOpen ? handleUpdateSong : handleAddSong}
                disabled={!formData.title}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditModalOpen ? t('save') : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <MdDelete className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('choir.delete_song')}</h3>
              <p className="text-gray-400">
                {t('choir.delete_song_confirm', { title: selectedSong.title })}
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
                onClick={handleDeleteSong}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{t('choir.manage_categories')}</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4">
              {/* Existing Categories */}
              <div className="mb-4">
                <h4 className="text-sm text-gray-400 mb-2">{t('choir.existing_categories')}</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <span
                      key={category.id}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${category.color}20`,
                        color: category.color
                      }}
                    >
                      {i18n.language === 'fr' ? category.name_fr : category.name_en}
                    </span>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-gray-500 text-sm">{t('choir.no_categories')}</span>
                  )}
                </div>
              </div>

              {/* Add New Category */}
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <h4 className="text-sm text-gray-400">{t('choir.add_category')}</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('choir.name_fr')}</label>
                    <input
                      type="text"
                      value={categoryForm.name_fr}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name_fr: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Louange"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('choir.name_en')}</label>
                    <input
                      type="text"
                      value={categoryForm.name_en}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Worship"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('choir.color')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <span className="text-gray-400 text-sm">{categoryForm.color}</span>
                  </div>
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={!categoryForm.name_fr || !categoryForm.name_en}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('choir.add_category')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChoirSongsPage;
