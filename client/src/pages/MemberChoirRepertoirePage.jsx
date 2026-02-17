import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MdLibraryMusic, MdAdd, MdDelete, MdEdit, MdSave, MdClose, MdArrowBack, MdMusicNote } from 'react-icons/md';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MemberChoirRepertoirePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [repertoire, setRepertoire] = useState([]);
  const [choirStatus, setChoirStatus] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ proficiency_level: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, repertoireData] = await Promise.all([
        api.member.getChoirStatus(),
        api.member.getChoirRepertoire()
      ]);
      setChoirStatus(statusData);
      setRepertoire(repertoireData);
    } catch (err) {
      console.error('Error fetching repertoire:', err);
      setError(err.response?.data?.error || t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      proficiency_level: item.proficiency_level,
      notes: item.notes || ''
    });
  };

  const handleSave = async (id) => {
    try {
      await api.member.updateChoirRepertoire(id, editForm);
      setRepertoire(repertoire.map(item =>
        item.id === id ? { ...item, ...editForm } : item
      ));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating repertoire:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('member_choir.confirm_remove_song'))) return;

    try {
      await api.member.deleteChoirRepertoire(id);
      setRepertoire(repertoire.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting from repertoire:', err);
    }
  };

  const proficiencyOptions = [
    { value: 'learning', label: t('member_choir.proficiency_learning'), color: 'bg-gray-500/20 text-gray-400' },
    { value: 'comfortable', label: t('member_choir.proficiency_comfortable'), color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'expert', label: t('member_choir.proficiency_expert'), color: 'bg-green-500/20 text-green-400' }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!choirStatus?.is_choir_member) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <MdMusicNote className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-200 mb-2">
          {t('member_choir.not_member_title')}
        </h2>
        <p className="text-gray-400">
          {t('member_choir.not_member_description')}
        </p>
      </div>
    );
  }

  if (!choirStatus?.choir_member?.is_lead) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <MdLibraryMusic className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-200 mb-2">
          {t('member_choir.not_lead_title')}
        </h2>
        <p className="text-gray-400">
          {t('member_choir.not_lead_description')}
        </p>
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
              <MdLibraryMusic className="w-7 h-7 text-indigo-400" />
              {t('member_choir.my_repertoire')}
            </h1>
            <p className="text-gray-400">{repertoire.length} {t('member_choir.songs')}</p>
          </div>
        </div>
        <Link
          to="/member/choir/songs"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          {t('member_choir.add_song')}
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Repertoire List */}
      {repertoire.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <MdLibraryMusic className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-200 mb-2">
            {t('member_choir.empty_repertoire')}
          </h2>
          <p className="text-gray-400 mb-4">
            {t('member_choir.empty_repertoire_hint')}
          </p>
          <Link
            to="/member/choir/songs"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <MdAdd className="w-5 h-5" />
            {t('member_choir.browse_songs')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {repertoire.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4"
            >
              {editingId === item.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-100">{item.choir_songs_v2?.title}</h3>
                      <p className="text-sm text-gray-400">{item.choir_songs_v2?.author}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(item.id)}
                        className="p-2 bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        <MdSave className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500"
                      >
                        <MdClose className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        {t('member_choir.proficiency_level')}
                      </label>
                      <select
                        value={editForm.proficiency_level}
                        onChange={(e) => setEditForm({ ...editForm, proficiency_level: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100"
                      >
                        {proficiencyOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        {t('notes')}
                      </label>
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder={t('member_choir.personal_notes')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-100">{item.choir_songs_v2?.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        proficiencyOptions.find(o => o.value === item.proficiency_level)?.color || 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {proficiencyOptions.find(o => o.value === item.proficiency_level)?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{item.choir_songs_v2?.author}</p>
                    {item.choir_songs_v2?.choir_song_categories_v2 && (
                      <span
                        className="inline-block mt-2 text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${item.choir_songs_v2.choir_song_categories_v2.color}20`,
                          color: item.choir_songs_v2.choir_song_categories_v2.color
                        }}
                      >
                        {lang === 'fr'
                          ? item.choir_songs_v2.choir_song_categories_v2.name_fr
                          : item.choir_songs_v2.choir_song_categories_v2.name_en}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-1 italic">"{item.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.choir_songs_v2?.key_signature && (
                      <span className="text-sm text-gray-500">
                        {t('choir.key')}: {item.choir_songs_v2.key_signature}
                      </span>
                    )}
                    <div className="flex gap-2">
                      <Link
                        to={`/member/choir/songs/${item.choir_songs_v2?.id}`}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                        title={t('view')}
                      >
                        <MdMusicNote className="w-4 h-4 text-gray-300" />
                      </Link>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                        title={t('edit')}
                      >
                        <MdEdit className="w-4 h-4 text-gray-300" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-red-600/20 rounded-lg hover:bg-red-600/40"
                        title={t('delete')}
                      >
                        <MdDelete className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
