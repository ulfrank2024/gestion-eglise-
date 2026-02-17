import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../api/api';
import { MdEvent, MdPeople, MdTrendingUp, MdCheckCircle } from 'react-icons/md';
import AlertMessage from '../components/AlertMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getErrorMessage } from '../utils/errorHandler';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [totalCheckIns, setTotalCheckIns] = useState(0); // Nouvel état pour les check-ins
  const [latestEvents, setLatestEvents] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError('');

        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        const events = await api.admin.listEvents();
        // S'assurer que events est un tableau
        const eventsArray = Array.isArray(events) ? events : [];
        setEventsData(eventsArray);

        setTotalEvents(eventsArray.length);

        // Calculer les totaux
        const attendeesCount = eventsArray.reduce((sum, event) => sum + (event.attendeeCount || 0), 0);
        setTotalAttendees(attendeesCount);

        const checkInsCount = eventsArray.reduce((sum, event) => sum + (event.checkinCount || 0), 0);
        setTotalCheckIns(checkInsCount);

        const sortedEvents = [...eventsArray].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLatestEvents(sortedEvents.slice(0, 5));

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

  const pieData = [
    { name: t('total_events'), value: totalEvents },
    { name: t('total_attendees'), value: totalAttendees },
    { name: t('checked_in_attendees'), value: totalCheckIns },
  ];

  const barData = (Array.isArray(eventsData) ? eventsData : []).slice(0, 5).map(event => ({
    name: event.name_fr || '',
    participants: event.attendeeCount || 0,
    checkins: event.checkinCount || 0,
  })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (loading) return <LoadingSpinner />;

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
              <p className="text-green-200 text-sm font-medium">{t('registered_attendees')}</p>
              <p className="text-4xl font-bold text-white mt-2">{totalAttendees}</p>
            </div>
            <div className="bg-green-500/30 p-3 rounded-lg">
              <MdPeople className="text-3xl text-white" />
            </div>
          </div>
        </div>

        {/* Total Check-ins */}
        <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sky-200 text-sm font-medium">{t('checked_in_attendees')}</p>
              <p className="text-4xl font-bold text-white mt-2">{totalCheckIns}</p>
            </div>
            <div className="bg-sky-500/30 p-3 rounded-lg">
              <MdCheckCircle className="text-3xl text-white" />
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
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">{t('events_and_attendees_overview')}</h3>
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
          <h3 className="text-lg font-semibold text-white mb-4">{t('top_events_by_participants')}</h3>
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
              <Bar dataKey="participants" fill="#6366f1" name={t('registered_attendees')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="checkins" fill="#0ea5e9" name={t('checked_in_attendees')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Events */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">{t('latest_events')}</h3>
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
                        className="text-white font-medium hover:text-indigo-400 transition-colors"
                      >
                        {event.name_fr}
                      </Link>
                      <p className="text-sm text-gray-400">{event.name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-gray-400" title={t('registered_attendees')}>
                      <MdPeople className="mr-2" />
                      <span>{event.attendeeCount || 0}</span>
                    </div>
                    <div className="flex items-center text-gray-400" title={t('checked_in_attendees')}>
                      <MdCheckCircle className="mr-2" />
                      <span>{event.checkinCount || 0}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.is_archived
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-green-900/50 text-green-400'
                    }`}>
                      {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
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

export default AdminDashboardPage;
