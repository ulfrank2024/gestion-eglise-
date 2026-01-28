import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdPerson, MdEmail, MdPhone, MdLocationOn, MdCalendarToday,
  MdArrowBack, MdEdit, MdSave, MdCancel, MdBadge, MdEvent,
  MdArchive, MdUnarchive, MdDelete, MdCheck, MdClose
} from 'react-icons/md';

function AdminMemberDetailPage() {
  const { t, i18n } = useTranslation();
  const { memberId } = useParams();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // États pour l'édition
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: ''
  });

  // États pour le modal de rôles
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getMember(memberId);
      setMember(data);
      setEditForm({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        date_of_birth: data.date_of_birth || ''
      });
    } catch (err) {
      console.error('Error fetching member:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.admin.updateMember(memberId, editForm);
      await fetchMember();
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    try {
      await api.admin.archiveMember(memberId, !member.is_archived);
      await fetchMember();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirm_delete_member'))) return;
    try {
      await api.admin.deleteMember(memberId);
      navigate('/admin/members');
    } catch (err) {
      setError(err.message);
    }
  };

  // Gestion des rôles
  const openRolesModal = async () => {
    setShowRolesModal(true);
    setLoadingRoles(true);
    try {
      const roles = await api.admin.getRoles();
      setAvailableRoles(roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRoles(false);
    }
  };

  const memberHasRole = (roleId) => {
    return member?.member_roles_v2?.some(mr => mr.role_id === roleId);
  };

  const handleAssignRole = async (roleId) => {
    try {
      await api.admin.assignRole(roleId, memberId);
      await fetchMember();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnassignRole = async (roleId) => {
    try {
      await api.admin.unassignRole(roleId, memberId);
      await fetchMember();
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

  if (!member) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <MdPerson className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('member_not_found') || 'Membre non trouvé'}</p>
          <button
            onClick={() => navigate('/admin/members')}
            className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t('back_to_members') || 'Retour aux membres'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/members')}
          className="flex items-center text-gray-400 hover:text-gray-200 transition-colors"
        >
          <MdArrowBack className="mr-2" />
          {t('back_to_members') || 'Retour aux membres'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-300 hover:text-red-200">
            <MdClose />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale - Informations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Profil */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <MdPerson className="text-2xl" />
                <span className="font-semibold">{t('member_profile') || 'Profil du membre'}</span>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <MdEdit size={18} />
                  {t('edit')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    <MdCancel size={18} />
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    <MdSave size={18} />
                    {saving ? t('saving') : t('save')}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Photo et nom */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-700">
                {member.profile_photo_url ? (
                  <img
                    src={member.profile_photo_url}
                    alt={member.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-gray-700">
                    <span className="text-3xl font-bold text-white">
                      {member.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="text-2xl font-bold bg-gray-700 text-gray-100 px-3 py-1 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-100">{member.full_name}</h1>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {member.is_archived ? (
                      <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-sm rounded-full">
                        {t('archived')}
                      </span>
                    ) : member.is_active ? (
                      <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-sm rounded-full">
                        {t('active')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-sm rounded-full">
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations de contact */}
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <MdEmail className="text-xl text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">{t('email')}</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full mt-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-100">{member.email}</p>
                    )}
                  </div>
                </div>

                {/* Téléphone */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <MdPhone className="text-xl text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">{t('phone')}</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full mt-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-100">{member.phone || '-'}</p>
                    )}
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <MdLocationOn className="text-xl text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">{t('address')}</p>
                    {isEditing ? (
                      <textarea
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full mt-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-100">{member.address || '-'}</p>
                    )}
                  </div>
                </div>

                {/* Date de naissance */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <MdCalendarToday className="text-xl text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">{t('date_of_birth')}</p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.date_of_birth}
                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                        className="w-full mt-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <p className="text-gray-100">
                        {member.date_of_birth
                          ? new Date(member.date_of_birth).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
                          : '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date d'inscription */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <MdEvent className="text-xl text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">{t('joined_at')}</p>
                    <p className="text-gray-100">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Événements récents */}
          {member.recent_events && member.recent_events.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                  <MdEvent className="text-blue-400" />
                  {t('recent_events') || 'Événements récents'}
                </h2>
              </div>
              <div className="divide-y divide-gray-700">
                {member.recent_events.map((event) => (
                  <div key={event.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                    <div>
                      <p className="text-gray-100 font-medium">
                        {lang === 'fr' ? event.name_fr : event.name_en}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {event.event_start_date
                          ? new Date(event.event_start_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
                          : '-'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">
                      {t('registered')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Rôles */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <MdBadge className="text-purple-400" />
                {t('roles')}
              </h2>
              <button
                onClick={openRolesModal}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                {t('manage')}
              </button>
            </div>
            <div className="p-6">
              {member.member_roles_v2 && member.member_roles_v2.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {member.member_roles_v2.map((mr) => (
                    <span
                      key={mr.id}
                      className="px-3 py-1.5 text-sm rounded-full text-white"
                      style={{ backgroundColor: mr.church_roles_v2?.color || '#6366f1' }}
                    >
                      {lang === 'fr' ? mr.church_roles_v2?.name_fr : mr.church_roles_v2?.name_en}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  {t('no_roles_assigned') || 'Aucun rôle assigné'}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-100">{t('actions')}</h2>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={handleArchive}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  member.is_archived
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                }`}
              >
                {member.is_archived ? (
                  <>
                    <MdUnarchive size={20} />
                    {t('unarchive') || 'Désarchiver'}
                  </>
                ) : (
                  <>
                    <MdArchive size={20} />
                    {t('archive') || 'Archiver'}
                  </>
                )}
              </button>

              {member.is_archived && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  <MdDelete size={20} />
                  {t('delete_permanently') || 'Supprimer définitivement'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de gestion des rôles */}
      {showRolesModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdBadge />
                {t('manage_roles') || 'Gérer les rôles'}
              </h2>
              <button
                onClick={() => setShowRolesModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Info du membre */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                {member.profile_photo_url ? (
                  <img
                    src={member.profile_photo_url}
                    alt={member.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {member.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-gray-100 font-medium">{member.full_name}</p>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                </div>
              </div>

              {/* Liste des rôles */}
              {loadingRoles ? (
                <div className="text-center py-4 text-gray-400">
                  {t('loading')}...
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <MdBadge className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>{t('no_roles_available') || 'Aucun rôle disponible'}</p>
                  <p className="text-sm mt-1">{t('create_roles_first') || 'Créez des rôles dans la section Rôles'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm mb-3">
                    {t('click_to_toggle_role') || 'Cliquez pour assigner ou retirer un rôle'}
                  </p>
                  {availableRoles.map((role) => {
                    const hasRole = memberHasRole(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => hasRole ? handleUnassignRole(role.id) : handleAssignRole(role.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          hasRole
                            ? 'bg-gray-700 border-green-500/50'
                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: role.color || '#6366f1' }}
                          />
                          <span className="text-gray-100">
                            {lang === 'fr' ? role.name_fr : role.name_en}
                          </span>
                        </div>
                        {hasRole && (
                          <MdCheck className="text-green-400" size={20} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bouton fermer */}
              <button
                onClick={() => setShowRolesModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('close') || 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMemberDetailPage;
