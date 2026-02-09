import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { MdMusicNote, MdArrowBack, MdAdd, MdCheck, MdPerson } from 'react-icons/md';
import api from '../api/api';

export default function MemberChoirSongDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { songId } = useParams();

  const [loading, setLoading] = useState(true);
  const [song, setSong] = useState(null);
  const [choirStatus, setChoirStatus] = useState(null);
  const [isInRepertoire, setIsInRepertoire] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [songId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [songData, statusData, repertoireData] = await Promise.all([
        api.member.getChoirSong(songId),
        api.member.getChoirStatus(),
        api.member.getChoirRepertoire().catch(() => [])
      ]);
      setSong(songData);
      setChoirStatus(statusData);
      setIsInRepertoire(repertoireData.some(r => r.choir_songs_v2?.id === songId));
    } catch (err) {
      console.error('Error fetching song:', err);
      setError(err.response?.data?.error || t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToRepertoire = async () => {
    try {
      setAdding(true);
      await api.member.addToChoirRepertoire({ song_id: songId, proficiency_level: 'learning' });
      setIsInRepertoire(true);
    } catch (err) {
      console.error('Error adding to repertoire:', err);
      alert(err.response?.data?.error || t('error_occurred'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
        {error || t('member_choir.song_not_found')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/member/choir/songs"
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MdArrowBack className="w-5 h-5 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{song.title}</h1>
            {song.author && (
              <p className="text-gray-400">{song.author}</p>
            )}
          </div>
        </div>

        {choirStatus?.choir_member?.is_lead && (
          isInRepertoire ? (
            <button
              disabled
              className="flex items-center gap-2 bg-green-600/20 text-green-400 px-4 py-2 rounded-lg cursor-default"
            >
              <MdCheck className="w-5 h-5" />
              {t('member_choir.in_repertoire')}
            </button>
          ) : (
            <button
              onClick={handleAddToRepertoire}
              disabled={adding}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50"
            >
              {adding ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <MdAdd className="w-5 h-5" />
                  {t('member_choir.add_to_repertoire')}
                </>
              )}
            </button>
          )
        )}
      </div>

      {/* Song Info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {song.choir_song_categories_v2 && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">{t('choir.category')}</p>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: `${song.choir_song_categories_v2.color}20`,
                  color: song.choir_song_categories_v2.color
                }}
              >
                {lang === 'fr' ? song.choir_song_categories_v2.name_fr : song.choir_song_categories_v2.name_en}
              </span>
            </div>
          )}
          {song.key_signature && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">{t('choir.key')}</p>
              <p className="text-gray-200 font-medium">{song.key_signature}</p>
            </div>
          )}
          {song.tempo && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">{t('choir.tempo')}</p>
              <p className="text-gray-200 font-medium">{song.tempo} BPM</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">{t('choir.added')}</p>
            <p className="text-gray-200 font-medium">
              {new Date(song.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
            </p>
          </div>
        </div>

        {/* Lyrics */}
        {song.lyrics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <MdMusicNote className="w-5 h-5 text-indigo-400" />
              {t('choir.lyrics')}
            </h2>
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
              <pre className="whitespace-pre-wrap text-gray-300 font-sans leading-relaxed">
                {song.lyrics}
              </pre>
            </div>
          </div>
        )}

        {/* Notes */}
        {song.notes && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-3">{t('notes')}</h2>
            <p className="text-gray-400">{song.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
