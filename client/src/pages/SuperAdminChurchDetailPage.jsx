import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import {
  MdChurch,
  MdArrowBack,
  MdEdit,
  MdDelete,
  MdEvent,
  MdPeople,
  MdCheckCircle,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdLink,
  MdCalendarToday,
  MdPerson
} from 'react-icons/md';
import EditChurchModal from '../components/EditChurchModal';
import DeleteChurchModal from '../components/DeleteChurchModal';

const SuperAdminChurchDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { churchId } = useParams();
  const navigate = useNavigate();

  const [church, setChurch] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchChurchDetails = async () => {
      try {
        setLoading(true);

        // Récupérer les détails de l'église
        const churchData = await api.superAdmin.getChurch(churchId);
        setChurch(churchData);

        // Récupérer les statistiques de l'église
        const statsData = await api.superAdmin.getChurchStatistics(churchId);
        setStats(statsData);

        // Récupérer les événements de l'église
        const eventsData = await api.superAdmin.listEventsByChurch(churchId);
        setEvents(eventsData.slice(0, 5)); // 5 derniers événements

        // Récupérer les utilisateurs de l'église
        const usersData = await api.superAdmin.getChurchUsers(churchId);
        setUsers(usersData);

      } catch (err) {
        console.error('Error fetching church details:', err);
        setError(t('church_detail.error_loading'));
      } finally {
        setLoading(false);
      }
    };

    fetchChurchDetails();
  }, [churchId, t]);

  const handleChurchUpdated = (updatedChurch) => {
    setChurch(updatedChurch);
    setIsEditModalOpen(false);
  };

  const handleDeleteChurch = async () => {
    try {
      await api.superAdmin.deleteChurch(churchId);
      navigate('/super-admin/dashboard');
    } catch (err) {
      console.error('Error deleting church:', err);
      setError(t('church_detail.error_deleting'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <button
          onClick={() => navigate('/super-admin/dashboard')}
          className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <MdArrowBack className="mr-2" />
          {t('back_to_churches_list')}
        </button>
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-gray-400 text-lg">{t('church_detail.not_found')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/super-admin/dashboard')}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <MdArrowBack className="mr-2 text-xl" />
          {t('back_to_churches_list')}
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <MdEdit className="mr-2" />
            {t('edit')}
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <MdDelete className="mr-2" />
            {t('delete')}
          </button>
        </div>
      </div>

      {/* Carte principale de l'église */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mb-6">
        {/* Header avec logo et nom */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/30">
              {church.logo_url ? (
                <img src={church.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <MdChurch className="text-white text-4xl" />
              )}
            </div>
            <div className="ml-6">
              <h1 className="text-3xl font-bold text-white">{church.name}</h1>
              <p className="text-indigo-100 mt-1">{church.subdomain}</p>
            </div>
          </div>
        </div>

        {/* Informations de contact */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center text-gray-300">
            <MdLocationOn className="text-indigo-400 text-xl mr-3" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('church_detail.location')}</p>
              <p>{church.location || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center text-gray-300">
            <MdEmail className="text-indigo-400 text-xl mr-3" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('church_detail.email')}</p>
              <p>{church.email || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center text-gray-300">
            <MdPhone className="text-indigo-400 text-xl mr-3" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('church_detail.phone')}</p>
              <p>{church.phone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center text-gray-300">
            <MdCalendarToday className="text-indigo-400 text-xl mr-3" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('church_detail.created_at')}</p>
              <p>{new Date(church.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('church_detail.total_events')}</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.total_events || 0}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <MdEvent className="text-purple-400 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('church_detail.total_attendees')}</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.total_attendees || 0}</p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <MdPeople className="text-emerald-400 text-2xl" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{t('church_detail.total_checkins')}</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.total_checkins || 0}</p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <MdCheckCircle className="text-amber-400 text-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs/Admins de l'église */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MdPerson className="mr-2 text-indigo-400" />
            {t('church_detail.church_admins')}
          </h2>

          {users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center">
                    {user.profile_photo_url ? (
                      <img
                        src={user.profile_photo_url}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3">
                        <MdPerson className="text-indigo-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{user.full_name}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'church_admin'
                      ? 'bg-purple-500/20 text-purple-400'
                      : user.role === 'super_admin'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.role === 'church_admin' ? t('church_detail.admin') || 'Admin' :
                     user.role === 'super_admin' ? 'Super Admin' :
                     user.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">
              {t('church_detail.no_admins')}
            </p>
          )}
        </div>

        {/* Événements récents */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <MdEvent className="mr-2 text-purple-400" />
              {t('church_detail.recent_events')}
            </h2>
            <Link
              to={`/super-admin/events/${churchId}`}
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
            >
              {t('view_all')}
              <MdLink className="ml-1" />
            </Link>
          </div>

          {events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">
                      {i18n.language === 'fr' ? event.name_fr : event.name_en}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${event.is_archived ? 'bg-gray-600 text-gray-300' : 'bg-green-500/20 text-green-400'}`}>
                      {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {new Date(event.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-400 flex items-center">
                      <MdPeople className="mr-1" />
                      {event.registered_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">
              {t('church_detail.no_events')}
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditChurchModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onChurchUpdated={handleChurchUpdated}
        church={church}
      />

      <DeleteChurchModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteChurch}
        churchName={church?.name}
      />
    </div>
  );
};

export default SuperAdminChurchDetailPage;
