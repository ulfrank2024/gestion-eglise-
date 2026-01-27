import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import {
  MdPeople, MdPersonAdd, MdBadge, MdAnnouncement,
  MdArrowForward, MdChurch, MdTrendingUp
} from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';

function SuperAdminMembersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalRoles: 0,
    totalAnnouncements: 0
  });
  const [topChurches, setTopChurches] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const data = await api.superAdmin.getMembersStatistics();

        setStats({
          totalMembers: data.total_members || 0,
          activeMembers: data.active_members || 0,
          totalRoles: data.total_roles || 0,
          totalAnnouncements: data.total_announcements || 0
        });
        setTopChurches(data.top_churches || []);
        setRecentMembers(data.recent_members || []);
      } catch (err) {
        console.error('Error fetching members statistics:', err);
        setError(getErrorMessage(err, t));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">{t('super_admin_members.title') || 'Supervision des Membres'}</h1>
        <p className="text-gray-400">{t('super_admin_members.subtitle') || 'Vue d\'ensemble des membres de toutes les \u00e9glises'}</p>
      </div>

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
              <p className="text-purple-200 text-sm font-medium">{t('total_roles') || 'R\u00f4les Cr\u00e9\u00e9s'}</p>
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

      {/* Top Churches by Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MdChurch className="text-indigo-400" />
              {t('super_admin_members.top_churches') || '\u00c9glises avec le plus de membres'}
            </h3>
          </div>
          {topChurches.length === 0 ? (
            <div className="p-6 text-center">
              <MdChurch className="text-5xl text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">{t('super_admin_members.no_churches') || 'Aucune \u00e9glise avec des membres'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {topChurches.map((church) => (
                <Link
                  key={church.id}
                  to={`/super-admin/churches/${church.id}/members`}
                  className="px-6 py-4 hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    {church.logo_url ? (
                      <img
                        src={church.logo_url}
                        alt={church.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                        {church.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-gray-100 font-medium">{church.name}</p>
                      <p className="text-sm text-gray-400">{church.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-400">
                      {church.member_count} {t('members') || 'membres'}
                    </span>
                    <MdArrowForward className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Members */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <MdPersonAdd className="text-green-400" />
              {t('super_admin_members.recent_members') || 'Membres R\u00e9cents'}
            </h3>
          </div>
          {recentMembers.length === 0 ? (
            <div className="p-6 text-center">
              <MdPeople className="text-5xl text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">{t('super_admin_members.no_members') || 'Aucun membre inscrit'}</p>
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
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                          {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-gray-100 font-medium">{member.full_name}</p>
                        <p className="text-sm text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{member.church_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminMembersPage;
