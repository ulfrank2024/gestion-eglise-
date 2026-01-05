import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

function AdminChurchUsersPage() {
  const { t } = useTranslation();
  const [churchUsers, setChurchUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [roleToInvite, setRoleToInvite] = useState('member'); // Default role
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  const fetchChurchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/admin/church-users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setChurchUsers(response.data);
    } catch (err) {
      console.error('Error fetching church users:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch church users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChurchUsers();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        setInviteError('Authentication token not found.');
        return;
      }

      await axios.post('/api/admin/church-users', { email: emailToInvite, role: roleToInvite }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setInviteSuccess(t('user_invited_successfully'));
      setEmailToInvite('');
      setRoleToInvite('member');
      fetchChurchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error inviting user:', err);
      setInviteError(err.response?.data?.error || err.message || 'Failed to invite user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        alert('Authentication token not found.');
        return;
      }

      await axios.put(`/api/admin/church-users/${userId}`, { role: newRole }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchChurchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error changing user role:', err);
      alert(err.response?.data?.error || err.message || 'Failed to change user role');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm(t('confirm_remove_user_from_church'))) return;
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        alert('Authentication token not found.');
        return;
      }

      await axios.delete(`/api/admin/church-users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchChurchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error removing user:', err);
      alert(err.response?.data?.error || err.message || 'Failed to remove user');
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
                <option value="admin">{t('admin')}</option>
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
                <td>{user.users?.email || 'N/A'}</td> {/* Assuming 'users' is the joined table from public.auth.users */}
                <td>
                  <select
                    className="form-control"
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                    disabled={user.role === 'admin' && churchUsers.filter(u => u.role === 'admin').length === 1} // Prevent removing last admin role
                  >
                    <option value="member">{t('member')}</option>
                    <option value="admin">{t('admin')}</option>
                  </select>
                </td>
                <td>
                  <button 
                    onClick={() => handleRemoveUser(user.user_id)} 
                    className="btn btn-danger btn-sm"
                    disabled={user.role === 'admin' && churchUsers.filter(u => u.role === 'admin').length === 1} // Prevent removing last admin
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
