import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useTranslation } from 'react-i18next';

const SuperAdminDashboardPage = () => {
  const { t } = useTranslation();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChurches = async () => {
      try {
        const data = await api.superAdmin.listChurches();
        setChurches(data);
      } catch (err) {
        setError(t('super_admin_dashboard.error_loading_churches'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchChurches();
  }, [t]);

  if (loading) {
    return <div>{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('super_admin_dashboard.title')}</h1>
      
      {/* TODO: Add button to create a new church */}
      {/* TODO: Add stats overview */}

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('super_admin_dashboard.church_name')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('super_admin_dashboard.subdomain')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('super_admin_dashboard.created_at')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-300"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {churches.map((church) => (
              <tr key={church.id}>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                  {church.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                  {church.subdomain}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                  {new Date(church.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right border-b border-gray-200 text-sm font-medium">
                  {/* TODO: Add edit/delete buttons */}
                  <a href="#" className="text-indigo-600 hover:text-indigo-900">
                    {t('super_admin_dashboard.edit')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
