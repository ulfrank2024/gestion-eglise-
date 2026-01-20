import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdPeople, MdAdd, MdSearch, MdArchive, MdUnarchive,
  MdEdit, MdDelete, MdFilterList, MdPerson
} from 'react-icons/md';

function AdminMembersListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [members, setMembers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // États pour le formulaire d'ajout
  const [newMember, setNewMember] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showArchived]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersData, statsData] = await Promise.all([
        api.admin.getMembers({ archived: showArchived, search }),
        api.admin.getMemberStatistics()
      ]);
      setMembers(membersData.members || []);
      setStatistics(statsData);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await api.admin.getMembers({ archived: showArchived, search });
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.admin.createMember(newMember);
      setShowAddModal(false);
      setNewMember({ full_name: '', email: '', phone: '', address: '', date_of_birth: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (memberId, archive) => {
    try {
      await api.admin.archiveMember(memberId, archive);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm(t('confirm_delete_member'))) return;
    try {
      await api.admin.deleteMember(memberId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="p-6 text-gray-300">
        {t('loading')}...
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header avec statistiques */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MdPeople className="text-3xl text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-100">
              {t('members') || 'Membres'}
            </h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            <MdAdd size={20} />
            {t('add_member') || 'Ajouter un membre'}
          </button>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/20 rounded-lg">
                <MdPeople className="text-2xl text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('active_members') || 'Membres actifs'}</p>
                <p className="text-2xl font-bold text-gray-100">{statistics.totalActive || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <MdPerson className="text-2xl text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('new_this_month') || 'Nouveaux ce mois'}</p>
                <p className="text-2xl font-bold text-gray-100">{statistics.newThisMonth || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-600/20 rounded-lg">
                <MdArchive className="text-2xl text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('archived') || 'Archivés'}</p>
                <p className="text-2xl font-bold text-gray-100">{statistics.totalArchived || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <MdPeople className="text-2xl text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('total_roles') || 'Rôles'}</p>
                <p className="text-2xl font-bold text-gray-100">{statistics.totalRoles || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search_members') || 'Rechercher par nom ou email...'}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('search') || 'Rechercher'}
            </button>
          </form>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showArchived
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <MdFilterList />
            {showArchived ? t('show_active') || 'Voir actifs' : t('show_archived') || 'Voir archivés'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Tableau des membres */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('member') || 'Membre'}</th>
              <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('email')}</th>
              <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('phone') || 'Téléphone'}</th>
              <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('roles') || 'Rôles'}</th>
              <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('joined_at') || 'Inscrit le'}</th>
              <th className="px-4 py-3 text-center text-gray-300 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {members.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                  {showArchived
                    ? t('no_archived_members') || 'Aucun membre archivé'
                    : t('no_members') || 'Aucun membre trouvé'}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.profile_photo_url ? (
                        <img
                          src={member.profile_photo_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          <MdPerson className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-100 font-medium">{member.full_name}</p>
                        {!member.is_active && (
                          <span className="text-xs text-amber-400">{t('inactive') || 'Inactif'}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{member.email}</td>
                  <td className="px-4 py-3 text-gray-300">{member.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {member.member_roles_v2?.map((mr) => (
                        <span
                          key={mr.id}
                          className="px-2 py-1 text-xs rounded-full text-white"
                          style={{ backgroundColor: mr.church_roles_v2?.color || '#6366f1' }}
                        >
                          {lang === 'fr' ? mr.church_roles_v2?.name_fr : mr.church_roles_v2?.name_en}
                        </span>
                      )) || <span className="text-gray-500">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/members/${member.id}`)}
                        className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('view_details') || 'Voir les détails'}
                      >
                        <MdEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleArchive(member.id, !member.is_archived)}
                        className={`p-2 rounded-lg transition-colors ${
                          member.is_archived
                            ? 'text-green-400 hover:text-green-300 hover:bg-gray-700'
                            : 'text-amber-400 hover:text-amber-300 hover:bg-gray-700'
                        }`}
                        title={member.is_archived ? t('unarchive') || 'Désarchiver' : t('archive') || 'Archiver'}
                      >
                        {member.is_archived ? <MdUnarchive size={18} /> : <MdArchive size={18} />}
                      </button>
                      {member.is_archived && (
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                          title={t('delete') || 'Supprimer'}
                        >
                          <MdDelete size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'ajout de membre */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdPerson />
                {t('add_member') || 'Ajouter un membre'}
              </h2>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('full_name')} *</label>
                <input
                  type="text"
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('email')} *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('phone') || 'Téléphone'}</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('date_of_birth') || 'Date de naissance'}</label>
                <input
                  type="date"
                  value={newMember.date_of_birth}
                  onChange={(e) => setNewMember({ ...newMember, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {submitting ? t('saving') || 'Enregistrement...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMembersListPage;
