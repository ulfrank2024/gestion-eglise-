import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdPeople,
  MdAdd,
  MdSearch,
  MdFilterList,
  MdStar,
  MdPerson,
  MdDelete,
  MdEdit,
  MdArrowBack,
  MdLibraryMusic,
  MdClose
} from 'react-icons/md';

const AdminChoirMembersPage = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [choirMembers, setChoirMembers] = useState([]);
  const [churchMembers, setChurchMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [voiceFilter, setVoiceFilter] = useState(searchParams.get('filter') === 'lead' ? 'lead' : 'all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form state
  const [eligiblePool, setEligiblePool] = useState({ members: [], admins: [] });
  const [personType, setPersonType] = useState('member'); // 'member' | 'admin'
  const [formData, setFormData] = useState({
    member_id: '',
    church_user_id: '',
    voice_type: 'autre',
    is_lead: false,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Récupérer les choristes
      try {
        const choirData = await api.admin.getChoirMembers();
        // S'assurer que c'est un tableau
        setChoirMembers(Array.isArray(choirData) ? choirData : []);
      } catch (choirErr) {
        console.error('Error fetching choir members:', choirErr);
        // Si les tables choir n'existent pas, initialiser à tableau vide
        setChoirMembers([]);
      }

      // Récupérer le pool éligible (membres + admins)
      try {
        const pool = await api.admin.getChoirEligiblePool();
        setEligiblePool({
          members: Array.isArray(pool?.members) ? pool.members : [],
          admins: Array.isArray(pool?.admins) ? pool.admins : [],
        });
        // Garder aussi churchMembers pour la rétrocompatibilité
        setChurchMembers(Array.isArray(pool?.members) ? pool.members : []);
      } catch (poolErr) {
        console.error('Error fetching eligible pool:', poolErr);
        setEligiblePool({ members: [], admins: [] });
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('choir.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    try {
      const payload = {
        voice_type: formData.voice_type,
        is_lead: formData.is_lead,
        notes: formData.notes,
      };
      if (personType === 'admin') {
        payload.church_user_id = formData.church_user_id;
      } else {
        payload.member_id = formData.member_id;
      }
      await api.admin.addChoirMember(payload);
      setIsAddModalOpen(false);
      setPersonType('member');
      setFormData({ member_id: '', church_user_id: '', voice_type: 'autre', is_lead: false, notes: '' });
      fetchData();
    } catch (err) {
      console.error('Error adding choir member:', err);
      setError(err.response?.data?.error || t('choir.error_adding'));
    }
  };

  const handleUpdateMember = async () => {
    try {
      await api.admin.updateChoirMember(selectedMember.id, {
        voice_type: formData.voice_type,
        is_lead: formData.is_lead,
        notes: formData.notes
      });
      setIsEditModalOpen(false);
      setSelectedMember(null);
      fetchData();
    } catch (err) {
      console.error('Error updating choir member:', err);
      setError(err.response?.data?.error || t('choir.error_updating'));
    }
  };

  const handleDeleteMember = async () => {
    try {
      await api.admin.removeChoirMember(selectedMember.id);
      setIsDeleteModalOpen(false);
      setSelectedMember(null);
      fetchData();
    } catch (err) {
      console.error('Error removing choir member:', err);
      setError(err.response?.data?.error || t('choir.error_removing'));
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      member_id: member.member_id,
      voice_type: member.voice_type,
      is_lead: member.is_lead,
      notes: member.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setIsDeleteModalOpen(true);
  };

  // Filtrer les choristes
  const filteredMembers = choirMembers.filter(member => {
    const name  = member.display_name || member.member?.full_name || '';
    const email = member.display_email || member.member?.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase());
    if (voiceFilter === 'all')  return matchesSearch;
    if (voiceFilter === 'lead') return matchesSearch && member.is_lead;
    return matchesSearch && member.voice_type === voiceFilter;
  });

  // Membres non encore dans la chorale
  const availableMembers = eligiblePool.members.filter(
    m => !choirMembers.some(cm => cm.member_id === m.id)
  );
  // Admins non encore dans la chorale
  const availableAdmins = eligiblePool.admins.filter(
    a => !choirMembers.some(cm => cm.church_user_id === a.id)
  );

  const voiceTypes = ['soprano', 'alto', 'tenor', 'basse', 'autre'];

  const getVoiceTypeBadge = (voiceType) => {
    const colors = {
      soprano: 'bg-pink-500/20 text-pink-400',
      alto: 'bg-purple-500/20 text-purple-400',
      tenor: 'bg-blue-500/20 text-blue-400',
      basse: 'bg-emerald-500/20 text-emerald-400',
      autre: 'bg-gray-500/20 text-gray-400'
    };
    return colors[voiceType] || colors.autre;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/choir"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdArrowBack className="text-xl" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MdPeople className="text-indigo-400" />
              {t('choir.members_title')}
            </h1>
            <p className="text-gray-400 text-sm">{choirMembers.length} {t('choir.choristers')}</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
        >
          <MdAdd className="text-xl" />
          {t('choir.add_chorister')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('choir.search_chorister')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <MdFilterList className="text-gray-400" />
          <select
            value={voiceFilter}
            onChange={(e) => setVoiceFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t('choir.all_voices')}</option>
            <option value="lead">{t('choir.leads_only')}</option>
            {voiceTypes.map(type => (
              <option key={type} value={type}>{t(`choir.voice_${type}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((chorister) => {
            const displayName  = chorister.display_name  || chorister.member?.full_name  || '—';
            const displayEmail = chorister.display_email || chorister.member?.email       || '';
            const displayPhoto = chorister.display_photo || chorister.member?.profile_photo_url || null;
            const isAdminType  = chorister.is_admin_type || (!chorister.member_id && !!chorister.church_user_id);
            return (
            <div
              key={chorister.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAdminType ? 'bg-amber-500/20' : 'bg-indigo-500/20'}`}>
                      <MdPerson className={`text-xl ${isAdminType ? 'text-amber-400' : 'text-indigo-400'}`} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{displayName}</p>
                      {isAdminType && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Admin</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{displayEmail}</p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(chorister)}
                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdEdit />
                  </button>
                  <button
                    onClick={() => openDeleteModal(chorister)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getVoiceTypeBadge(chorister.voice_type)}`}>
                  {t(`choir.voice_${chorister.voice_type}`)}
                </span>
                {chorister.is_lead && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                    <MdStar />
                    Lead
                  </span>
                )}
              </div>

              {chorister.repertoire_count > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <MdLibraryMusic />
                  {chorister.repertoire_count} {t('choir.songs_in_repertoire')}
                </div>
              )}

              {chorister.notes && (
                <p className="mt-3 text-sm text-gray-500 italic">"{chorister.notes}"</p>
              )}
            </div>
          ); })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
          <MdPeople className="text-5xl text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('choir.no_choristers')}</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 text-indigo-400 hover:text-indigo-300"
          >
            {t('choir.add_first_chorister')}
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{t('choir.add_chorister')}</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Toggle Membre / Admin */}
              <div className="flex rounded-lg overflow-hidden border border-gray-600">
                <button
                  onClick={() => { setPersonType('member'); setFormData(f => ({ ...f, member_id: '', church_user_id: '' })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${personType === 'member' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {t('choir.type_member') || 'Membre'}
                </button>
                <button
                  onClick={() => { setPersonType('admin'); setFormData(f => ({ ...f, member_id: '', church_user_id: '' })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${personType === 'admin' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {t('choir.type_admin') || 'Admin / Sous-admin'}
                </button>
              </div>

              {/* Sélection Membre */}
              {personType === 'member' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.select_member')}</label>
                  <select
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{t('choir.choose_member')}</option>
                    {availableMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.email})
                      </option>
                    ))}
                  </select>
                  {availableMembers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">{t('choir.all_members_in_choir') || 'Tous les membres sont déjà dans la chorale'}</p>
                  )}
                </div>
              )}

              {/* Sélection Admin */}
              {personType === 'admin' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">{t('choir.select_admin') || 'Sélectionner un admin / sous-admin'}</label>
                  <select
                    value={formData.church_user_id}
                    onChange={(e) => setFormData({ ...formData, church_user_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">{t('choir.choose_admin') || 'Choisir un admin...'}</option>
                    {availableAdmins.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name} ({admin.email})
                      </option>
                    ))}
                  </select>
                  {availableAdmins.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">{t('choir.all_admins_in_choir') || 'Tous les admins sont déjà dans la chorale'}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.voice_type')}</label>
                <select
                  value={formData.voice_type}
                  onChange={(e) => setFormData({ ...formData, voice_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {voiceTypes.map(type => (
                    <option key={type} value={type}>{t(`choir.voice_${type}`)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_lead"
                  checked={formData.is_lead}
                  onChange={(e) => setFormData({ ...formData, is_lead: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="is_lead" className="text-gray-300 flex items-center gap-2">
                  <MdStar className="text-amber-400" />
                  {t('choir.is_lead_singer')}
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('choir.notes_placeholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAddMember}
                disabled={personType === 'member' ? !formData.member_id : !formData.church_user_id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{t('choir.edit_chorister')}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                {(selectedMember.display_photo || selectedMember.member?.profile_photo_url) ? (
                  <img
                    src={selectedMember.display_photo || selectedMember.member?.profile_photo_url}
                    alt={selectedMember.display_name || selectedMember.member?.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedMember.is_admin_type ? 'bg-amber-500/20' : 'bg-indigo-500/20'}`}>
                    <MdPerson className={selectedMember.is_admin_type ? 'text-amber-400' : 'text-indigo-400'} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{selectedMember.display_name || selectedMember.member?.full_name}</p>
                    {selectedMember.is_admin_type && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Admin</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{selectedMember.display_email || selectedMember.member?.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.voice_type')}</label>
                <select
                  value={formData.voice_type}
                  onChange={(e) => setFormData({ ...formData, voice_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {voiceTypes.map(type => (
                    <option key={type} value={type}>{t(`choir.voice_${type}`)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_lead"
                  checked={formData.is_lead}
                  onChange={(e) => setFormData({ ...formData, is_lead: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="edit_is_lead" className="text-gray-300 flex items-center gap-2">
                  <MdStar className="text-amber-400" />
                  {t('choir.is_lead_singer')}
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">{t('choir.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('choir.notes_placeholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUpdateMember}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <MdDelete className="text-red-400 text-3xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('choir.remove_chorister')}</h3>
              <p className="text-gray-400">
                {t('choir.remove_chorister_confirm', { name: selectedMember.display_name || selectedMember.member?.full_name })}
              </p>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChoirMembersPage;
