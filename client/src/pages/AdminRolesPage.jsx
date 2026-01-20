import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import {
  MdBadge, MdAdd, MdEdit, MdDelete, MdPeople, MdClose
} from 'react-icons/md';

function AdminRolesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name_fr: '',
    name_en: '',
    description_fr: '',
    description_en: '',
    color: '#6366f1'
  });

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingRole) {
        await api.admin.updateRole(editingRole.id, formData);
      } else {
        await api.admin.createRole(formData);
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name_fr: '', name_en: '', description_fr: '', description_en: '', color: '#6366f1' });
      fetchRoles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name_fr: role.name_fr,
      name_en: role.name_en,
      description_fr: role.description_fr || '',
      description_en: role.description_en || '',
      color: role.color || '#6366f1'
    });
    setShowModal(true);
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm(t('confirm_delete_role') || 'Êtes-vous sûr de vouloir supprimer ce rôle?')) return;
    try {
      await api.admin.deleteRole(roleId);
      fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  const openAddModal = () => {
    setEditingRole(null);
    setFormData({ name_fr: '', name_en: '', description_fr: '', description_en: '', color: '#6366f1' });
    setShowModal(true);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MdBadge className="text-3xl text-purple-400" />
          <h1 className="text-2xl font-bold text-gray-100">
            {t('roles') || 'Rôles'}
          </h1>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
        >
          <MdAdd size={20} />
          {t('create_role') || 'Créer un rôle'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Grille des rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <MdBadge className="mx-auto text-6xl mb-4 opacity-50" />
            <p>{t('no_roles') || 'Aucun rôle créé'}</p>
            <p className="text-sm mt-2">{t('create_first_role') || 'Créez votre premier rôle pour commencer'}</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Barre de couleur */}
              <div className="h-2" style={{ backgroundColor: role.color || '#6366f1' }} />

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100">
                      {lang === 'fr' ? role.name_fr : role.name_en}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {lang === 'fr' ? role.description_fr : role.description_en}
                    </p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: role.color || '#6366f1' }}
                  />
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                  <MdPeople />
                  <span>{role.memberCount || 0} {t('members') || 'membres'}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(role)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <MdEdit size={16} />
                    {t('edit') || 'Modifier'}
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="px-3 py-2 bg-gray-700 text-red-400 rounded-lg hover:bg-gray-600 hover:text-red-300 transition-colors"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal d'ajout/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MdBadge />
                {editingRole ? t('edit_role') || 'Modifier le rôle' : t('create_role') || 'Créer un rôle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('name_fr') || 'Nom (FR)'} *</label>
                  <input
                    type="text"
                    value={formData.name_fr}
                    onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">{t('name_en') || 'Nom (EN)'} *</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('description_fr') || 'Description (FR)'}</label>
                <textarea
                  value={formData.description_fr}
                  onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">{t('description_en') || 'Description (EN)'}</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">{t('color') || 'Couleur'}</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? t('saving') || 'Enregistrement...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRolesPage;
