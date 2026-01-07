import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../api/api'; // Utilisation de notre objet api
import './AdminEventsListPage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
    const storedToken = localStorage.getItem('supabase.auth.token');
    let parsedUser = null;
    if (storedToken) {
        try {
            parsedUser = JSON.parse(storedToken).user;
        } catch (e) {
            console.error("Error parsing user token:", e);
        }
    }
    
    const currentChurchId = parsedUser?.user_metadata?.church_id;
    if (!currentChurchId) {
        setError(t('error_church_id_missing'));
        setLoading(false);
        navigate('/admin/login');
        return;
    }
    setChurchId(currentChurchId);


    const fetchDashboardData = async () => {
      try {
        setError('');
        // L'API côté serveur gère le filtrage par church_id via le token d'authentification
        const events = await api.admin.listEvents(); // Utilisation de api.admin.listEvents
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
    if (currentChurchId) {
        fetchDashboardData();
    }
  }, [t, navigate]);

  const pieData = [
    { name: t('total_events'), value: totalEvents },
    { name: t('total_attendees'), value: totalAttendees },
  ];

  const barData = eventsData.slice(0, 3).map(event => ({
    name: event.name_fr,
    participants: event.attendeeCount || 0,
  })).sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return <p>{t('loading')}...</p>;
  if (error) return <p style={{ color: 'red' }}>{t('error')}: {error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>{t('admin_dashboard')}</h2>

      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', marginBottom: '40px' }}>
        <div style={{ flex: '1', minWidth: '250px', margin: '10px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', textAlign: 'center' }}>
          <h3>{t('total_events')}</h3>
          <p style={{ fontSize: '2em', fontWeight: 'bold' }}>{totalEvents}</p>
        </div>
        <div style={{ flex: '1', minWidth: '250px', margin: '10px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', textAlign: 'center' }}>
          <h3>{t('total_attendees')}</h3>
          <p style={{ fontSize: '2em', fontWeight: 'bold' }}>{totalAttendees}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', marginTop: '20px' }}>
        <div style={{ width: '45%', minWidth: '300px', marginBottom: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '8px', padding: '15px' }}>
          <h3>{t('events_and_attendees_overview')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ width: '45%', minWidth: '300px', marginBottom: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '8px', padding: '15px' }}>
          <h3>{t('top_events_by_participants')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={barData}
              margin={{
                top: 5, right: 30, left: 20, bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="participants" fill="#8884d8" name={t('number_of_participants')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>{t('latest_events')}</h3>
        {latestEvents.length === 0 ? (
          <p>{t('no_events_yet')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {latestEvents.map((event) => (
              <li key={event.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
                <span className={`status-circle ${event.is_archived ? 'status-archived-circle' : 'status-active-circle'}`}></span>
                <Link to={`/admin/events/${event.id}`} style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold', marginRight: '10px' }}>
                  {event.name_fr} ({event.name_en})
                </Link>
                <span className={event.is_archived ? 'status-archived-text' : 'status-active-text'}>
                  ({event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')})
                </span>
                 - {t('attendees_count', { count: event.attendeeCount || 0 })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
