import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AttendeesModal from '../components/AttendeesModal';
import { api } from '../api/api';
import { MdEvent, MdAdd, MdPeople, MdVisibility, MdFilterList } from 'react-icons/md';

function AdminEventsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');

        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        const params = {};
        if (filterStatus === 'active') {
          params.is_archived = false;
        } else if (filterStatus === 'archived') {
          params.is_archived = true;
        }

        const data = await api.admin.listEvents(params.is_archived);
        setEvents(data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_events'));
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filterStatus, t, navigate]);

  const handleManageEvent = (id) => {
    navigate(`/admin/events/${id}`);
  };

  const handleCreateNewEvent = () => {
    navigate('/admin/events/new');
  };

  const handleViewAttendees = (eventId) => {
    setSelectedEventId(eventId);
    setShowAttendeesModal(true);
  };

  const handleCloseAttendeesModal = () => {
    setShowAttendeesModal(false);
    setSelectedEventId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 m-4">
        <p className="text-red-400">{t('error')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <p className="text-gray-400">{events.length} {t('events_total')}</p>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter */}
          <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 px-4 py-2">
            <MdFilterList className="text-gray-400 mr-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-gray-300 border-none outline-none cursor-pointer"
            >
              <option value="active" className="bg-gray-800">{t('eventStatus.active')}</option>
              <option value="archived" className="bg-gray-800">{t('eventStatus.archived')}</option>
              <option value="all" className="bg-gray-800">{t('eventStatus.all')}</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateNewEvent}
            className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <MdAdd className="text-xl mr-2" />
            {t('create_new_event')}
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdEvent className="text-6xl text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">{t('no_events_yet')}</h3>
          <p className="text-gray-500 mb-6">{t('create_first_event_hint') || 'Commencez par créer votre premier événement'}</p>
          <button
            onClick={handleCreateNewEvent}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <MdAdd className="inline mr-2" />
            {t('create_new_event')}
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {t('event_name_fr')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    {t('event_name_en')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {t('participants')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mr-3 ${event.is_archived ? 'bg-gray-500' : 'bg-green-500'}`}></div>
                        <div>
                          <p className="text-gray-100 font-medium">{event.name_fr}</p>
                          <p className="text-gray-500 text-sm md:hidden">{event.name_en}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 hidden md:table-cell">
                      {event.name_en}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-700 text-gray-300">
                        <MdPeople className="mr-1" />
                        {event.attendeeCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.is_archived
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-green-900/50 text-green-400'
                      }`}>
                        {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleManageEvent(event.id)}
                          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title={t('manage_event')}
                        >
                          <MdVisibility className="text-xl" />
                        </button>
                        <button
                          onClick={() => handleViewAttendees(event.id)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('view_attendees')}
                        >
                          <MdPeople className="text-xl" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAttendeesModal && (
        <AttendeesModal
          eventId={selectedEventId}
          onClose={handleCloseAttendeesModal}
        />
      )}
    </div>
  );
}

export default AdminEventsListPage;
