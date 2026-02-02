import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdClose, MdPeople, MdDownload, MdVisibility, MdEmail, MdPhone } from 'react-icons/md';

function AttendeesModal({ eventId, onClose }) {
  const { t, i18n } = useTranslation();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventDetails, setEventDetails] = useState(null);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendeesResponse, eventResponse] = await Promise.all([
          api.admin.listAttendees(eventId),
          api.admin.getEventDetails(eventId)
        ]);
        setAttendees(attendeesResponse.attendees || []);
        setEventDetails(eventResponse);
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const getEventName = () => {
    if (!eventDetails) return '';
    return i18n.language === 'fr' ? eventDetails.name_fr : eventDetails.name_en;
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
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAttendee(null);
  };

  // Télécharger PDF d'un participant
  const handleDownloadSinglePDF = (attendee) => {
    const printWindow = window.open('', '_blank');
    const eventName = getEventName();

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
          .footer { margin-top: 40px; text-align: center; font-style: italic; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>MY EDEN X - ${t('attendee_information')}</h1>
        <h2>${eventName}</h2>
        <table>
          <tr><td style="font-weight: bold; width: 200px;">${t('full_name')}</td><td>${attendee.full_name}</td></tr>
          <tr><td style="font-weight: bold;">${t('email')}</td><td>${attendee.email}</td></tr>
          <tr><td style="font-weight: bold;">${t('phone')}</td><td>${attendee.form_responses?.phone || '-'}</td></tr>
          <tr><td style="font-weight: bold;">${t('registered_at')}</td><td>${formatDate(attendee.created_at)}</td></tr>
        </table>
        ${responsesHtml ? `<h2>${t('form_responses')}</h2><table>${responsesHtml}</table>` : ''}
        <div class="footer"><p>${t('bible_verse')}</p></div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Télécharger PDF de tous les participants
  const handleDownloadAllPDF = () => {
    const printWindow = window.open('', '_blank');
    const eventName = getEventName();

    let attendeesHtml = '';
    attendees.forEach((attendee, index) => {
      let responsesHtml = '';
      if (attendee.form_responses) {
        Object.entries(attendee.form_responses).forEach(([key, value]) => {
          if (key !== 'phone') {
            responsesHtml += `<li><strong>${key}:</strong> ${formatValue(value)}</li>`;
          }
        });
      }

      attendeesHtml += `
        <div style="page-break-inside: avoid; margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
          <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #4f46e5;">${index + 1}. ${attendee.full_name}</h3>
          </div>
          <p><strong>${t('email')}:</strong> ${attendee.email}</p>
          <p><strong>${t('phone')}:</strong> ${attendee.form_responses?.phone || '-'}</p>
          <p><strong>${t('registered_at')}:</strong> ${formatDate(attendee.created_at)}</p>
          ${responsesHtml ? `<div><strong>${t('form_responses')}:</strong><ul>${responsesHtml}</ul></div>` : ''}
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${eventName} - ${t('all_attendees')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          .header-info { margin-bottom: 30px; color: #6b7280; }
          .footer { margin-top: 40px; text-align: center; font-style: italic; color: #6b7280; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${eventName}</h1>
        <div class="header-info">
          <p><strong>${t('total')}:</strong> ${attendees.length} ${t('participants').toLowerCase()}</p>
          <p><strong>${t('date')}:</strong> ${new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</p>
        </div>
        ${attendeesHtml}
        <div class="footer"><p>${t('bible_verse')}</p></div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!eventId) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <MdPeople className="text-2xl text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">{t('attendees_for_event')}</h2>
              {eventDetails && (
                <p className="text-indigo-200 text-sm">{getEventName()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {attendees.length > 0 && (
              <button
                onClick={handleDownloadAllPDF}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <MdDownload />
                {t('download_all_pdf')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <MdClose className="text-xl text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-300">{t('loading')}...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && attendees.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40">
              <MdPeople className="text-5xl text-gray-600 mb-4" />
              <p className="text-gray-400">{t('no_attendees_yet')}</p>
            </div>
          )}

          {!loading && !error && attendees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-300 font-semibold">#</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('full_name')}</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('email')}</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('phone')}</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-semibold">{t('registered_at')}</th>
                    <th className="px-4 py-3 text-center text-gray-300 font-semibold">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {attendees.map((attendee, index) => (
                    <tr key={attendee.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-white font-medium">{attendee.full_name}</td>
                      <td className="px-4 py-3 text-gray-300">{attendee.email}</td>
                      <td className="px-4 py-3 text-gray-300">{attendee.form_responses?.phone || '-'}</td>
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

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-between">
          <p className="text-gray-400">
            {attendees.length} {t('participants').toLowerCase()}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>

      {/* Modal détails participant */}
      {showDetailModal && selectedAttendee && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{t('attendee_information')}</h3>
              <button
                onClick={handleCloseDetailModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MdClose className="text-xl text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('full_name')}</p>
                  <p className="text-white font-semibold">{selectedAttendee.full_name}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('email')}</p>
                  <p className="text-white flex items-center gap-2">
                    <MdEmail className="text-indigo-400" />
                    {selectedAttendee.email}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('phone')}</p>
                  <p className="text-white flex items-center gap-2">
                    <MdPhone className="text-green-400" />
                    {selectedAttendee.form_responses?.phone || '-'}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('registered_at')}</p>
                  <p className="text-white">{formatDate(selectedAttendee.created_at)}</p>
                </div>
              </div>

              {/* Réponses au formulaire */}
              {selectedAttendee.form_responses &&
               Object.keys(selectedAttendee.form_responses).filter(k => k !== 'phone').length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-white mb-2">{t('form_responses')}</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedAttendee.form_responses)
                      .filter(([key]) => key !== 'phone')
                      .map(([key, value]) => (
                        <div key={key} className="bg-gray-700/50 rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">{key}</p>
                          <p className="text-white">{formatValue(value)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-3 border-t border-gray-700">
                <button
                  onClick={() => handleDownloadSinglePDF(selectedAttendee)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  <MdDownload />
                  {t('download_pdf')}
                </button>
                <button
                  onClick={handleCloseDetailModal}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
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

export default AttendeesModal;
