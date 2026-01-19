import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';
import { api } from '../api/api';
import ConfirmationModal from '../components/ConfirmationModal';
import FormFieldBuilder from '../components/FormFieldBuilder';
import {
  MdArrowBack, MdEdit, MdDelete, MdCheckCircle, MdQrCode,
  MdPeople, MdEmail, MdEvent, MdBarChart, MdSave, MdClose,
  MdCalendarToday, MdLink, MdVisibility, MdDownload
} from 'react-icons/md';

function AdminEventDetailPage() {
  const { t, i18n } = useTranslation();
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
  const [eventStats, setEventStats] = useState({ registered: 0, checkedIn: 0 });
  const [formFields, setFormFields] = useState([]);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);

  const publicEventUrl = `${window.location.origin}/${event?.church_id}/event/${id}`;

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
        const fetchedEvent = await api.admin.getEventDetails(id);
        setEvent(fetchedEvent);
        setEventNameFr(fetchedEvent.name_fr);
        setEventNameEn(fetchedEvent.name_en);
        setDescriptionFr(fetchedEvent.description_fr);
        setDescriptionEn(fetchedEvent.description_en);
        setImageUrl(fetchedEvent.background_image_url || '');
        setEventStartDate(toLocalISOString(fetchedEvent.event_start_date));
        setIsCompleted(fetchedEvent.is_archived);

        try {
          const qrCodeResponse = await api.admin.getCheckinQRCode(id);
          setCheckinQrCodeUrl(qrCodeResponse.qrCodeDataUrl);
        } catch (qrError) {
          console.error('Failed to fetch check-in QR code:', qrError);
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
        const response = await api.admin.listAttendees(id);
        setAttendees(response.attendees);
        setAttendeeCount(response.count);
      } catch (err) {
        console.error('Error fetching attendees:', err);
      }
    };
    fetchAttendees();
  }, [id]);

  useEffect(() => {
    const fetchEventStats = async () => {
      if (!id) return;
      try {
        const stats = await api.admin.getEventStatistics(id);
        setEventStats({
          registered: stats.registered_attendees || 0,
          checkedIn: stats.checked_in_attendees || 0
        });
      } catch (err) {
        console.error('Error fetching event statistics:', err);
      }
    };
    fetchEventStats();
  }, [id]);

  // Récupérer les champs de formulaire pour avoir les labels bilingues
  useEffect(() => {
    const fetchFormFields = async () => {
      if (!id) return;
      try {
        const data = await api.admin.getEventFormFields(id);
        setFormFields(data);
      } catch (err) {
        console.error('Error fetching form fields:', err);
      }
    };
    fetchFormFields();
  }, [id]);

  // Fonction pour obtenir le label dans la bonne langue
  const getFieldLabel = (labelEn) => {
    const field = formFields.find(f => f.label_en === labelEn);
    if (field) {
      return i18n.language === 'fr' ? field.label_fr : field.label_en;
    }
    return labelEn; // Fallback sur la clé si pas trouvé
  };

  // Ouvrir la modal des détails d'un participant
  const handleViewAttendee = (attendee) => {
    setSelectedAttendee(attendee);
    setShowAttendeeModal(true);
  };

  // Fermer la modal
  const handleCloseAttendeeModal = () => {
    setSelectedAttendee(null);
    setShowAttendeeModal(false);
  };

  // Télécharger les détails en PDF
  const handleDownloadPDF = () => {
    if (!selectedAttendee) return;

    const printContent = document.getElementById('attendee-details-print');
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('attendee_details')} - ${selectedAttendee.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          .info-row { margin: 15px 0; padding: 10px; background: #f3f4f6; border-radius: 5px; }
          .label { font-weight: bold; color: #6b7280; }
          .value { margin-top: 5px; }
          .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #374151; }
          .response-item { margin: 10px 0; padding: 10px; background: #f9fafb; border-left: 3px solid #4f46e5; }
        </style>
      </head>
      <body>
        <h1>${t('attendee_details')}</h1>
        <p style="color: #6b7280;">${event?.name_fr || ''}</p>

        <div class="info-row">
          <div class="label">${t('full_name')}</div>
          <div class="value">${selectedAttendee.full_name}</div>
        </div>

        <div class="info-row">
          <div class="label">${t('email')}</div>
          <div class="value">${selectedAttendee.email}</div>
        </div>

        <div class="info-row">
          <div class="label">${t('phone')}</div>
          <div class="value">${selectedAttendee.form_responses?.phone || '-'}</div>
        </div>

        <div class="info-row">
          <div class="label">${t('registered_at')}</div>
          <div class="value">${selectedAttendee.created_at ? new Date(selectedAttendee.created_at).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : '-'}</div>
        </div>

        ${dynamicHeaders.filter(h => h !== 'phone').length > 0 ? `
          <div class="section-title">${t('form_responses')}</div>
          ${dynamicHeaders.filter(h => h !== 'phone').map(header => {
            const value = selectedAttendee.form_responses?.[header];
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
              return '';
            }
            return `
              <div class="response-item">
                <div class="label">${getFieldLabel(header)}</div>
                <div class="value">${formatResponseValue(value)}</div>
              </div>
            `;
          }).join('')}
        ` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

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

      const response = await api.admin.updateEvent(id, {
        name_fr: eventNameFr,
        name_en: eventNameEn,
        description_fr: descriptionFr,
        description_en: descriptionEn,
        background_image_url: finalImageUrl,
        event_start_date: eventDateUTC,
        is_archived: isCompleted,
      });

      setEvent(response);
      setIsEditing(false);
      setSuccess(t('event_updated_successfully') || 'Événement mis à jour avec succès !');
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
        await api.admin.deleteEvent(id);
        navigate('/admin/events');
      } else if (modalAction === 'mark_as_completed') {
        const response = await api.admin.updateEvent(id, {
          ...event,
          is_archived: true
        });
        setEvent(response);
        setIsCompleted(true);
        setSuccess(t('event_marked_completed') || 'Événement marqué comme terminé !');
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
      await api.admin.sendThankYouEmails(id, { subject: emailSubject, message: emailMessage });
      setEmailSendSuccess(t('emails_sent_successfully') || 'Emails envoyés avec succès !');
      setTimeout(() => setEmailSendSuccess(''), 5000);
    } catch (err) {
      setEmailSendError(err.message || 'Failed to send emails.');
    } finally {
      setSendingEmails(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-300 text-lg">{t('loading')}...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 m-4">
        <p className="text-red-400">{t('error')}: {error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 m-4">
        <p className="text-yellow-400">{t('event_not_found')}</p>
      </div>
    );
  }

  // Colonnes fixes (nom, email) + colonnes dynamiques (form_responses)
  const dynamicHeaders = attendees.reduce((acc, attendee) => {
    if (attendee.form_responses) {
      Object.keys(attendee.form_responses).forEach(key => {
        if (!acc.includes(key)) acc.push(key);
      });
    }
    return acc;
  }, []);

  // Fonction pour formater les valeurs des réponses
  const formatResponseValue = (value) => {
    if (value === null || value === undefined) return '-';

    // Si c'est un tableau (sélection multiple)
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      // Traduire chaque valeur du tableau si c'est yes/no
      return value.map(v => formatSingleValue(v)).join(', ');
    }

    return formatSingleValue(value);
  };

  // Fonction helper pour formater une valeur unique
  const formatSingleValue = (value) => {
    // Si c'est un booléen (checkbox simple)
    if (typeof value === 'boolean') {
      return value ? t('yes') : t('no');
    }

    // Si c'est une chaîne vide
    if (value === '') return '-';

    // Si c'est une chaîne "yes"/"no"/"oui"/"non" - traduire
    const lowerValue = String(value).toLowerCase();
    if (lowerValue === 'yes' || lowerValue === 'oui' || lowerValue === 'true') {
      return t('yes');
    }
    if (lowerValue === 'no' || lowerValue === 'non' || lowerValue === 'false') {
      return t('no');
    }

    // Sinon, retourner la chaîne telle quelle
    return String(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/events')}
          className="flex items-center text-gray-400 hover:text-gray-200 mb-4 transition-colors"
        >
          <MdArrowBack className="mr-2" />
          {t('back_to_events') || 'Retour aux événements'}
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-100">{event.name_fr}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                event.is_archived ? 'bg-gray-700 text-gray-300' : 'bg-green-900/50 text-green-400'
              }`}>
                {event.is_archived ? t('eventStatus.archived') : t('eventStatus.active')}
              </span>
            </div>
            <p className="text-gray-400 mt-1">{event.name_en}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MdEdit className="mr-2" /> {t('edit')}
            </button>
            {!event.is_archived && (
              <button
                onClick={handleMarkAsCompletedClick}
                className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <MdCheckCircle className="mr-2" /> {t('mark_as_completed')}
              </button>
            )}
            <button
              onClick={handleDeleteClick}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <MdDelete className="mr-2" /> {t('delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
          <p className="text-green-400">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isEditing ? (
        /* Edit Form */
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-6">{t('edit_event')}</h2>
          <form onSubmit={handleUpdateEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">{t('event_name_fr')}</label>
                <input type="text" value={eventNameFr} onChange={(e) => setEventNameFr(e.target.value)} required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">{t('event_name_en')}</label>
                <input type="text" value={eventNameEn} onChange={(e) => setEventNameEn(e.target.value)} required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">{t('description_fr')}</label>
                <textarea value={descriptionFr} onChange={(e) => setDescriptionFr(e.target.value)} required rows="4"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">{t('description_en')}</label>
                <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} required rows="4"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">{t('event_date')}</label>
              <input type="datetime-local" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)}
                className="w-full md:w-1/2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">{t('background_image_url')}</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">{t('or_image_url_direct')}</label>
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={!!backgroundImageFile}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 disabled:opacity-50" />
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="isCompleted" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-indigo-600" />
              <label htmlFor="isCompleted" className="ml-3 text-gray-300">{t('is_completed')}</label>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <button type="button" onClick={() => setIsEditing(false)}
                className="flex items-center px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
                <MdClose className="mr-2" /> {t('cancel')}
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <MdSave className="mr-2" /> {t('update_event')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* View Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details Card */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {event.background_image_url && (
                <div className="h-48 overflow-hidden">
                  <img src={event.background_image_url} alt={event.name_fr} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">{t('event_details_admin_view')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">{t('event_name_fr')}</p>
                    <p className="text-gray-100">{event.name_fr}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{t('event_name_en')}</p>
                    <p className="text-gray-100">{event.name_en}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-400 text-sm">{t('description_fr')}</p>
                    <p className="text-gray-100">{event.description_fr}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-400 text-sm">{t('description_en')}</p>
                    <p className="text-gray-100">{event.description_en}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{t('event_date')}</p>
                    <p className="text-gray-100 flex items-center">
                      <MdCalendarToday className="mr-2 text-indigo-400" />
                      {event.event_start_date
                        ? new Date(event.event_start_date).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')
                        : t('not_set')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Builder */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              {event && <FormFieldBuilder eventId={id} churchId={event.church_id} />}
            </div>

            {/* Attendees Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-100 flex items-center">
                  <MdPeople className="mr-2 text-green-400" />
                  {t('attendee_list_count', { count: attendeeCount })}
                </h3>
              </div>
              {attendees.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  {t('no_attendees_yet')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-700/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          {t('full_name')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          {t('email')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          {t('phone')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                          {t('registered_at')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase">
                          {t('actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {attendees.map(attendee => (
                        <tr key={attendee.id} className="hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-100 font-medium">
                            {attendee.full_name}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {attendee.email}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {attendee.form_responses?.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {attendee.created_at
                              ? new Date(attendee.created_at).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleViewAttendee(attendee)}
                              className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <MdVisibility className="mr-1" />
                              {t('view_details')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Statistics */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                <MdBarChart className="mr-2 text-amber-400" />
                {t('statistics') || 'Statistiques'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">{t('registered') || 'Inscrits'}</span>
                  <span className="text-2xl font-bold text-green-400">{eventStats.registered}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-300">{t('checked_in') || 'Pointés'}</span>
                  <span className="text-2xl font-bold text-indigo-400">{eventStats.checkedIn}</span>
                </div>
                {eventStats.registered > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>{t('attendance_rate') || 'Taux de présence'}</span>
                      <span>{Math.round((eventStats.checkedIn / eventStats.registered) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((eventStats.checkedIn / eventStats.registered) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Public */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                <MdQrCode className="mr-2 text-indigo-400" />
                {t('qr_code_public')}
              </h3>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={publicEventUrl} size={150} level="H" />
                </div>
                <a href={publicEventUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm flex items-center">
                  <MdLink className="mr-1" /> {t('open_public_page') || 'Ouvrir la page publique'}
                </a>
              </div>
            </div>

            {/* QR Code Check-in */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                <MdQrCode className="mr-2 text-green-400" />
                {t('check_in_qr_code')}
              </h3>
              <div className="flex flex-col items-center">
                {checkinQrCodeUrl ? (
                  <>
                    <img src={checkinQrCodeUrl} alt={t('check_in_qr_code_alt')} className="rounded-lg" />
                    <p className="mt-4 text-gray-400 text-sm text-center">{t('scan_for_check_in')}</p>
                  </>
                ) : (
                  <p className="text-gray-400">{t('loading_qr_code')}</p>
                )}
              </div>
            </div>

            {/* Send Emails */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                <MdEmail className="mr-2 text-purple-400" />
                {t('send_thank_you_emails')}
              </h3>
              <form onSubmit={handleSendEmails} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">{t('subject')}</label>
                  <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">{t('message')}</label>
                  <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} required rows="4"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-purple-500 resize-none" />
                </div>
                <button type="submit" disabled={sendingEmails}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {sendingEmails ? t('sending') || 'Envoi...' : t('send_emails')}
                </button>
                {emailSendSuccess && <p className="text-green-400 text-sm">{emailSendSuccess}</p>}
                {emailSendError && <p className="text-red-400 text-sm">{emailSendError}</p>}
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
      )}

      {/* Modal des détails du participant */}
      {showAttendeeModal && selectedAttendee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-100">
                {t('attendee_details')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MdDownload className="mr-2" />
                  {t('download_pdf')}
                </button>
                <button
                  onClick={handleCloseAttendeeModal}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <MdClose size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div id="attendee-details-print" className="p-6 space-y-6">
              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('full_name')}</p>
                  <p className="text-gray-100 text-lg font-medium">{selectedAttendee.full_name}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('email')}</p>
                  <p className="text-gray-100 text-lg">{selectedAttendee.email}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('phone')}</p>
                  <p className="text-gray-100 text-lg">{selectedAttendee.form_responses?.phone || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('registered_at')}</p>
                  <p className="text-gray-100 text-lg">
                    {selectedAttendee.created_at
                      ? new Date(selectedAttendee.created_at).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Réponses au formulaire */}
              {dynamicHeaders.filter(h => h !== 'phone').length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                    <MdEvent className="mr-2 text-indigo-400" />
                    {t('form_responses')}
                  </h4>
                  <div className="space-y-3">
                    {dynamicHeaders.filter(h => h !== 'phone').map(header => {
                      const value = selectedAttendee.form_responses?.[header];
                      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                        return null;
                      }
                      return (
                        <div key={header} className="bg-gray-700/30 rounded-lg p-4 border-l-4 border-indigo-500">
                          <p className="text-gray-400 text-sm mb-1">{getFieldLabel(header)}</p>
                          <p className="text-gray-100">{formatResponseValue(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEventDetailPage;
