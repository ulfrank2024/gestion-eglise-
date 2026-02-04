import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import {
  MdGroup, MdPersonAdd, MdEmail, MdPerson, MdDelete,
  MdCheck, MdClose, MdAdminPanelSettings, MdEdit,
  MdEvent, MdPeople, MdStar, MdSave, MdGroups
} from 'react-icons/md';

function AdminChurchUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [churchUsers, setChurchUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire d'invitation
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    permissions: ['all']
  });
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  // État pour l'édition des permissions
  const [editingUser, setEditingUser] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);

  // États pour la modal de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchChurchUsers = async (currentChurchId) => {
    try {
      setLoading(true);
      setError(null);

      if (!currentChurchId) {
        throw new Error(t('error_church_id_missing'));
      }

      const data = await api.admin.listChurchUsers(currentChurchId);
      setChurchUsers(data);
    } catch (err) {
      console.error('Error fetching church users:', err);
      setError(err.response?.data?.error || err.message || t('error_fetching_church_users'));
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }

        // Vérifier si l'utilisateur est l'admin principal
        if (!userInfo.is_main_admin) {
          setError(t('only_main_admin_can_manage_team') || 'Seul l\'administrateur principal peut gérer l\'équipe.');
          setLoading(false);
          return;
        }

        setChurchId(currentChurchId);
        fetchChurchUsers(currentChurchId);
      } catch (err) {
        console.error('Error fetching user info:', err);
        setError(t('error_church_id_missing'));
        setLoading(false);
      }
    };

    initPage();
  }, [t, navigate]);

  const handlePermissionToggle = (permission) => {
    setInviteForm(prev => {
      let newPermissions = [...prev.permissions];

      if (permission === 'all') {
        // Si on coche "all", on retire les autres
        newPermissions = ['all'];
      } else {
        // Si on coche un module spécifique, on retire "all"
        newPermissions = newPermissions.filter(p => p !== 'all');

        if (newPermissions.includes(permission)) {
          newPermissions = newPermissions.filter(p => p !== permission);
        } else {
          newPermissions.push(permission);
        }

        // Si aucune permission, on remet "all" par défaut
        if (newPermissions.length === 0) {
          newPermissions = ['all'];
        }
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setSubmitting(true);

    if (!churchId) {
      setInviteError(t('error_church_id_missing'));
      setSubmitting(false);
      return;
    }

    try {
      const result = await api.admin.inviteChurchUser(churchId, {
        email: inviteForm.email,
        full_name: inviteForm.full_name,
        role: 'church_admin',
        permissions: inviteForm.permissions
      });

      const message = result.isNewUser
        ? (t('user_created_and_invited') || 'Utilisateur créé et invitation envoyée par email')
        : (t('user_invited_successfully') || 'Utilisateur ajouté à l\'équipe');

      setInviteSuccess(message);
      setInviteForm({ email: '', full_name: '', permissions: ['all'] });
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error inviting user:', err);
      setInviteError(err.response?.data?.error || err.message || t('error_inviting_user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPermissions = (user) => {
    setEditingUser(user.user_id);
    setEditPermissions(user.permissions || ['all']);
  };

  const handleEditPermissionToggle = (permission) => {
    let newPermissions = [...editPermissions];

    if (permission === 'all') {
      newPermissions = ['all'];
    } else {
      newPermissions = newPermissions.filter(p => p !== 'all');

      if (newPermissions.includes(permission)) {
        newPermissions = newPermissions.filter(p => p !== permission);
      } else {
        newPermissions.push(permission);
      }

      if (newPermissions.length === 0) {
        newPermissions = ['all'];
      }
    }

    setEditPermissions(newPermissions);
  };

  const handleSavePermissions = async (userId) => {
    try {
      await api.admin.updateChurchUser(churchId, userId, { permissions: editPermissions });
      setEditingUser(null);
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error updating permissions:', err);
      alert(err.response?.data?.error || err.message || t('error_updating_permissions'));
    }
  };

  const handleRemoveUser = (user) => {
    if (!churchId) {
      setError(t('error_church_id_missing'));
      return;
    }
    setUserToRemove(user);
    setShowDeleteModal(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;
    setRemoving(true);
    try {
      await api.admin.removeChurchUser(churchId, userToRemove.user_id);
      setShowDeleteModal(false);
      setUserToRemove(null);
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error removing user:', err);
      setError(err.response?.data?.error || err.message || t('error_removing_user'));
    } finally {
      setRemoving(false);
    }
  };

  const getPermissionsLabel = (permissions) => {
    if (!permissions || permissions.includes('all')) {
      return t('full_access') || 'Accès complet';
    }
    const labels = {
      events: t('events_module') || 'Événements',
      members: t('members_module') || 'Membres',
      meetings: t('meetings_module') || 'Réunions'
    };
    return permissions.map(p => labels[p] || p).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <MdClose />
          {error}
        </div>
      </div>
    );
  }

  const mainAdminCount = churchUsers.filter(u => u.is_main_admin).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdGroup className="text-3xl text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">{t('team_members')}</h1>
          <p className="text-gray-400 text-sm">
            {t('team_members_subtitle') || 'Gérez les administrateurs et leurs permissions'}
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MdPersonAdd />
            {t('invite_new_admin') || 'Inviter un nouvel administrateur'}
          </h2>
        </div>

        <form onSubmit={handleInviteSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdEmail className="text-gray-400" />
                {t('email')} *
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="admin@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdPerson className="text-gray-400" />
                {t('full_name')}
              </label>
              <input
                type="text"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Jean Dupont"
              />
            </div>
          </div>

          {/* Permissions Selection */}
          <div>
            <label className="block text-gray-300 text-sm mb-2">
              {t('permissions') || 'Permissions'} *
            </label>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                inviteForm.permissions.includes('all')
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={inviteForm.permissions.includes('all')}
                  onChange={() => handlePermissionToggle('all')}
                  className="hidden"
                />
                <MdStar />
                {t('full_access') || 'Accès complet'}
              </label>

              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                inviteForm.permissions.includes('events') && !inviteForm.permissions.includes('all')
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={inviteForm.permissions.includes('events') && !inviteForm.permissions.includes('all')}
                  onChange={() => handlePermissionToggle('events')}
                  className="hidden"
                />
                <MdEvent />
                {t('events_module') || 'Événements'}
              </label>

              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                inviteForm.permissions.includes('members') && !inviteForm.permissions.includes('all')
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={inviteForm.permissions.includes('members') && !inviteForm.permissions.includes('all')}
                  onChange={() => handlePermissionToggle('members')}
                  className="hidden"
                />
                <MdPeople />
                {t('members_module') || 'Membres'}
              </label>

              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                inviteForm.permissions.includes('meetings') && !inviteForm.permissions.includes('all')
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={inviteForm.permissions.includes('meetings') && !inviteForm.permissions.includes('all')}
                  onChange={() => handlePermissionToggle('meetings')}
                  className="hidden"
                />
                <MdGroups />
                {t('meetings_module') || 'Réunions'}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('permissions_hint') || 'Sélectionnez les modules auxquels cet administrateur aura accès'}
            </p>
          </div>

          {inviteError && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <MdClose size={16} />
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <MdCheck size={16} />
              {inviteSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            <MdPersonAdd />
            {submitting ? t('sending') : (t('invite') || 'Inviter')}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{t('current_team') || 'Équipe actuelle'}</h3>
          <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-sm rounded-full">
            {churchUsers.length} {t('admin').toLowerCase()}(s)
          </span>
        </div>

        {churchUsers.length === 0 ? (
          <div className="p-12 text-center">
            <MdGroup className="mx-auto text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">{t('no_team_members') || 'Aucun membre dans l\'équipe'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-300">{t('admin')}</th>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-300">{t('permissions') || 'Permissions'}</th>
                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-300">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {churchUsers.map((user) => {
                  const isMainAdmin = user.is_main_admin;
                  const isEditing = editingUser === user.user_id;

                  return (
                    <tr key={user.user_id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isMainAdmin ? 'bg-yellow-600/20' : 'bg-indigo-600/20'
                          }`}>
                            {isMainAdmin ? (
                              <MdStar className="text-yellow-400" />
                            ) : (
                              <MdAdminPanelSettings className="text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {user.full_name || user.auth_users?.email?.split('@')[0] || 'N/A'}
                              {isMainAdmin && (
                                <span className="ml-2 px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded-full">
                                  {t('main_admin') || 'Admin Principal'}
                                </span>
                              )}
                            </p>
                            <p className="text-gray-400 text-sm">{user.auth_users?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <label className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer text-sm ${
                              editPermissions.includes('all')
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              <input
                                type="checkbox"
                                checked={editPermissions.includes('all')}
                                onChange={() => handleEditPermissionToggle('all')}
                                className="hidden"
                              />
                              <MdStar size={14} />
                              {t('all') || 'Tout'}
                            </label>
                            <label className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer text-sm ${
                              editPermissions.includes('events') && !editPermissions.includes('all')
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              <input
                                type="checkbox"
                                checked={editPermissions.includes('events') && !editPermissions.includes('all')}
                                onChange={() => handleEditPermissionToggle('events')}
                                className="hidden"
                              />
                              <MdEvent size={14} />
                            </label>
                            <label className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer text-sm ${
                              editPermissions.includes('members') && !editPermissions.includes('all')
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              <input
                                type="checkbox"
                                checked={editPermissions.includes('members') && !editPermissions.includes('all')}
                                onChange={() => handleEditPermissionToggle('members')}
                                className="hidden"
                              />
                              <MdPeople size={14} />
                            </label>
                            <label className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer text-sm ${
                              editPermissions.includes('meetings') && !editPermissions.includes('all')
                                ? 'bg-amber-600 text-white'
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              <input
                                type="checkbox"
                                checked={editPermissions.includes('meetings') && !editPermissions.includes('all')}
                                onChange={() => handleEditPermissionToggle('meetings')}
                                className="hidden"
                              />
                              <MdGroups size={14} />
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(user.permissions || ['all']).map(perm => (
                              <span
                                key={perm}
                                className={`px-2 py-1 rounded text-xs ${
                                  perm === 'all' ? 'bg-indigo-600/20 text-indigo-400' :
                                  perm === 'events' ? 'bg-green-600/20 text-green-400' :
                                  perm === 'members' ? 'bg-purple-600/20 text-purple-400' :
                                  perm === 'meetings' ? 'bg-amber-600/20 text-amber-400' :
                                  'bg-gray-600/20 text-gray-400'
                                }`}
                              >
                                {perm === 'all' ? (t('full_access') || 'Complet') :
                                 perm === 'events' ? (t('events_module') || 'Événements') :
                                 perm === 'members' ? (t('members_module') || 'Membres') :
                                 perm === 'meetings' ? (t('meetings_module') || 'Réunions') :
                                 perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isMainAdmin ? (
                          <span className="text-gray-500 text-sm">{t('protected') || 'Protégé'}</span>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSavePermissions(user.user_id)}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded-lg transition-colors"
                              title={t('save') || 'Enregistrer'}
                            >
                              <MdSave size={20} />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                              title={t('cancel') || 'Annuler'}
                            >
                              <MdClose size={20} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditPermissions(user)}
                              className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title={t('edit_permissions') || 'Modifier les permissions'}
                            >
                              <MdEdit size={20} />
                            </button>
                            <button
                              onClick={() => handleRemoveUser(user)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                              title={t('remove') || 'Retirer'}
                            >
                              <MdDelete size={20} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="p-4 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
        <p className="text-sm text-indigo-300">
          <strong>Note:</strong> {t('team_permissions_note') || 'Les administrateurs invités recevront un email avec leurs identifiants de connexion. Ils ne pourront accéder qu\'aux modules pour lesquels ils ont les permissions.'}
        </p>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToRemove(null);
        }}
        onConfirm={confirmRemoveUser}
        title={t('remove_team_member')}
        message={t('confirm_remove_user_message', {
          name: userToRemove?.full_name || userToRemove?.email || ''
        })}
        confirmText={t('remove')}
        cancelText={t('cancel')}
        type="danger"
        loading={removing}
      />
    </div>
  );
}

export default AdminChurchUsersPage;
