import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import ConfirmModal from '../components/ConfirmModal';
import {
  MdPeople, MdAdd, MdSearch, MdArchive, MdUnarchive,
  MdEdit, MdDelete, MdFilterList, MdPerson, MdBadge, MdClose, MdCheck, MdVisibility
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

  // États pour le modal d'assignation de rôles
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // États pour la modal de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = (member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await api.admin.deleteMember(memberToDelete.id);
      setShowDeleteModal(false);
      setMemberToDelete(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Ouvrir le modal d'assignation de rôles
  const openRolesModal = async (member) => {
    setSelectedMember(member);
    setShowRolesModal(true);
    setLoadingRoles(true);
    try {
      const roles = await api.admin.getRoles();
      setAvailableRoles(roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Vérifier si le membre a déjà un rôle
  const memberHasRole = (member, roleId) => {
    return member.member_roles_v2?.some(mr => mr.role_id === roleId);
  };

  // Assigner un rôle
  const handleAssignRole = async (roleId) => {
    if (!selectedMember) return;
    try {
      await api.admin.assignRole(roleId, selectedMember.id);
      // Mettre à jour le membre localement
      const updatedMembers = members.map(m => {
        if (m.id === selectedMember.id) {
          const role = availableRoles.find(r => r.id === roleId);
          return {
            ...m,
            member_roles_v2: [...(m.member_roles_v2 || []), { id: Date.now(), role_id: roleId, church_roles_v2: role }]
          };
        }
        return m;
      });
      setMembers(updatedMembers);
      setSelectedMember(updatedMembers.find(m => m.id === selectedMember.id));
    } catch (err) {
      console.error('Error assigning role:', err);
      setError(err.message);
    }
  };

  // Retirer un rôle
  const handleUnassignRole = async (roleId) => {
    if (!selectedMember) return;
    try {
      await api.admin.unassignRole(roleId, selectedMember.id);
      // Mettre à jour le membre localement
      const updatedMembers = members.map(m => {
        if (m.id === selectedMember.id) {
          return {
            ...m,
            member_roles_v2: (m.member_roles_v2 || []).filter(mr => mr.role_id !== roleId)
          };
        }
        return m;
      });
      setMembers(updatedMembers);
      setSelectedMember(updatedMembers.find(m => m.id === selectedMember.id));
    } catch (err) {
      console.error('Error unassigning role:', err);
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
            <h1 className="text-2xl font-bold text-white">
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
                <p className="text-2xl font-bold text-white">{statistics.totalActive || 0}</p>
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
                <p className="text-2xl font-bold text-white">{statistics.newThisMonth || 0}</p>
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
                <p className="text-2xl font-bold text-white">{statistics.totalArchived || 0}</p>
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
                <p className="text-2xl font-bold text-white">{statistics.totalRoles || 0}</p>
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
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
                        <p className="text-white font-medium">{member.full_name}</p>
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
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('view_details') || 'Voir les détails'}
                      >
                        <MdVisibility size={18} />
                      </button>
                      <button
                        onClick={() => openRolesModal(member)}
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('manage_roles') || 'Gérer les rôles'}
                      >
                        <MdBadge size={18} />
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
                          onClick={() => handleDelete(member)}
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('email')} *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('phone') || 'Téléphone'}</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('date_of_birth') || 'Date de naissance'}</label>
                <input
                  type="date"
                  value={newMember.date_of_birth}
                  onChange={(e) => setNewMember({ ...newMember, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Modal d'assignation de rôles */}
      {showRolesModal && selectedMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdBadge />
                {t('manage_roles') || 'Gérer les rôles'}
              </h2>
              <button
                onClick={() => {
                  setShowRolesModal(false);
                  setSelectedMember(null);
                }}
                className="text-white/80 hover:text-white p-1"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Info du membre */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                {selectedMember.profile_photo_url ? (
                  <img
                    src={selectedMember.profile_photo_url}
                    alt={selectedMember.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                    <MdPerson className="text-gray-400 text-xl" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{selectedMember.full_name}</p>
                  <p className="text-gray-400 text-sm">{selectedMember.email}</p>
                </div>
              </div>

              {/* Liste des rôles */}
              {loadingRoles ? (
                <div className="text-center py-4 text-gray-400">
                  {t('loading')}...
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <MdBadge className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>{t('no_roles_available') || 'Aucun rôle disponible'}</p>
                  <p className="text-sm mt-1">{t('create_roles_first') || 'Créez des rôles dans la section Rôles'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm mb-3">
                    {t('click_to_toggle_role') || 'Cliquez pour assigner ou retirer un rôle'}
                  </p>
                  {availableRoles.map((role) => {
                    const hasRole = memberHasRole(selectedMember, role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => hasRole ? handleUnassignRole(role.id) : handleAssignRole(role.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          hasRole
                            ? 'bg-gray-700 border-green-500/50'
                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: role.color || '#6366f1' }}
                          />
                          <span className="text-white">
                            {lang === 'fr' ? role.name_fr : role.name_en}
                          </span>
                        </div>
                        {hasRole && (
                          <MdCheck className="text-green-400" size={20} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bouton fermer */}
              <button
                onClick={() => {
                  setShowRolesModal(false);
                  setSelectedMember(null);
                }}
                className="w-full mt-6 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('close') || 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t('delete_member')}
        message={t('confirm_delete_member_message', {
          name: memberToDelete?.full_name || ''
        })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        loading={deleting}
      />
    </div>
  );
}

export default AdminMembersListPage;
