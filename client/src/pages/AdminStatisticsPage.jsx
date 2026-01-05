import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import apiClient from '../api/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function AdminStatisticsPage() {
  const { t } = useTranslation();
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for single event stats
  const [eventStats, setEventStats] = useState(null);
  const [eventName, setEventName] = useState('');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('eventId');

    const fetchAllEventsStats = async () => {
      try {
        const response = await apiClient.get('/admin/events');
        setEventsData(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch events for statistics');
        console.error('Error fetching events for statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSingleEventStats = async (id) => {
      setLoading(true);
      try {
        // Fetch event details to get the name
        const eventResponse = await apiClient.get(`/admin/events/${id}`);
        setEventName(eventResponse.data.name_fr);

        // Fetch event statistics
        const statsResponse = await apiClient.get(`/admin/events/${id}/statistics`);
        setEventStats(statsResponse.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch event statistics');
        console.error('Error fetching event statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchSingleEventStats(eventId);
    } else {
      fetchAllEventsStats();
    }
  }, [location.search]);

  if (loading) return <p>{t('loading')}...</p>;
  if (error) return <p style={{ color: 'red' }}>{t('error')}: {error}</p>;

  // If we have stats for a single event, render that view
  if (eventStats) {
    const data = [
      { name: t('registered_attendees'), value: eventStats.registered_attendees },
      { name: t('checked_in_attendees'), value: eventStats.checked_in_attendees },
    ];

    return (
      <div style={{ padding: '20px' }}>
        <h2>{t('event_statistics_for')} "{eventName}"</h2>
        
        <div style={{ margin: '20px 0' }}>
          <p><strong>{t('registered_attendees')}:</strong> {eventStats.registered_attendees}</p>
          <p><strong>{t('checked_in_attendees')}:</strong> {eventStats.checked_in_attendees}</p>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name={t('count')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Original view with all events stats
  const pieData = [
    { name: t('members'), value: 400 }, // This is still mock data
    { name: t('guests'), value: 300 },
  ];

  const barData = eventsData.map(event => ({
    name: event.name_fr,
    participants: event.attendeeCount || 0,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ padding: '20px' }}>
      <h2>{t('admin_statistics')}</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', marginTop: '20px' }}>
        <div style={{ width: '45%', minWidth: '300px', marginBottom: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '8px', padding: '15px' }}>
          <h3>{t('members_guests_distribution')}</h3>
          <ResponsiveContainer width="100%" height={300}>
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
          <h3>{t('participants_per_event')}</h3>
          <ResponsiveContainer width="100%" height={300}>
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

        <div style={{ width: '95%', minWidth: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '8px', padding: '15px' }}>
          <h3>{t('participants_evolution_over_time')}</h3>
          <p>{t('this_chart_requires_historical_data')}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminStatisticsPage;
