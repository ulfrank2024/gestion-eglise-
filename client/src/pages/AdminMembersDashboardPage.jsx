import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import {
  MdPeople, MdPersonAdd, MdBadge, MdAnnouncement,
  MdTrendingUp, MdArrowForward
} from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';

function AdminMembersDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalRoles: 0,
    totalAnnouncements: 0
  });
  const [recentMembers, setRecentMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError('');

        const userInfo = await api.auth.me();
        if (!userInfo.church_id) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }

        // Récupérer les statistiques des membres
        const memberStats = await api.admin.getMemberStatistics();
        setStats({
          totalMembers: memberStats.total_members || 0,
          activeMembers: memberStats.active_members || 0,
          totalRoles: memberStats.total_roles || 0,
          totalAnnouncements: memberStats.total_announcements || 0
        });

        // Récupérer les membres récents
        const members = await api.admin.getMembers({ limit: 5 });
        setRecentMembers(members.slice(0, 5));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(getErrorMessage(err, t));
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [t, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError('')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Members */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">{t('total_members') || 'Total Membres'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalMembers}</p>
            </div>
            <div className="bg-indigo-500/30 p-3 rounded-lg">
              <MdPeople className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">{t('active_members') || 'Membres Actifs'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.activeMembers}</p>
            </div>
            <div className="bg-green-500/30 p-3 rounded-lg">
              <MdTrendingUp className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Total Roles */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">{t('total_roles') || 'Rôles Créés'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalRoles}</p>
            </div>
            <div className="bg-purple-500/30 p-3 rounded-lg">
              <MdBadge className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-sm font-medium">{t('announcements') || 'Annonces'}</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalAnnouncements}</p>
            </div>
            <div className="bg-amber-500/30 p-3 rounded-lg">
              <MdAnnouncement className="text-3xl text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/member-invitations"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-indigo-500 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MdPersonAdd className="text-xl text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{t('invite_member') || 'Inviter un membre'}</p>
              <p className="text-sm text-gray-400">{t('send_invitation') || 'Envoyer une invitation'}</p>
            </div>
            <MdArrowForward className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
          </div>
        </Link>

        <Link
          to="/admin/roles"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-purple-500 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <MdBadge className="text-xl text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{t('manage_roles') || 'Gérer les rôles'}</p>
              <p className="text-sm text-gray-400">{t('create_assign_roles') || 'Créer et assigner'}</p>
            </div>
            <MdArrowForward className="text-gray-600 group-hover:text-purple-400 transition-colors" />
          </div>
        </Link>

        <Link
          to="/admin/announcements"
          className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-amber-500 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <MdAnnouncement className="text-xl text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{t('new_announcement') || 'Nouvelle annonce'}</p>
              <p className="text-sm text-gray-400">{t('publish_announcement') || 'Publier une annonce'}</p>
            </div>
            <MdArrowForward className="text-gray-600 group-hover:text-amber-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Recent Members */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">{t('recent_members') || 'Membres Récents'}</h3>
          <Link
            to="/admin/members"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {t('view_all') || 'Voir tous'}
            <MdArrowForward />
          </Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="p-6 text-center">
            <MdPeople className="text-5xl text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t('no_members_yet') || 'Aucun membre pour le moment'}</p>
            <Link
              to="/admin/member-invitations"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t('invite_first_member') || 'Inviter votre premier membre'}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {recentMembers.map((member) => (
              <div key={member.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={member.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                        {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-gray-100 font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.is_active
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {member.is_active ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(member.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminMembersDashboardPage;
