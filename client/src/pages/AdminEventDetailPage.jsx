import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';
import { api } from '../api/api';
import ConfirmationModal from '../components/ConfirmationModal';
import FormFieldBuilder from '../components/FormFieldBuilder';
import './AdminEventDetailPage.css';

function AdminEventDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [eventNameFr, setEventNameFr] = useState('');
  const [eventNameEn, setEventNameEn] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [backgroundImageFile, setBackgroundImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailSendSuccess, setEmailSendSuccess] = useState('');
  const [emailSendError, setEmailSendError] = useState('');
  const [checkinQrCodeUrl, setCheckinQrCodeUrl] = useState('');

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);

  const publicEventUrl = `${window.location.origin}/event/${id}`;

  const toLocalISOString = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const eventResponse = await apiClient.get(`/admin/events/${id}`);
        const fetchedEvent = eventResponse.data;
        setEvent(fetchedEvent);
        setEventNameFr(fetchedEvent.name_fr);
        setEventNameEn(fetchedEvent.name_en);
        setDescriptionFr(fetchedEvent.description_fr);
        setDescriptionEn(fetchedEvent.description_en);
        setImageUrl(fetchedEvent.background_image_url || '');
        setEventStartDate(toLocalISOString(fetchedEvent.event_start_date));
        setIsCompleted(fetchedEvent.is_archived);

        try {
          const qrCodeResponse = await apiClient.get(`/admin/events/${id}/qrcode-checkin`);
          setCheckinQrCodeUrl(qrCodeResponse.data.qrCodeDataUrl);
        } catch (qrError) {
          console.error('Failed to fetch check-in QR code:', qrError);
          setError(prevError => `${prevError} | Failed to load QR Code.`);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch event data');
        console.error('Error fetching event data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [id]);

  useEffect(() => {
    const fetchAttendees = async () => {
      if (!id) return;
      try {
        const response = await apiClient.get(`/admin/events/${id}/attendees`);
        setAttendees(response.data.attendees);
        setAttendeeCount(response.data.count);
      } catch (err) {
        console.error('Error fetching attendees:', err);
      }
    };

    fetchAttendees();
  }, [id]);

  const handleFileChange = (e) => {
    setBackgroundImageFile(e.target.files[0] || null);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    let finalImageUrl = imageUrl;

    try {
      if (backgroundImageFile) {
        const fileExt = backgroundImageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `event_backgrounds/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('event_images').upload(filePath, backgroundImageFile);
        if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);
        
        const { data: publicUrlData } = supabase.storage.from('event_images').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const eventDateUTC = eventStartDate ? new Date(eventStartDate).toISOString() : null;

      const response = await apiClient.put(`/admin/events/${id}`, {
        name_fr: eventNameFr,
        name_en: eventNameEn,
        description_fr: descriptionFr,
        description_en: descriptionEn,
        background_image_url: finalImageUrl,
        event_start_date: eventDateUTC,
        is_archived: isCompleted,
      });

      setEvent(response.data);
      setIsEditing(false);
      setSuccess('Event updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setModalAction('delete');
    setShowConfirmationModal(true);
  };

  const handleMarkAsCompletedClick = () => {
    setModalAction('mark_as_completed');
    setShowConfirmationModal(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmationModal(false);
    setLoading(true);
    try {
      if (modalAction === 'delete') {
        await apiClient.delete(`/admin/events/${id}`);
        navigate('/admin/dashboard');
      } else if (modalAction === 'mark_as_completed') {
        const response = await apiClient.put(`/admin/events/${id}`, {
          ...event, // Keep existing event data
          is_archived: true
        });
        setEvent(response.data);
        setIsCompleted(true);
        setSuccess('Event marked as completed successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setLoading(false);
      setModalAction(null);
    }
  };

  const handleCancelAction = () => {
    setShowConfirmationModal(false);
    setModalAction(null);
  };

  const handleSendEmails = async (e) => {
    e.preventDefault();
    setSendingEmails(true);
    setEmailSendError('');
    setEmailSendSuccess('');
    try {
      await apiClient.post(`/admin/events/${id}/send-thanks`, { subject: emailSubject, message: emailMessage });
      setEmailSendSuccess('Emails sent successfully!');
      setTimeout(() => setEmailSendSuccess(''), 5000);
    } catch (err) {
      setEmailSendError(err.message || 'Failed to send emails.');
    } finally {
      setSendingEmails(false);
    }
  };

  if (loading && !event) return <p className="loading-message">{t('loading')}...</p>;
  if (error) return <p className="error-message">{t('error')}: {error}</p>;
  if (!event) return <p className="error-message">{t('event_not_found')}</p>;

  const formHeaders = attendees.reduce((acc, attendee) => {
    if (attendee.form_responses) {
      Object.keys(attendee.form_responses).forEach(key => {
        if (!acc.includes(key)) {
          acc.push(key);
        }
      });
    }
    return acc;
  }, []);

  return (
    <div className="event-detail-container">
      <div className="event-detail-header">
        <h2>{isEditing ? t('edit_event') : t('event_details_admin_view')} - {event.name_fr}</h2>
      </div>

      {success && <p className="success-message">{success}</p>}

      {isEditing ? (
        <form onSubmit={handleUpdateEvent} className="event-form">
          <div className="form-group"><label htmlFor="eventNameFr">{t('event_name_fr')}:</label><input type="text" id="eventNameFr" value={eventNameFr} onChange={(e) => setEventNameFr(e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="eventNameEn">{t('event_name_en')}:</label><input type="text" id="eventNameEn" value={eventNameEn} onChange={(e) => setEventNameEn(e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="descriptionFr">{t('description_fr')}:</label><textarea id="descriptionFr" value={descriptionFr} onChange={(e) => setDescriptionFr(e.target.value)} required rows="4"></textarea></div>
          <div className="form-group"><label htmlFor="descriptionEn">{t('description_en')}:</label><textarea id="descriptionEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} required rows="4"></textarea></div>
          <div className="form-group"><label htmlFor="eventStartDate">{t('event_date')}:</label><input type="datetime-local" id="eventStartDate" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} /></div>
          <div className="form-group"><label htmlFor="backgroundImage">{t('background_image_url')}:</label><input type="file" id="backgroundImage" accept="image/*" onChange={handleFileChange} /></div>
          <div className="form-group"><label htmlFor="imageUrl">{t('or_image_url_direct')}:</label><input type="text" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" disabled={!!backgroundImageFile} /></div>
          <div className="form-group checkbox-group"><input type="checkbox" id="isCompleted" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} /><label htmlFor="isCompleted">{t('is_completed')}</label></div>
          <div className="form-actions"><button type="submit" disabled={loading} className="btn btn-warning">{t('update_event')}</button><button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">{t('cancel')}</button></div>
        </form>
      ) : (
        <div className="event-display-grid">
          <div className="event-main-content">
            <div className="detail-card">
              <div className="detail-item"><strong>{t('event_name_fr')}:</strong> <span>{event.name_fr}</span></div>
              <div className="detail-item"><strong>{t('event_name_en')}:</strong> <span>{event.name_en}</span></div>
              <div className="detail-item"><strong>{t('description_fr')}:</strong> <span>{event.description_fr}</span></div>
              <div className="detail-item"><strong>{t('description_en')}:</strong> <span>{event.description_en}</span></div>
              <div className="detail-item"><strong>{t('event_date')}:</strong> <span>{event.event_start_date ? new Date(event.event_start_date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('not_set')}</span></div>
              <div className="detail-item"><strong>{t('is_completed')}:</strong> <span>{event.is_archived ? t('yes') : t('no')}</span></div>
              {event.background_image_url && <img src={event.background_image_url} alt="Background" className="event-image" />}
              <div className="action-buttons"><button onClick={() => navigate(`/admin/statistics?eventId=${id}`)} className="btn btn-info">{t('statistics')}</button><button onClick={() => setIsEditing(true)} className="btn btn-warning">{t('edit')}</button>{!event.is_archived && <button onClick={handleMarkAsCompletedClick} disabled={loading} className="btn btn-secondary">{t('mark_as_completed')}</button>}<button onClick={handleDeleteClick} disabled={loading} className="btn btn-danger">{t('delete')}</button></div>
            </div>
            <div className="form-builder-card"><FormFieldBuilder eventId={id} /></div>
            <div className="attendees-card">
              <h3>{t('attendee_list_count', { count: attendeeCount })}</h3>
              {attendees.length === 0 ? (
                <p>{t('no_attendees_yet')}</p>
              ) : (
                <div className="table-responsive">
                  <table className="attendees-table">
                    <thead>
                      <tr>
                        {formHeaders.map(header => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map(attendee => (
                        <tr key={attendee.id}>
                          {formHeaders.map(header => (
                            <td key={`${attendee.id}-${header}`}>
                              {attendee.form_responses?.[header] ? attendee.form_responses[header].toString() : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="event-sidebar">
            <div className="qr-code-card">
              <h3>{t('qr_code_public')}</h3>
              <div className="qr-code-container">
                <QRCodeSVG value={publicEventUrl} size={128} level="H" />
                <p><a href={publicEventUrl} target="_blank" rel="noopener noreferrer">{publicEventUrl}</a></p>
              </div>
            </div>
            <div className="qr-code-card">
              <h3>{t('check_in_qr_code')}</h3>
              {checkinQrCodeUrl ? (
                <div className="qr-code-container">
                  <img src={checkinQrCodeUrl} alt={t('check_in_qr_code_alt')} />
                  <p>{t('scan_for_check_in')}</p>
                </div>
              ) : (
                <p>{t('loading_qr_code')}</p>
              )}
            </div>
            <div className="email-card">
              <h3>{t('send_thank_you_emails')}</h3>
              <form onSubmit={handleSendEmails}>
                <div className="form-group">
                  <label htmlFor="emailSubject">{t('subject')}:</label>
                  <input type="text" id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="emailMessage">{t('message')}:</label>
                  <textarea id="emailMessage" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} required rows="5"></textarea>
                </div>
                <button type="submit" disabled={sendingEmails} className="btn btn-primary">{sendingEmails ? 'Envoi...' : t('send_emails')}</button>
                {emailSendSuccess && <p className="success-message">{emailSendSuccess}</p>}
                {emailSendError && <p className="error-message">{emailSendError}</p>}
              </form>
            </div>
          </div>
        </div>
      )}
              {showConfirmationModal && (
                <ConfirmationModal
                  show={showConfirmationModal}
                  title={modalAction === 'delete' ? t('confirm_delete_event_title') : t('confirm_mark_completed_title')}
                  message={modalAction === 'delete' ? t('confirm_delete_event_message') : t('confirm_mark_completed_message')}
                  onConfirm={handleConfirmAction}
                  onCancel={handleCancelAction}
                  confirmText={modalAction === 'delete' ? t('delete') : t('confirm')}
                  cancelText={t('cancel')}
                />
              )}    </div>
  );
}

export default AdminEventDetailPage;