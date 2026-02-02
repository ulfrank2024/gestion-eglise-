import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdMail, MdLink, MdContentCopy, MdRefresh, MdSend,
  MdDelete, MdCheck, MdClose, MdPerson
} from 'react-icons/md';

function AdminMemberInvitationsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [invitations, setInvitations] = useState([]);
  const [publicLink, setPublicLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invitationsData, linkData] = await Promise.all([
        api.admin.getMemberInvitations(),
        api.admin.getPublicRegistrationLink()
      ]);
      setInvitations(invitationsData || []);
      setPublicLink(linkData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.admin.inviteMember(inviteForm);
      setSuccess(t('invitation_sent') || 'Invitation envoyée avec succès!');
      setShowInviteModal(false);
      setInviteForm({ email: '', full_name: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateLink = async () => {
    try {
      const newLink = await api.admin.regeneratePublicLink();
      setPublicLink(newLink);
      setSuccess(t('link_regenerated') || 'Lien régénéré avec succès!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyLink = async () => {
    if (!publicLink?.url) return;
    try {
      await navigator.clipboard.writeText(publicLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!window.confirm(t('confirm_delete_invitation') || 'Annuler cette invitation?')) return;
    try {
      await api.admin.deleteMemberInvitation(invitationId);
      setSuccess(t('invitation_cancelled') || 'Invitation annulée');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        {t('loading')}...
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MdMail className="text-3xl text-blue-400" />
        <h1 className="text-2xl font-bold text-white">
          {t('invitations') || 'Invitations'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 flex items-center gap-2">
          <MdClose />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-400 flex items-center gap-2">
          <MdCheck />
          {success}
        </div>
      )}

      {/* Section Lien Public */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600/20 rounded-lg">
            <MdLink className="text-2xl text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {t('public_registration_link') || 'Lien d\'inscription public'}
            </h2>
            <p className="text-sm text-gray-400">
              {t('public_link_description') || 'Partagez ce lien pour permettre aux membres de s\'inscrire'}
            </p>
          </div>
        </div>

        {publicLink?.url && (
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 bg-gray-700 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm overflow-x-auto">
              {publicLink.url}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copied ? <MdCheck /> : <MdContentCopy />}
                {copied ? t('copied') || 'Copié!' : t('copy') || 'Copier'}
              </button>
              <button
                onClick={handleRegenerateLink}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                title={t('regenerate_link') || 'Régénérer le lien'}
              >
                <MdRefresh />
              </button>
            </div>
          </div>
        )}

        {publicLink?.current_uses > 0 && (
          <p className="mt-3 text-sm text-gray-400">
            {t('link_used')} {publicLink.current_uses} {t('times') || 'fois'}
          </p>
        )}
      </div>

      {/* Section Invitation par Email */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <MdSend className="text-2xl text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('invite_by_email') || 'Inviter par email'}
              </h2>
              <p className="text-sm text-gray-400">
                {t('invite_email_description') || 'Envoyez une invitation personnalisée'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            <MdSend size={18} />
            {t('send_invitation') || 'Envoyer une invitation'}
          </button>
        </div>
      </div>

      {/* Liste des invitations en attente */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {t('pending_invitations') || 'Invitations en attente'}
          </h2>
        </div>

        {invitations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MdMail className="mx-auto text-4xl mb-2 opacity-50" />
            <p>{t('no_pending_invitations') || 'Aucune invitation en attente'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('email')}</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('name') || 'Nom'}</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('sent_at') || 'Envoyée le'}</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">{t('expires_at') || 'Expire le'}</th>
                <th className="px-4 py-3 text-center text-gray-300 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300">{invitation.email}</td>
                  <td className="px-4 py-3 text-gray-300">{invitation.full_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(invitation.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(invitation.expires_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('cancel_invitation') || 'Annuler l\'invitation'}
                    >
                      <MdDelete size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdSend />
                {t('invite_member') || 'Inviter un membre'}
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('email')} *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="membre@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('full_name')}</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('optional') || 'Optionnel'}
                />
              </div>

              <p className="text-sm text-gray-400">
                {t('invitation_email_info') || 'Un email sera envoyé avec un lien d\'inscription valable 7 jours.'}
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  <MdSend size={18} />
                  {submitting ? t('sending') || 'Envoi...' : t('send') || 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMemberInvitationsPage;
