import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdChurch, MdEvent, MdPeople, MdCheckCircle,
  MdArrowForward, MdTrendingUp, MdBadge, MdAnnouncement
} from 'react-icons/md';

const SuperAdminDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platformStats, setPlatformStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [platform, members] = await Promise.all([
          api.superAdmin.getPlatformStatistics(),
          api.superAdmin.getMembersStatistics()
        ]);
        setPlatformStats(platform);
        setMemberStats(members);
      } catch (err) {
        setError(t('error_loading_data') || 'Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/30 border border-red-700 text-red-400 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('super_admin_overview') || 'Vue d\'ensemble'}</h1>
        <p className="text-gray-400 mt-2">{t('super_admin_overview_subtitle') || 'Bienvenue sur le panneau d\'administration MY EDEN X'}</p>
      </div>

      {/* Statistiques principales - 4 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Églises */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">{t('churches') || 'Églises'}</p>
              <p className="text-4xl font-bold text-white mt-2">{platformStats?.total_churches || 0}</p>
            </div>
            <div className="bg-indigo-500/30 p-3 rounded-lg">
              <MdChurch className="text-3xl text-white" />
            </div>
          </div>
          <Link to="/super-admin/churches" className="mt-4 text-indigo-200 text-sm flex items-center hover:text-white transition-colors">
            {t('view_all') || 'Voir tout'} <MdArrowForward className="ml-1" />
          </Link>
        </div>

        {/* Événements */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">{t('events') || 'Événements'}</p>
              <p className="text-4xl font-bold text-white mt-2">{platformStats?.total_events || 0}</p>
            </div>
            <div className="bg-purple-500/30 p-3 rounded-lg">
              <MdEvent className="text-3xl text-white" />
            </div>
          </div>
          <Link to="/super-admin/events" className="mt-4 text-purple-200 text-sm flex items-center hover:text-white transition-colors">
            {t('view_all') || 'Voir tout'} <MdArrowForward className="ml-1" />
          </Link>
        </div>

        {/* Membres */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-sm font-medium">{t('members') || 'Membres'}</p>
              <p className="text-4xl font-bold text-white mt-2">{memberStats?.total_members || 0}</p>
            </div>
            <div className="bg-emerald-500/30 p-3 rounded-lg">
              <MdPeople className="text-3xl text-white" />
            </div>
          </div>
          <Link to="/super-admin/members" className="mt-4 text-emerald-200 text-sm flex items-center hover:text-white transition-colors">
            {t('view_all') || 'Voir tout'} <MdArrowForward className="ml-1" />
          </Link>
        </div>

        {/* Participants / Check-ins */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-sm font-medium">{t('total_checkins') || 'Check-ins'}</p>
              <p className="text-4xl font-bold text-white mt-2">{platformStats?.total_checkins || 0}</p>
            </div>
            <div className="bg-amber-500/30 p-3 rounded-lg">
              <MdCheckCircle className="text-3xl text-white" />
            </div>
          </div>
          <p className="mt-4 text-amber-200 text-sm">
            {platformStats?.total_attendees || 0} {t('registered_attendees') || 'inscrits'}
          </p>
        </div>
      </div>

      {/* Modules - Accès rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Module Événements */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-purple-900/20">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdEvent className="text-purple-400" />
              {t('events_module') || 'Module Événements'}
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{platformStats?.total_events || 0}</p>
                <p className="text-sm text-gray-400">{t('total_events') || 'Événements'}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{platformStats?.total_attendees || 0}</p>
                <p className="text-sm text-gray-400">{t('total_attendees') || 'Participants'}</p>
              </div>
            </div>
            <Link
              to="/super-admin/events"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {t('manage_events') || 'Gérer les événements'}
              <MdArrowForward />
            </Link>
          </div>
        </div>

        {/* Module Membres */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-emerald-900/20">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdPeople className="text-emerald-400" />
              {t('members_module') || 'Module Membres'}
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{memberStats?.total_members || 0}</p>
                <p className="text-sm text-gray-400">{t('total_members') || 'Membres'}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{memberStats?.active_members || 0}</p>
                <p className="text-sm text-gray-400">{t('active_members') || 'Actifs'}</p>
              </div>
            </div>
            <Link
              to="/super-admin/members"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {t('manage_members') || 'Gérer les membres'}
              <MdArrowForward />
            </Link>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Églises par Événements */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdEvent className="text-purple-400" />
              {t('top_churches_events') || 'Top Églises (Événements)'}
            </h3>
            <Link to="/super-admin/events" className="text-sm text-indigo-400 hover:text-indigo-300">
              {t('view_all') || 'Voir tout'}
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {platformStats?.top_churches && platformStats.top_churches.length > 0 ? (
              platformStats.top_churches.slice(0, 5).map((church, index) => (
                <Link
                  key={church.id}
                  to={`/super-admin/events/${church.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-200">{church.name}</span>
                  </div>
                  <span className="text-purple-400 font-medium">{church.event_count} {t('events') || 'événements'}</span>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                {t('no_data') || 'Aucune donnée'}
              </div>
            )}
          </div>
        </div>

        {/* Top Églises par Membres */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MdPeople className="text-emerald-400" />
              {t('top_churches_members') || 'Top Églises (Membres)'}
            </h3>
            <Link to="/super-admin/members" className="text-sm text-indigo-400 hover:text-indigo-300">
              {t('view_all') || 'Voir tout'}
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {memberStats?.top_churches && memberStats.top_churches.length > 0 ? (
              memberStats.top_churches.slice(0, 5).map((church, index) => (
                <Link
                  key={church.id}
                  to={`/super-admin/churches/${church.id}/members`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-200">{church.name}</span>
                  </div>
                  <span className="text-emerald-400 font-medium">{church.member_count} {t('members') || 'membres'}</span>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                {t('no_data') || 'Aucune donnée'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques supplémentaires */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <MdTrendingUp className="text-2xl text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{memberStats?.active_members || 0}</p>
          <p className="text-sm text-gray-400">{t('active_members') || 'Membres Actifs'}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <MdBadge className="text-2xl text-pink-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{memberStats?.total_roles || 0}</p>
          <p className="text-sm text-gray-400">{t('total_roles') || 'Rôles Créés'}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <MdAnnouncement className="text-2xl text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{memberStats?.total_announcements || 0}</p>
          <p className="text-sm text-gray-400">{t('announcements') || 'Annonces'}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <MdCheckCircle className="text-2xl text-sky-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{platformStats?.total_checkins || 0}</p>
          <p className="text-sm text-gray-400">{t('total_checkins') || 'Check-ins'}</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
