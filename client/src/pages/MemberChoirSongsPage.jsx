import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MdMusicNote, MdSearch, MdFilterList, MdArrowBack, MdAdd, MdCheck, MdClose } from 'react-icons/md';
import { api } from '../api/api';

export default function MemberChoirSongsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [choirStatus, setChoirStatus] = useState(null);
  const [myRepertoire, setMyRepertoire] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [addingSongId, setAddingSongId] = useState(null);

  // État pour le formulaire d'ajout de chant
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [newSong, setNewSong] = useState({
    title: '',
    author: '',
    lyrics: '',
    tempo: '',
    key_signature: '',
    category_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, songsData, categoriesData, repertoireData] = await Promise.all([
        api.member.getChoirStatus(),
        api.member.getChoirSongs(),
        api.member.getChoirCategories(),
        api.member.getChoirRepertoire().catch(() => [])
      ]);
      setChoirStatus(statusData);
      setSongs(songsData);
      setCategories(categoriesData);
      setMyRepertoire(repertoireData);
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToRepertoire = async (songId) => {
    try {
      setAddingSongId(songId);
      await api.member.addToChoirRepertoire({ song_id: songId, proficiency_level: 'learning' });
      const newRepertoire = await api.member.getChoirRepertoire();
      setMyRepertoire(newRepertoire);
    } catch (err) {
      console.error('Error adding to repertoire:', err);
      alert(err.response?.data?.error || t('error_occurred'));
    } finally {
      setAddingSongId(null);
    }
  };

  const handleCreateSong = async (e) => {
    e.preventDefault();
    if (!newSong.title.trim()) {
      setFormError(t('member_choir.title_required') || 'Le titre est requis');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const songData = {
        ...newSong,
        tempo: newSong.tempo ? parseInt(newSong.tempo) : null,
        category_id: newSong.category_id || null
      };
      await api.member.createChoirSong(songData);

      // Reset form et refresh la liste
      setNewSong({ title: '', author: '', lyrics: '', tempo: '', key_signature: '', category_id: '', notes: '' });
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      console.error('Error creating song:', err);
      setFormError(err.response?.data?.error || t('error_occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const isInMyRepertoire = (songId) => {
    return myRepertoire.some(r => r.choir_songs_v2?.id === songId);
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = !search ||
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      (song.author && song.author.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || song.choir_song_categories_v2?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/member/choir"
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MdArrowBack className="w-5 h-5 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <MdMusicNote className="w-7 h-7 text-green-400" />
              {t('member_choir.all_songs')}
            </h1>
            <p className="text-gray-400">{filteredSongs.length} {t('member_choir.songs')}</p>
          </div>
        </div>

        {/* Bouton Ajouter un chant */}
        {choirStatus?.is_choir_member && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
          >
            <MdAdd className="w-5 h-5" />
            {t('member_choir.add_song') || 'Ajouter un chant'}
          </button>
        )}
      </div>

      {/* Modal Ajouter un chant */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-xl p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdMusicNote className="w-6 h-6" />
                {t('member_choir.add_song') || 'Ajouter un chant'}
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-white/80 hover:text-white">
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleCreateSong} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('choir.song_title') || 'Titre du chant'} *
                </label>
                <input
                  type="text"
                  value={newSong.title}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  placeholder="Ex: Amazing Grace"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Auteur */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('choir.author') || 'Auteur'}
                </label>
                <input
                  type="text"
                  value={newSong.author}
                  onChange={(e) => setNewSong({ ...newSong, author: e.target.value })}
                  placeholder="Ex: John Newton"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Tonalité + Tempo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('choir.key') || 'Tonalité'}
                  </label>
                  <input
                    type="text"
                    value={newSong.key_signature}
                    onChange={(e) => setNewSong({ ...newSong, key_signature: e.target.value })}
                    placeholder="Ex: Do majeur, C"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('choir.tempo') || 'Tempo (BPM)'}
                  </label>
                  <input
                    type="number"
                    value={newSong.tempo}
                    onChange={(e) => setNewSong({ ...newSong, tempo: e.target.value })}
                    placeholder="Ex: 120"
                    min="40"
                    max="240"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('choir.category') || 'Catégorie'}
                </label>
                <select
                  value={newSong.category_id}
                  onChange={(e) => setNewSong({ ...newSong, category_id: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">{t('member_choir.no_category') || 'Sans catégorie'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {lang === 'fr' ? cat.name_fr : cat.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paroles */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('choir.lyrics') || 'Paroles'}
                </label>
                <textarea
                  value={newSong.lyrics}
                  onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
                  placeholder={t('member_choir.lyrics_placeholder') || 'Collez les paroles du chant ici...'}
                  rows={8}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('choir.notes') || 'Notes'}
                </label>
                <input
                  type="text"
                  value={newSong.notes}
                  onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })}
                  placeholder={t('member_choir.notes_placeholder') || 'Notes supplémentaires...'}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <MdAdd className="w-5 h-5" />
                      {t('member_choir.create_song') || 'Créer le chant'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('member_choir.search_songs')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-gray-100 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">{t('member_choir.all_categories')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {lang === 'fr' ? cat.name_fr : cat.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Songs Grid */}
      {filteredSongs.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <MdMusicNote className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-200 mb-2">
            {t('member_choir.no_songs_found')}
          </h2>
          <p className="text-gray-400 mb-4">
            {t('member_choir.try_different_search')}
          </p>
          {choirStatus?.is_choir_member && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <MdAdd className="w-5 h-5" />
              {t('member_choir.add_song') || 'Ajouter un chant'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => {
            const inRepertoire = isInMyRepertoire(song.id);
            return (
              <div
                key={song.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-100 line-clamp-1">{song.title}</h3>
                    {song.author && (
                      <p className="text-sm text-gray-400">{song.author}</p>
                    )}
                  </div>
                  {song.choir_song_categories_v2 && (
                    <span
                      className="text-xs px-2 py-1 rounded ml-2 shrink-0"
                      style={{
                        backgroundColor: `${song.choir_song_categories_v2.color}20`,
                        color: song.choir_song_categories_v2.color
                      }}
                    >
                      {lang === 'fr'
                        ? song.choir_song_categories_v2.name_fr
                        : song.choir_song_categories_v2.name_en}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  {song.key_signature && (
                    <span>{t('choir.key')}: {song.key_signature}</span>
                  )}
                  {song.tempo && (
                    <span>• {song.tempo} BPM</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/member/choir/songs/${song.id}`}
                    className="flex-1 bg-gray-700 text-center py-2 rounded-lg hover:bg-gray-600 transition-colors text-gray-300 text-sm"
                  >
                    {t('view')}
                  </Link>
                  {choirStatus?.choir_member?.is_lead && (
                    inRepertoire ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-1 bg-green-600/20 text-green-400 px-4 py-2 rounded-lg text-sm cursor-default"
                      >
                        <MdCheck className="w-4 h-4" />
                        {t('member_choir.in_repertoire')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToRepertoire(song.id)}
                        disabled={addingSongId === song.id}
                        className="flex items-center justify-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {addingSongId === song.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <MdAdd className="w-4 h-4" />
                            {t('add')}
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
