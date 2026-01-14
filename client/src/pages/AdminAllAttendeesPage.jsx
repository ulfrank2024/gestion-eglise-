import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utiliser notre objet api
import { useNavigate } from 'react-router-dom'; // Pour la redirection

function AdminAllAttendeesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchAllAttendees = async () => {
      try {
        // Récupérer les infos utilisateur via l'API (church_id est dans la DB, pas dans le token JWT)
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        const response = await api.admin.listAttendees();
        setAttendees(response.data || response);
      } catch (err) {
        console.error('Error fetching all attendees:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_all_attendees'));
        if (err.response?.status === 401 || err.response?.status === 403) {
            navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllAttendees();
  }, [t, navigate]);

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
