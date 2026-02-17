import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { MdPeople, MdDownload, MdFilterList, MdVisibility, MdClose, MdEvent } from 'react-icons/md';
import LoadingSpinner from '../components/LoadingSpinner';

function AdminAllAttendeesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [churchId, setChurchId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = await api.auth.me();
        const currentChurchId = userInfo.church_id;

        if (!currentChurchId) {
          setError(t('error_church_id_missing'));
          setLoading(false);
          return;
        }
        setChurchId(currentChurchId);

        // Récupérer tous les participants
        const attendeesResponse = await api.admin.listAllAttendees();
        setAttendees(attendeesResponse || []);

        // Récupérer la liste des événements pour le filtre
        const eventsResponse = await api.admin.listEvents();
        setEvents(eventsResponse || []);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_all_attendees'));
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t, navigate]);

  const filteredAttendees = selectedEvent === 'all'
    ? attendees
    : attendees.filter(a => a.event_id === selectedEvent);

  const getEventName = (attendee) => {
    if (attendee.events_v2) {
      return i18n.language === 'fr' ? attendee.events_v2.name_fr : attendee.events_v2.name_en;
    }
    return t('unknown_event');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value) => {
    if (value === true || value === 'yes' || value === 'oui') return t('yes');
    if (value === false || value === 'no' || value === 'non') return t('no');
    if (Array.isArray(value)) return value.join(', ');
    return value?.toString() || '-';
  };

  const handleViewDetails = (attendee) => {
    setSelectedAttendee(attendee);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAttendee(null);
  };

  // Télécharger PDF d'un seul participant
  const handleDownloadSinglePDF = (attendee) => {
    const printWindow = window.open('', '_blank');
    const eventName = getEventName(attendee);

    let responsesHtml = '';
    if (attendee.form_responses) {
      Object.entries(attendee.form_responses).forEach(([key, value]) => {
        if (key !== 'phone') {
          responsesHtml += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td><td style="padding: 8px; border: 1px solid #ddd;">${formatValue(value)}</td></tr>`;
        }
      });
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${attendee.full_name} - ${eventName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { color: #6b7280; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
          th { background-color: #f3f4f6; }
          .info-section { margin-bottom: 30px; }
          .footer { margin-top: 40px; text-align: center; font-style: italic; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>MY EDEN X - ${t('attendee_information')}</h1>
        <div class="info-section">
          <h2>${eventName}</h2>
          <table>
            <tr><td style="font-weight: bold; width: 200px;">${t('full_name')}</td><td>${attendee.full_name}</td></tr>
            <tr><td style="font-weight: bold;">${t('email')}</td><td>${attendee.email}</td></tr>
            <tr><td style="font-weight: bold;">${t('phone')}</td><td>${attendee.form_responses?.phone || '-'}</td></tr>
            <tr><td style="font-weight: bold;">${t('registered_at')}</td><td>${formatDate(attendee.created_at)}</td></tr>
          </table>
        </div>
        ${responsesHtml ? `
        <div class="info-section">
          <h2>${t('form_responses')}</h2>
          <table>${responsesHtml}</table>
        </div>
        ` : ''}
        <div class="footer">
          <p>${t('bible_verse')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Télécharger PDF de tous les participants (ou filtrés)
  const handleDownloadAllPDF = () => {
    const printWindow = window.open('', '_blank');
    const eventFilter = selectedEvent === 'all'
      ? t('all_events')
      : events.find(e => e.id === selectedEvent)?.[i18n.language === 'fr' ? 'name_fr' : 'name_en'] || '';

    let attendeesHtml = '';
    filteredAttendees.forEach((attendee, index) => {
      const eventName = getEventName(attendee);
      let responsesHtml = '';

      if (attendee.form_responses) {
        Object.entries(attendee.form_responses).forEach(([key, value]) => {
          if (key !== 'phone') {
            responsesHtml += `<li><strong>${key}:</strong> ${formatValue(value)}</li>`;
          }
        });
      }

      attendeesHtml += `
        <div class="attendee-card" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #4f46e5;">${index + 1}. ${attendee.full_name}</h3>
            <span style="background-color: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${eventName}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;"><strong>${t('email')}:</strong></td>
              <td style="padding: 5px 0;">${attendee.email}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>${t('phone')}:</strong></td>
              <td style="padding: 5px 0;">${attendee.form_responses?.phone || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>${t('registered_at')}:</strong></td>
              <td style="padding: 5px 0;">${formatDate(attendee.created_at)}</td>
            </tr>
          </table>
          ${responsesHtml ? `
          <div style="margin-top: 15px;">
            <strong>${t('form_responses')}:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">${responsesHtml}</ul>
          </div>
          ` : ''}
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MY EDEN X - ${t('all_attendees')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          .header-info { display: flex; justify-content: space-between; margin-bottom: 30px; color: #6b7280; }
          .footer { margin-top: 40px; text-align: center; font-style: italic; color: #6b7280; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { .attendee-card { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>MY EDEN X - ${t('all_attendees')}</h1>
        <div class="header-info">
          <span><strong>${t('filter')}:</strong> ${eventFilter}</span>
          <span><strong>${t('total')}:</strong> ${filteredAttendees.length} ${t('participants').toLowerCase()}</span>
          <span><strong>${t('date')}:</strong> ${new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</span>
        </div>
        ${attendeesHtml}
        <div class="footer">
          <p>${t('bible_verse')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-lg">
            <MdPeople className="text-2xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('all_attendees')}</h1>
            <p className="text-gray-400">{filteredAttendees.length} {t('participants').toLowerCase()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Filtre par événement */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
            <MdFilterList className="text-gray-400" />
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              <option value="all" className="bg-gray-800">{t('all_events')}</option>
              {events.map(event => (
                <option key={event.id} value={event.id} className="bg-gray-800">
                  {i18n.language === 'fr' ? event.name_fr : event.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton télécharger tout */}
          <button
            onClick={handleDownloadAllPDF}
            disabled={filteredAttendees.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdDownload className="text-lg" />
            {t('download_all_pdf')}
          </button>
        </div>
      </div>

      {/* Tableau des participants */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredAttendees.length === 0 ? (
          <div className="p-8 text-center">
            <MdPeople className="text-5xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t('no_attendees_yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">#</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('full_name')}</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('email')}</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('phone')}</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('event')}</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('registered_at')}</th>
                  <th className="px-4 py-3 text-center text-gray-300 font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAttendees.map((attendee, index) => (
                  <tr key={attendee.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{attendee.full_name}</td>
                    <td className="px-4 py-3 text-gray-300">{attendee.email}</td>
                    <td className="px-4 py-3 text-gray-300">{attendee.form_responses?.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded-full text-xs">
                        <MdEvent className="text-sm" />
                        {getEventName(attendee)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(attendee.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(attendee)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          title={t('view_details')}
                        >
                          <MdVisibility className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDownloadSinglePDF(attendee)}
                          className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                          title={t('download_pdf')}
                        >
                          <MdDownload className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal détails participant */}
      {showModal && selectedAttendee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{t('attendee_information')}</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MdClose className="text-xl text-white" />
              </button>
            </div>

            {/* Contenu modal */}
            <div className="p-6 space-y-6">
              {/* Infos principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('full_name')}</p>
                  <p className="text-white font-semibold">{selectedAttendee.full_name}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('email')}</p>
                  <p className="text-white">{selectedAttendee.email}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('phone')}</p>
                  <p className="text-white">{selectedAttendee.form_responses?.phone || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">{t('registered_at')}</p>
                  <p className="text-white">{formatDate(selectedAttendee.created_at)}</p>
                </div>
              </div>

              {/* Événement */}
              <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
                <p className="text-indigo-300 text-sm mb-1">{t('event')}</p>
                <p className="text-indigo-100 font-semibold">{getEventName(selectedAttendee)}</p>
              </div>

              {/* Réponses au formulaire */}
              {selectedAttendee.form_responses && Object.keys(selectedAttendee.form_responses).filter(k => k !== 'phone').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">{t('form_responses')}</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedAttendee.form_responses)
                      .filter(([key]) => key !== 'phone')
                      .map(([key, value]) => (
                        <div key={key} className="bg-gray-700/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">{key}</p>
                          <p className="text-white">{formatValue(value)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => handleDownloadSinglePDF(selectedAttendee)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  <MdDownload className="text-lg" />
                  {t('download_pdf')}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAllAttendeesPage;
