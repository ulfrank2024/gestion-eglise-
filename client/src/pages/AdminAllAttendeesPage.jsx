import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';

function AdminAllAttendeesPage() {
  const { t } = useTranslation();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllAttendees = async () => {
      try {
        const response = await apiClient.get('/admin/attendees');
        setAttendees(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch attendees');
      } finally {
        setLoading(false);
      }
    };

    fetchAllAttendees();
  }, []);

  if (loading) return <p>{t('loading')}...</p>;
  if (error) return <p>{t('error')}: {error}</p>;

  return (
    <div>
      <h2>{t('all_attendees')}</h2>
      <table className="attendees-table">
        <thead>
          <tr>
            <th>{t('event')}</th>
            <th>{t('attendee_details')}</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map(attendee => (
            <tr key={attendee.id}>
              <td>{attendee.events.name_fr}</td>
              <td>
                {attendee.form_responses && Object.entries(attendee.form_responses).map(([key, value]) => (
                  <div key={key}><strong>{key}:</strong> {value.toString()}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminAllAttendeesPage;
