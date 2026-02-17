import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  MdExtension, MdEvent, MdPeople, MdMusicNote, MdGroups,
  MdToggleOn, MdToggleOff, MdCheck, MdClose, MdSave,
  MdArrowBack, MdSearch, MdFilterList
} from 'react-icons/md';
import { api } from '../api/api';

const MODULE_INFO = {
  events: { icon: MdEvent, color: 'indigo', labelKey: 'events_module' },
  members: { icon: MdPeople, color: 'green', labelKey: 'members_module' },
  meetings: { icon: MdGroups, color: 'purple', labelKey: 'meetings_module' },
  choir: { icon: MdMusicNote, color: 'pink', labelKey: 'choir_module' }
};

function SuperAdminModulesPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChurch, setEditingChurch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.superAdmin.getModulesOverview();
      setData(response);
    } catch (err) {
      console.error('Error fetching modules overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (churchId, module) => {
    if (!editingChurch || editingChurch.id !== churchId) return;

    const currentModules = editingChurch.enabled_modules || [];
    let newModules;

    if (currentModules.includes(module)) {
      newModules = currentModules.filter(m => m !== module);
    } else {
      newModules = [...currentModules, module];
    }

    setEditingChurch({ ...editingChurch, enabled_modules: newModules });
  };

  const handleStartEdit = (church) => {
    setEditingChurch({ ...church });
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingChurch(null);
  };

  const handleSaveModules = async () => {
    if (!editingChurch) return;

    setSaving(true);
    try {
      await api.superAdmin.updateChurchModules(editingChurch.id, {
        enabled_modules: editingChurch.enabled_modules,
        notify_admin: true,
        language: i18n.language
      });

      // Mettre à jour les données locales
      setData(prev => ({
        ...prev,
        churches: prev.churches.map(c =>
          c.id === editingChurch.id
            ? { ...c, enabled_modules: editingChurch.enabled_modules }
            : c
        )
      }));

      setSuccessMessage(t('modules.save_success', 'Modules mis à jour avec succès'));
      setEditingChurch(null);

      // Recalculer les stats
      fetchData();

    } catch (err) {
      console.error('Error saving modules:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredChurches = data?.churches?.filter(church =>
    church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    church.subdomain?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
            <MdExtension className="text-indigo-400" />
            {t('modules.management', 'Gestion des Modules')}
          </h1>
          <p className="text-gray-400 mt-1">
            {t('modules.description', 'Activez ou désactivez les modules pour chaque église')}
          </p>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.available_modules?.map(module => {
          const info = MODULE_INFO[module];
          const Icon = info.icon;
          const count = data.module_stats?.[module] || 0;

          return (
            <div
              key={module}
              className={`bg-gray-800 rounded-xl border border-gray-700 p-4`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-${info.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`text-xl text-${info.color}-400`} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">
                    {t(info.labelKey, module)}
                  </p>
                  <p className="text-xl font-bold text-white">
                    {count}/{data.total_churches}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`bg-${info.color}-500 h-2 rounded-full transition-all`}
                  style={{ width: `${(count / data.total_churches) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center gap-3">
          <MdCheck className="text-green-400 text-xl" />
          <p className="text-green-400">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <MdClose />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_church', 'Rechercher une église...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="text-gray-400 text-sm">
            {filteredChurches.length} {t('churches', 'église(s)')}
          </div>
        </div>
      </div>

      {/* Liste des églises */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('church', 'Église')}
                </th>
                {data?.available_modules?.map(module => {
                  const info = MODULE_INFO[module];
                  const Icon = info.icon;
                  return (
                    <th key={module} className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Icon size={14} />
                        <span className="hidden md:inline">{t(info.labelKey, module)}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredChurches.map(church => {
                const isEditing = editingChurch?.id === church.id;
                const displayModules = isEditing ? editingChurch.enabled_modules : church.enabled_modules;

                return (
                  <tr key={church.id} className={`${isEditing ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'} transition-colors`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-white">{church.name}</p>
                          <p className="text-gray-400 text-xs">{church.subdomain}</p>
                        </div>
                        {church.is_suspended && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            {t('suspended', 'Suspendu')}
                          </span>
                        )}
                      </div>
                    </td>
                    {data?.available_modules?.map(module => {
                      const isEnabled = displayModules?.includes(module);
                      const info = MODULE_INFO[module];

                      return (
                        <td key={module} className="px-4 py-4 text-center">
                          {isEditing ? (
                            <button
                              onClick={() => handleToggleModule(church.id, module)}
                              className={`p-2 rounded-lg transition-all ${
                                isEnabled
                                  ? `bg-${info.color}-500/20 text-${info.color}-400 hover:bg-${info.color}-500/30`
                                  : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                              }`}
                            >
                              {isEnabled ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                              isEnabled
                                ? `bg-${info.color}-500/20 text-${info.color}-400`
                                : 'bg-gray-700 text-gray-500'
                            }`}>
                              {isEnabled ? <MdCheck size={16} /> : <MdClose size={16} />}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveModules}
                              disabled={saving}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                              title={t('save', 'Enregistrer')}
                            >
                              {saving ? '...' : <MdSave size={18} />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                              title={t('cancel', 'Annuler')}
                            >
                              <MdClose size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(church)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                          >
                            {t('edit', 'Modifier')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredChurches.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            {t('no_churches_found', 'Aucune église trouvée')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <p className="text-gray-400 text-sm">
          <strong className="text-gray-300">{t('note', 'Note')}:</strong>{' '}
          {t('modules.info', 'Lorsque vous désactivez un module, les administrateurs et membres de l\'église ne pourront plus y accéder. Les données ne sont pas supprimées et seront accessibles si le module est réactivé.')}
        </p>
      </div>
    </div>
  );
}

export default SuperAdminModulesPage;
