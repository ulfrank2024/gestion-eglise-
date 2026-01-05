import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/api';

function AttendeesModal({ eventId, onClose }) {
  const { t } = useTranslation();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const response = await apiClient.get(`/admin/events/${eventId}/attendees`);
        setAttendees(response.data.attendees);
      } catch (err) {
        setError(err.message || 'Failed to fetch attendees');
        console.error('Error fetching attendees:', err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchAttendees();
    }
  }, [eventId]);

  const renderResponses = (responses) => {
    if (!responses) return null;
    return Object.entries(responses).map(([key, value]) => (
      <div key={key}>
        <strong>{key}:</strong> {typeof value === 'boolean' ? (value ? t('yes') : t('no')) : value}
      </div>
    ));
  };

  if (!eventId) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '80%',
        maxHeight: '80%',
        overflowY: 'auto',
        position: 'relative',
      }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>
        <h2>{t('attendees_for_event')}</h2>
        {loading && <p>{t('loading')}...</p>}
        {error && <p style={{ color: 'red' }}>{t('error')}: {error}</p>}
        {!loading && !error && (
          attendees.length === 0 ? (
            <p>{t('no_attendees_yet')}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('full_name')}</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('email')}</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('form_responses')}</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => (
                  <tr key={attendee.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{attendee.full_name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{attendee.email}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {renderResponses(attendee.form_responses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}

export default AttendeesModal;
