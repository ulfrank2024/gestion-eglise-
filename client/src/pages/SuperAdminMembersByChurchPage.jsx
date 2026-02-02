import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/api';
import {
  MdPeople, MdArrowBack, MdBadge, MdAnnouncement,
  MdTrendingUp, MdPersonAdd, MdSearch, MdChurch,
  MdPhone, MdLocationOn, MdEmail
} from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import { getErrorMessage } from '../utils/errorHandler';

function SuperAdminMembersByChurchPage() {
  const { t, i18n } = useTranslation();
  const { churchId } = useParams();
  const lang = i18n.language;

  const [church, setChurch] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newThisMonth: 0,
    totalRoles: 0,
    totalAnnouncements: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');

        // Recuperer les details de l'eglise
        const churchData = await api.superAdmin.getChurch(churchId);
        setChurch(churchData);

        // Recuperer les statistiques des membres
        const statsData = await api.superAdmin.getChurchMembersStatistics(churchId);
        setStats({
          totalMembers: statsData.total_members || 0,
          activeMembers: statsData.active_members || 0,
          newThisMonth: statsData.new_this_month || 0,
          totalRoles: statsData.total_roles || 0,
          totalAnnouncements: statsData.total_announcements || 0
        });

        // Recuperer la liste des membres
        const membersData = await api.superAdmin.getChurchMembers(churchId);
        const membersArray = Array.isArray(membersData?.members) ? membersData.members : [];
        setMembers(membersArray);

      } catch (err) {
        console.error('Error fetching church members:', err);
        setError(getErrorMessage(err, t));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [churchId, t]);

  // Filtrer les membres
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ||
                          (filter === 'active' && member.is_active) ||
                          (filter === 'inactive' && !member.is_active);
    return matchesSearch && matchesFilter;
  });

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
      <div className="mb-6">
        <Link
          to="/super-admin/members"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-4"
        >
          <MdArrowBack />
          {t('back') || 'Retour'}
        </Link>
        <div className="flex items-center gap-4">
          {church?.logo_url ? (
            <img
              src={church.logo_url}
              alt={church.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {church?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{church?.name}</h1>
            <p className="text-gray-400">{t('super_admin_members.church_members') || "Membres de l'eglise"}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <MdPeople className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
              <p className="text-xs text-gray-400">{t('total_members') || 'Total'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <MdTrendingUp className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.activeMembers}</p>
              <p className="text-xs text-gray-400">{t('active') || 'Actifs'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center">
              <MdPersonAdd className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.newThisMonth}</p>
              <p className="text-xs text-gray-400">{t('new_this_month') || 'Ce mois'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <MdBadge className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalRoles}</p>
              <p className="text-xs text-gray-400">{t('roles') || 'Roles'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
              <MdAnnouncement className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAnnouncements}</p>
              <p className="text-xs text-gray-400">{t('announcements') || 'Annonces'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder={t('search_members') || 'Rechercher un membre...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {t('all') || 'Tous'}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {t('active') || 'Actifs'}
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'inactive'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {t('inactive') || 'Inactifs'}
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center">
            <MdPeople className="text-5xl text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm || filter !== 'all'
                ? (t('no_members_match') || 'Aucun membre ne correspond a votre recherche')
                : (t('no_members_yet') || 'Aucun membre pour le moment')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    {t('member') || 'Membre'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    <span className="flex items-center gap-1">
                      <MdEmail className="text-indigo-400" />
                      {t('email') || 'Email'}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    <span className="flex items-center gap-1">
                      <MdPhone className="text-green-400" />
                      {t('phone') || 'Telephone'}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    <span className="flex items-center gap-1">
                      <MdLocationOn className="text-amber-400" />
                      {t('address') || 'Localisation'}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    {t('roles') || 'Roles'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    {t('status') || 'Statut'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                    {t('joined') || 'Inscrit le'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {member.profile_photo_url ? (
                          <img
                            src={member.profile_photo_url}
                            alt={member.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${member.is_admin ? 'bg-red-600' : 'bg-indigo-600'}`}>
                            {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <span className="text-white font-medium block">{member.full_name}</span>
                          {member.is_admin && (
                            <span className="text-xs text-red-400">{t('church_admin') || "Admin de l'eglise"}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{member.email}</td>
                    <td className="px-6 py-4 text-gray-300">{member.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-300 max-w-xs truncate" title={member.address || ''}>
                      {member.address || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {member.roles && member.roles.length > 0 ? (
                          member.roles.map((role, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: role.color || '#6366f1' }}
                            >
                              {lang === 'fr' ? role.name_fr : role.name_en}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {member.is_active ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(member.joined_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdminMembersByChurchPage;
