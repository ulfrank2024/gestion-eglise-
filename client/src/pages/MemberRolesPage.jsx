import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { MdBadge, MdPerson } from 'react-icons/md';

function MemberRolesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.member.getRoles();
        setRoles(data || []);
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  if (loading) {
    return <div className="text-gray-300">{t('loading')}...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MdBadge className="text-3xl text-green-400" />
        <h1 className="text-2xl font-bold text-white">{t('my_roles')}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Roles List */}
      {roles.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <MdBadge className="mx-auto text-6xl text-gray-600 mb-4" />
          <p className="text-gray-400">{t('no_assigned_roles')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Color Header */}
              <div
                className="h-2"
                style={{ backgroundColor: role.color || '#6366f1' }}
              />

              <div className="p-5">
                {/* Role Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${role.color || '#6366f1'}20` }}
                  >
                    <MdBadge
                      className="text-2xl"
                      style={{ color: role.color || '#6366f1' }}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {lang === 'fr' ? role.name_fr : role.name_en}
                    </h3>
                    {role.assigned_at && (
                      <p className="text-xs text-gray-500">
                        {t('member_since')} {new Date(role.assigned_at).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-US'
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {(role.description_fr || role.description_en) && (
                  <p className="text-sm text-gray-400">
                    {lang === 'fr' ? role.description_fr : role.description_en}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberRolesPage;
