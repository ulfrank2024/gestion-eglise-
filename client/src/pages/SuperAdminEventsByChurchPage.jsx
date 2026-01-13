import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';

const SuperAdminEventsByChurchPage = () => {
  const { t } = useTranslation();
  const { churchId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChurchAndEvents = async () => {
      try {
        // Fetch church details
        const churchData = await api.superAdmin.getChurch(churchId); // Assuming a getChurch API
        setChurchName(churchData.name);

        // Fetch events for the church
        const eventsData = await api.superAdmin.listEventsByChurch(churchId); // Assuming a listEventsByChurch API
        setEvents(eventsData);
      } catch (err) {
        setError(t('error_fetching_events_for_church')); // New translation key
        console.error('Error fetching events for church:', err);
      } finally {
        setLoading(false);
      }
    };

    if (churchId) {
      fetchChurchAndEvents();
    }
  }, [churchId, t]);

  if (loading) {
    return <div className="text-center p-4 text-gray-300">{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">
        {t('events_for_church', { churchName: churchName })}
      </h1>
      <button
        onClick={() => navigate('/super-admin/events')}
        className="mb-6 bg-gray-700 text-gray-100 px-4 py-2 rounded-md hover:bg-gray-600 border border-gray-600"
      >
        {t('back_to_churches_list')}
      </button>

      {events.length === 0 ? (
        <p className="text-gray-400">{t('no_events_for_church')}</p>
      ) : (
        <div className="bg-gray-800 shadow-md rounded my-6 border border-gray-700">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t('event_title')}
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t('registered_attendees')}
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {t('checked_in_attendees')}
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-600"></th>
              </tr>
            </thead>
            <tbody className="bg-gray-800">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                    {event.name_fr || event.name_en}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                    {event.is_completed ? t('completed') : t('active')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                    {event.registered_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                    {event.checked_in_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right border-b border-gray-700 text-sm font-medium">
                    <button
                      onClick={() => navigate(`/super-admin/events/${churchId}/details/${event.id}`)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      {t('view_details')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SuperAdminEventsByChurchPage;
