import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AttendeesModal from '../components/AttendeesModal';
import apiClient from '../api/api';
import './AdminEventsListPage.css'; // Utiliser le même CSS

function AdminEventHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('completed'); // Par défaut: terminés

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filterStatus === 'completed') {
          params.is_archived = true;
        } else if (filterStatus === 'all') {
          // Aucun filtre is_archived pour 'all'
        }
        const response = await apiClient.get('/admin/events', { params });
        setEvents(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch events');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filterStatus]);

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
        <h2>{t('event_history')}</h2> {/* Nouveau titre */}
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
