import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AttendeesModal from '../components/AttendeesModal';
import { api } from '../api/api'; // Utiliser notre objet api
import './AdminEventsListPage.css';

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
    const fetchEvents = async (currentChurchId) => {
      try {
        setLoading(true);
        setError('');

        if (!currentChurchId) {
            throw new Error(t('error_church_id_missing'));
        }

        const params = {};
        if (filterStatus === 'active') {
          params.is_archived = false;
        } else if (filterStatus === 'archived') {
          params.is_archived = true;
        } else if (filterStatus === 'all') {
          // Ne pas ajouter le paramètre is_archived pour afficher tous les événements
        }
        
        // L'API côté serveur gère le filtrage par church_id via le token d'authentification
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
    setChurchId(currentChurchId); // Stocker le churchId pour d'autres utilisations si nécessaire
    fetchEvents(currentChurchId); // Appeler fetchEvents avec le churchId

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

  if (loading) return <p className="loading-message">{t('loading')}...</p>;
  if (error) return <p className="error-message">{t('error')}: {error}</p>;

  return (
    <div className="admin-events-container">
      <div className="admin-events-header">
        <h2>{t('events_management')} ({events.length})</h2>
        <div className="filter-controls">
          <label htmlFor="statusFilter">{t('filter_by_status')}:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter-select"
          >
            <option value="active">{t('eventStatus.active')}</option>
            <option value="archived">{t('eventStatus.archived')}</option>
            <option value="all">{t('eventStatus.all')}</option>
          </select>
        </div>
        <button onClick={handleCreateNewEvent} className="create-event-btn">
          {t('create_new_event')}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="no-events-message">{t('no_events_yet')}</p>
      ) : (
        <table className="events-table">
          <thead>
            <tr>
              <th>{t('event_name_fr')}</th>
              <th>{t('event_name_en')}</th>
              <th>{t('attendees_count')}</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <span className={`status-circle ${event.is_archived ? 'status-archived-circle' : 'status-active-circle'}`}></span>
                  {event.name_fr}
                </td>
                <td>{event.name_en}</td>
                <td>{event.attendeeCount || 0}</td>
                <td>
                  <span className={event.is_archived ? 'status-archived-text' : 'status-active-text'}>
                    {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleManageEvent(event.id)}
                    className="action-btn manage-btn"
                  >
                    {t('manage_event')}
                  </button>
                  <button
                    onClick={() => handleViewAttendees(event.id)}
                    className="action-btn attendees-btn"
                  >
                    {t('view_attendees')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
