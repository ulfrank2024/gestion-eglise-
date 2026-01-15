import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../api/api';
import { MdEvent, MdPeople, MdTrendingUp, MdCalendarToday } from 'react-icons/md';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [latestEvents, setLatestEvents] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError('');

        // Récupérer les infos utilisateur via l'API (church_id est dans la DB, pas dans le token JWT)
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        // L'API côté serveur gère le filtrage par church_id via le token d'authentification
        const events = await api.admin.listEvents();
        setEventsData(events);

        setTotalEvents(events.length);
        const attendeesCount = events.reduce((sum, event) => sum + (event.attendeeCount || 0), 0);
        setTotalAttendees(attendeesCount);

        const sortedEvents = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLatestEvents(sortedEvents.slice(0, 5));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_dashboard_data'));
        if (err.response?.status === 401 || err.response?.status === 403) {
            navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [t, navigate]);

  const pieData = [
    { name: t('total_events'), value: totalEvents },
    { name: t('total_attendees'), value: totalAttendees },
  ];

  const barData = eventsData.slice(0, 3).map(event => ({
    name: event.name_fr,
    participants: event.attendeeCount || 0,
  })).sort((a, b) => a.name.localeCompare(b.name));

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">{t('admin_dashboard')}</h1>
        <p className="text-gray-400">{t('dashboard_subtitle') || 'Vue d\'ensemble de votre église'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Events */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">{t('total_events')}</p>
              <p className="text-4xl font-bold text-white mt-2">{totalEvents}</p>
            </div>
            <div className="bg-indigo-500/30 p-3 rounded-lg">
              <MdEvent className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Total Attendees */}
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">{t('total_attendees')}</p>
              <p className="text-4xl font-bold text-white mt-2">{totalAttendees}</p>
            </div>
            <div className="bg-green-500/30 p-3 rounded-lg">
              <MdPeople className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-sm font-medium">{t('active_events') || 'Événements actifs'}</p>
              <p className="text-4xl font-bold text-white mt-2">
                {eventsData.filter(e => !e.is_archived).length}
              </p>
            </div>
            <div className="bg-amber-500/30 p-3 rounded-lg">
              <MdTrendingUp className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">{t('upcoming_events') || 'À venir'}</p>
              <p className="text-4xl font-bold text-white mt-2">
                {eventsData.filter(e => !e.is_archived && new Date(e.event_start_date) > new Date()).length}
              </p>
            </div>
            <div className="bg-purple-500/30 p-3 rounded-lg">
              <MdCalendarToday className="text-3xl text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('events_and_attendees_overview')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend wrapperStyle={{ color: '#d1d5db' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('top_events_by_participants')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} />
              <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend wrapperStyle={{ color: '#d1d5db' }} />
              <Bar dataKey="participants" fill="#6366f1" name={t('number_of_participants')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Events */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">{t('latest_events')}</h3>
        </div>
        {latestEvents.length === 0 ? (
          <div className="p-6 text-center">
            <MdEvent className="text-5xl text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t('no_events_yet')}</p>
            <Link
              to="/admin/events/new"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t('create_first_event') || 'Créer votre premier événement'}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {latestEvents.map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${event.is_archived ? 'bg-gray-500' : 'bg-green-500'}`}></div>
                    <div>
                      <Link
                        to={`/admin/events/${event.id}`}
                        className="text-gray-100 font-medium hover:text-indigo-400 transition-colors"
                      >
                        {event.name_fr}
                      </Link>
                      <p className="text-sm text-gray-400">{event.name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.is_archived
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-green-900/50 text-green-400'
                    }`}>
                      {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
                    </span>
                    <div className="flex items-center text-gray-400">
                      <MdPeople className="mr-1" />
                      <span>{event.attendeeCount || 0}</span>
                    </div>
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

export default AdminDashboardPage;
