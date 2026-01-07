import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utiliser notre objet api
import { useNavigate } from 'react-router-dom'; // Pour la redirection

function AdminChurchUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [churchUsers, setChurchUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [roleToInvite, setRoleToInvite] = useState('member'); // Default role
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [churchId, setChurchId] = useState(null);

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
    const storedToken = localStorage.getItem('supabase.auth.token');
    let parsedUser = null;
    if (storedToken) {
        try {
            parsedUser = JSON.parse(storedToken).user;
        } catch (e) {
            console.error("Error parsing user token:", e);
        }
    }
    
    const currentChurchId = parsedUser?.user_metadata?.church_id;
    if (!currentChurchId) {
        setError(t('error_church_id_missing'));
        setLoading(false);
        navigate('/admin/login');
        return;
    }
    setChurchId(currentChurchId);
    fetchChurchUsers(currentChurchId);
  }, [t, navigate]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    if (!churchId) {
        setInviteError(t('error_church_id_missing'));
        return;
    }

    try {
      await api.admin.inviteChurchUser(churchId, { email: emailToInvite, role: roleToInvite });
      setInviteSuccess(t('user_invited_successfully'));
      setEmailToInvite('');
      setRoleToInvite('member');
      fetchChurchUsers(churchId); // Refresh the list
    } catch (err) {
      console.error('Error inviting user:', err);
      setInviteError(err.response?.data?.error || err.message || t('error_inviting_user'));
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!churchId) {
        alert(t('error_church_id_missing'));
        return;
    }
    try {
      await api.admin.updateChurchUserRole(churchId, userId, newRole);
      fetchChurchUsers(churchId); // Refresh the list
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
      fetchChurchUsers(churchId); // Refresh the list
    } catch (err) {
      console.error('Error removing user:', err);
      alert(err.response?.data?.error || err.message || t('error_removing_user'));
    }
  };

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="admin-church-users-page">
      <h2>{t('team_members')}</h2>

      <div className="card mb-4">
        <div className="card-header">{t('invite_new_member')}</div>
        <div className="card-body">
          <form onSubmit={handleInviteSubmit}>
            <div className="form-group">
              <label htmlFor="emailToInvite">{t('email')}</label>
              <input
                type="email"
                className="form-control"
                id="emailToInvite"
                value={emailToInvite}
                onChange={(e) => setEmailToInvite(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="roleToInvite">{t('role')}</label>
              <select
                className="form-control"
                id="roleToInvite"
                value={roleToInvite}
                onChange={(e) => setRoleToInvite(e.target.value)}
              >
                <option value="member">{t('member')}</option>
                <option value="church_admin">{t('admin')}</option> {/* Use 'church_admin' role */}
              </select>
            </div>
            {inviteError && <div className="alert alert-danger">{inviteError}</div>}
            {inviteSuccess && <div className="alert alert-success">{inviteSuccess}</div>}
            <button type="submit" className="btn btn-primary mt-2">{t('invite')}</button>
          </form>
        </div>
      </div>

      <h3>{t('current_members')}</h3>
      {churchUsers.length === 0 ? (
        <p>{t('no_members_yet')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('email')}</th>
              <th>{t('role')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {churchUsers.map((user) => (
              <tr key={user.user_id}>
                <td>{user.auth_users?.email || 'N/A'}</td> {/* 'auth_users' is the alias from backend join */}
                <td>
                  <select
                    className="form-control"
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                    disabled={user.role === 'church_admin' && churchUsers.filter(u => u.role === 'church_admin').length === 1} // Prevent removing last admin role
                  >
                    <option value="member">{t('member')}</option>
                    <option value="church_admin">{t('admin')}</option>
                  </select>
                </td>
                <td>
                  <button 
                    onClick={() => handleRemoveUser(user.user_id)} 
                    className="btn btn-danger btn-sm"
                    disabled={user.role === 'church_admin' && churchUsers.filter(u => u.role === 'church_admin').length === 1} // Prevent removing last admin
                  >
                    {t('remove')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminChurchUsersPage;
