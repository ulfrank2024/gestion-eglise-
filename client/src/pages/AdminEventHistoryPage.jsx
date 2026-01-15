import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AttendeesModal from '../components/AttendeesModal';
import { api } from '../api/api'; // Utilisation de notre objet api
import './AdminEventsListPage.css';

function AdminEventHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('completed');
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
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

        const params = {};
        if (filterStatus === 'completed') {
          params.is_archived = true;
        } else if (filterStatus === 'all') {
          // Aucun filtre is_archived pour 'all'
        }

        // L'API côté serveur gère le filtrage par church_id via le token d'authentification
        const data = await api.admin.listEvents(params.is_archived);
        setEvents(data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_events_history'));
        if (err.response?.status === 401 || err.response?.status === 403) {
            navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filterStatus, t, navigate]);

  const handleManageEvent = (id) => {
    navigate(`/admin/events/${id}`);
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
        <h2>{t('event_history')}</h2>
        <div className="filter-controls">
          <label htmlFor="statusFilter">{t('filter_by_status')}:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter-select"
          >
            <option value="completed">{t('eventStatus.archived')}</option>
            <option value="all">{t('eventStatus.all')}</option>
          </select>
        </div>
      </div>

      {events.length === 0 ? (
                  <p className="no-events-message">{t('no_events_in_history')}</p>      ) : (
        <table className="events-table">
          <thead>
            <tr>
              <th>{t('event_name_fr')}</th>
              <th>{t('event_name_en')}</th>
              <th>{t('participants')}</th>
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
                    {t('view_details')}
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

export default AdminEventHistoryPage;
