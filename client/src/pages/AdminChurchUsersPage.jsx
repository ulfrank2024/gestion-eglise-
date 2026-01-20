import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import {
  MdGroup, MdPersonAdd, MdEmail, MdBadge, MdDelete,
  MdCheck, MdClose, MdAdminPanelSettings
} from 'react-icons/md';

function AdminChurchUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [churchUsers, setChurchUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [roleToInvite, setRoleToInvite] = useState('church_admin');
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      await api.admin.inviteChurchUser(churchId, { email: emailToInvite, role: roleToInvite });
      setInviteSuccess(t('user_invited_successfully'));
      setEmailToInvite('');
      setRoleToInvite('church_admin');
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error inviting user:', err);
      setInviteError(err.response?.data?.error || err.message || t('error_inviting_user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!churchId) {
      alert(t('error_church_id_missing'));
      return;
    }
    try {
      await api.admin.updateChurchUserRole(churchId, userId, newRole);
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error changing user role:', err);
      alert(err.response?.data?.error || err.message || t('error_changing_user_role'));
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!churchId) {
      alert(t('error_church_id_missing'));
      return;
    }
    if (!window.confirm(t('confirm_remove_user_from_church'))) return;
    try {
      await api.admin.removeChurchUser(churchId, userId);
      fetchChurchUsers(churchId);
    } catch (err) {
      console.error('Error removing user:', err);
      alert(err.response?.data?.error || err.message || t('error_removing_user'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  const adminCount = churchUsers.filter(u => u.role === 'church_admin').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdGroup className="text-3xl text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">{t('team_members')}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <MdClose />
          {error}
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MdPersonAdd />
            {t('invite_new_member')}
          </h2>
        </div>

        <form onSubmit={handleInviteSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdEmail className="text-gray-400" />
                {t('email')}
              </label>
              <input
                type="email"
                value={emailToInvite}
                onChange={(e) => setEmailToInvite(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="admin@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1 flex items-center gap-2">
                <MdBadge className="text-gray-400" />
                {t('role')}
              </label>
              <select
                value={roleToInvite}
                onChange={(e) => setRoleToInvite(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="church_admin">{t('admin')}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t('invite_admin_hint') || 'Invitez un administrateur pour gérer l\'église avec vous'}
              </p>
            </div>
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
            {submitting ? t('sending') : t('invite')}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{t('current_members')}</h3>
          <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-sm rounded-full">
            {churchUsers.length} {t('member').toLowerCase()}(s)
          </span>
        </div>

        {churchUsers.length === 0 ? (
          <div className="p-12 text-center">
            <MdGroup className="mx-auto text-6xl text-gray-600 mb-4" />
            <p className="text-gray-400">{t('no_members_yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-300">{t('email')}</th>
                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-300">{t('role')}</th>
                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-300">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {churchUsers.map((user) => {
                  const isLastAdmin = user.role === 'church_admin' && adminCount === 1;

                  return (
                    <tr key={user.user_id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center">
                            <MdAdminPanelSettings className="text-indigo-400" />
                          </div>
                          <span className="text-gray-100">{user.auth_users?.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                          disabled={isLastAdmin}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="church_admin">{t('admin')}</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleRemoveUser(user.user_id)}
                          disabled={isLastAdmin}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isLastAdmin ? (t('cannot_remove_last_admin') || 'Impossible de supprimer le dernier admin') : t('remove')}
                        >
                          <MdDelete size={20} />
                        </button>
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
          <strong>Note:</strong> {t('team_members_note') || 'Cette section permet de gérer les administrateurs qui peuvent accéder au tableau de bord de gestion. Pour gérer les membres/chrétiens de votre église, utilisez le module "Membres".'}
        </p>
      </div>
    </div>
  );
}

export default AdminChurchUsersPage;
