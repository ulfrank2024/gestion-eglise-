import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { api } from '../api/api';
import {
  MdBarChart, MdEvent, MdPeople, MdTrendingUp, MdCheckCircle,
  MdArrowBack
} from 'react-icons/md';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function AdminStatisticsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const location = useLocation();
  const navigate = useNavigate();

  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventStats, setEventStats] = useState(null);
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('eventId');

    const fetchData = async () => {
      try {
        setError('');
        const userInfo = await api.auth.me();

        if (!userInfo.church_id) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }

        if (eventId) {
          const eventResponse = await api.admin.getEventDetails(eventId);
          setEventName(lang === 'fr' ? eventResponse.name_fr : eventResponse.name_en);
          const statsResponse = await api.admin.getEventStatistics(eventId);
          setEventStats(statsResponse);
        } else {
          const events = await api.admin.listEvents();
          setEventsData(events || []);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError(err.response?.data?.error || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search, t, navigate, lang]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  // Vue statistiques d'un seul événement
  if (eventStats) {
    const attendanceRate = eventStats.registered_attendees > 0
      ? Math.round((eventStats.checked_in_attendees / eventStats.registered_attendees) * 100)
      : 0;

    const pieData = [
      { name: t('checked_in'), value: eventStats.checked_in_attendees },
      { name: t('not_checked_in') || 'Non pointés', value: eventStats.registered_attendees - eventStats.checked_in_attendees },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/statistics')}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MdArrowBack size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MdBarChart className="text-indigo-400" />
              {t('event_statistics_for')}
            </h1>
            <p className="text-gray-400">"{eventName}"</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <MdPeople className="text-2xl text-indigo-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{eventStats.registered_attendees}</p>
                <p className="text-sm text-gray-400">{t('registered')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <MdCheckCircle className="text-2xl text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{eventStats.checked_in_attendees}</p>
                <p className="text-sm text-gray-400">{t('checked_in')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center">
                <MdTrendingUp className="text-2xl text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{attendanceRate}%</p>
                <p className="text-sm text-gray-400">{t('attendance_rate')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('attendance_rate')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>
      </div>
    );
  }

  // Vue générale - Statistiques globales
  const totalEvents = eventsData.length;
  const activeEvents = eventsData.filter(e => !e.is_archived).length;
  const totalAttendees = eventsData.reduce((sum, e) => sum + (e.attendeeCount || 0), 0);
  const totalCheckins = eventsData.reduce((sum, e) => sum + (e.checkinCount || 0), 0);
  const averageAttendance = totalAttendees > 0 ? Math.round((totalCheckins / totalAttendees) * 100) : 0;

  // Données pour le graphique des participants par événement
  const barData = eventsData
    .filter(e => (e.attendeeCount || 0) > 0)
    .sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0))
    .slice(0, 10)
    .map(event => ({
      name: (lang === 'fr' ? event.name_fr : event.name_en).substring(0, 20),
      inscrits: event.attendeeCount || 0,
      pointes: event.checkinCount || 0,
    }));

  // Top 5 événements
  const topEvents = eventsData
    .filter(e => (e.attendeeCount || 0) > 0)
    .sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdBarChart className="text-3xl text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">{t('statistics')}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <MdEvent className="text-3xl text-white/80" />
            <div>
              <p className="text-3xl font-bold text-white">{totalEvents}</p>
              <p className="text-sm text-indigo-100">{t('total_events')}</p>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-2">{activeEvents} {t('status_active').toLowerCase()}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <MdPeople className="text-3xl text-white/80" />
            <div>
              <p className="text-3xl font-bold text-white">{totalAttendees}</p>
              <p className="text-sm text-green-100">{t('total_attendees')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <MdCheckCircle className="text-3xl text-white/80" />
            <div>
              <p className="text-3xl font-bold text-white">{totalCheckins}</p>
              <p className="text-sm text-amber-100">{t('checked_in')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <MdTrendingUp className="text-3xl text-white/80" />
            <div>
              <p className="text-3xl font-bold text-white">{averageAttendance}%</p>
              <p className="text-sm text-purple-100">{t('attendance_rate')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Participants par événement */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('participants_per_event')}</h3>
          {barData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  <Bar dataKey="inscrits" fill="#6366f1" name={t('registered')} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pointes" fill="#22c55e" name={t('checked_in')} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              {t('no_events_yet')}
            </div>
          )}
        </div>

        {/* Top Events */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('top_events_by_participants')}</h3>
          {topEvents.length > 0 ? (
            <div className="space-y-3">
              {topEvents.map((event, index) => {
                const rate = event.attendeeCount > 0
                  ? Math.round((event.checkinCount / event.attendeeCount) * 100)
                  : 0;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/statistics?eventId=${event.id}`)}
                  >
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {lang === 'fr' ? event.name_fr : event.name_en}
                      </p>
                      <p className="text-sm text-gray-400">
                        {event.attendeeCount} {t('registered').toLowerCase()} • {rate}% {t('attendance_rate').toLowerCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">{event.checkinCount}</p>
                      <p className="text-xs text-gray-500">{t('checked_in')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              {t('no_events_yet')}
            </div>
          )}
        </div>
      </div>

      {/* All Events Table */}
      {eventsData.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{t('all_events')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('event_title')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">{t('registered')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">{t('checked_in')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">{t('attendance_rate')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {eventsData.map((event) => {
                  const rate = event.attendeeCount > 0
                    ? Math.round((event.checkinCount / event.attendeeCount) * 100)
                    : 0;

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/statistics?eventId=${event.id}`)}
                    >
                      <td className="px-4 py-3 text-white">
                        {lang === 'fr' ? event.name_fr : event.name_en}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{event.attendeeCount || 0}</td>
                      <td className="px-4 py-3 text-center text-green-400">{event.checkinCount || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-indigo-500 h-2 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-gray-300 text-sm">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {event.is_archived ? (
                          <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                            {t('eventStatus.archived')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                            {t('eventStatus.active')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStatisticsPage;
