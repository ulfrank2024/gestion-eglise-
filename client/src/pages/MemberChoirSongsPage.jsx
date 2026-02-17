import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MdMusicNote, MdSearch, MdFilterList, MdArrowBack, MdAdd, MdCheck } from 'react-icons/md';
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
      // Refresh repertoire
      const newRepertoire = await api.member.getChoirRepertoire();
      setMyRepertoire(newRepertoire);
    } catch (err) {
      console.error('Error adding to repertoire:', err);
      alert(err.response?.data?.error || t('error_occurred'));
    } finally {
      setAddingSongId(null);
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
      </div>

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
          <p className="text-gray-400">
            {t('member_choir.try_different_search')}
          </p>
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
