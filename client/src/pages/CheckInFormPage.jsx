import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { InlineSpinner } from '../components/LoadingSpinner';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo_eden.png';
import {
  MdPerson, MdEmail, MdPhone, MdHelpOutline, MdPersonAdd, MdCheckCircle, MdArrowForward
} from 'react-icons/md';

function CheckInFormPage() {
  const { churchId, eventId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [invitedBy, setInvitedBy] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventData = await api.public.getEventDetails(churchId, eventId);
        setEvent(eventData);
        if (eventData.church) setChurch(eventData.church);
      } catch (err) {
        setError(err.response?.data?.error || err.message || t('error_fetching_event_details'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [churchId, eventId, t]);

  const handleSubmit = async (skip = false) => {
    setSubmitting(true);
    try {
      const payload = skip ? {} : {
        full_name: fullName || undefined,
        email: email || undefined,
        phone_number: phoneNumber || undefined,
        how_heard: howHeard || undefined,
        invited_by: invitedBy || undefined,
      };
      await api.public.submitCheckin(churchId, eventId, payload);
      navigate(`/${churchId}/welcome/${eventId}`);
    } catch (err) {
      console.error('Checkin submit error:', err);
      // En cas d'erreur on redirige quand même pour ne pas bloquer le visiteur
      navigate(`/${churchId}/welcome/${eventId}`);
    }
  };

  const howHeardOptions = [
    { value: 'social_media', label: t('how_heard_social') },
    { value: 'friend', label: t('how_heard_friend') },
    { value: 'poster', label: t('how_heard_poster') },
    { value: 'email', label: t('how_heard_email') },
    { value: 'other', label: t('how_heard_other') },
  ];

  const eventName = event
    ? (i18n.language === 'fr' ? event.name_fr : event.name_en) || event.name_fr
    : '';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Card principale */}
      <div className="w-full max-w-md">

        {/* Header avec image de l'événement ou gradient */}
        <div
          className="rounded-t-2xl overflow-hidden relative"
          style={{ minHeight: '140px' }}
        >
          {event?.background_image_url ? (
            <div className="relative">
              <img
                src={event.background_image_url}
                alt={eventName}
                className="w-full h-36 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/80" />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-r from-indigo-600 to-purple-700" />
          )}

          {/* Logo et nom app */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <img src={logo} alt="MY EDEN X" className="w-12 h-12 rounded-full border-2 border-white/60 shadow-lg" />
            <span className="text-white text-xs font-bold mt-1 drop-shadow">MY EDEN X</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-gray-800 rounded-b-2xl border border-gray-700 border-t-0 px-6 pb-6 pt-4 shadow-2xl">

          {/* Titre */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600/20 mb-3">
              <MdCheckCircle className="text-indigo-400" size={28} />
            </div>
            <h1 className="text-xl font-bold text-white">
              {t('checkin_form_title')}
            </h1>
            {eventName && (
              <p className="text-indigo-400 text-sm mt-1 font-medium">{eventName}</p>
            )}
            <p className="text-gray-400 text-sm mt-2">{t('checkin_form_subtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-4">

            {/* Nom complet */}
            <div className="relative">
              <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('full_name_placeholder')}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email_placeholder') || 'jean@email.com'}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Téléphone */}
            <div className="relative">
              <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('phone_placeholder') || '+1 514 000 0000'}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Comment avez-vous entendu parler ? */}
            <div className="relative">
              <MdHelpOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={howHeard}
                onChange={(e) => setHowHeard(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                <option value="" className="bg-gray-700 text-gray-400">
                  {t('how_heard_question')}
                </option>
                {howHeardOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-gray-700 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Qui vous a invité ? */}
            <div className="relative">
              <MdPersonAdd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={invitedBy}
                onChange={(e) => setInvitedBy(e.target.value)}
                placeholder={t('invited_by_question')}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="mt-6 space-y-3">
            {/* Bouton principal : Confirmer */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? (
                <InlineSpinner className="mr-2" />
              ) : (
                <MdCheckCircle className="mr-2" size={20} />
              )}
              {t('confirm_presence')}
            </button>

            {/* Bouton secondaire : Passer */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full flex items-center justify-center py-3 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl border border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              <MdArrowForward className="mr-2" size={18} />
              {t('skip')}
            </button>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4">{t('checkin_form_optional_hint')}</p>
        </div>
      </div>
    </div>
  );
}

export default CheckInFormPage;
