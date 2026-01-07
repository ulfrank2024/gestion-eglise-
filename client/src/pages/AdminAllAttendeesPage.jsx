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

    const fetchAllAttendees = async () => {
      try {
        const response = await api.admin.listAttendees(); // churchId est géré par le backend via le token
        setAttendees(response.data);
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

    if (currentChurchId) { // Seulement si churchId est disponible
        fetchAllAttendees();
    }
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
