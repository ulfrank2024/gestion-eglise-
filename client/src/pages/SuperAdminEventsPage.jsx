import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api';
import { useNavigate } from 'react-router-dom';

const SuperAdminEventsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChurches = async () => {
      try {
        const data = await api.superAdmin.listChurches(); // Récupérer toutes les églises
        setChurches(data);
      } catch (err) {
        setError(t('super_admin_dashboard.error_loading_churches'));
        console.error('Error fetching churches for events page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChurches();
  }, [t]);

  if (loading) {
    return <div className="text-center p-4 text-gray-300">{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-center p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">{t('events_management')}</h1>

      {churches.length === 0 ? (
        <p className="text-gray-400">{t('no_churches_yet')}</p>
      ) : (
        <div className="space-y-6">
          {churches.map((church) => (
            <div key={church.id} className="bg-gray-800 shadow-md rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">{church.name}</h2>
                <button
                  onClick={() => navigate(`/super-admin/events/${church.id}`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  {t('view_events')} {/* Assurez-vous d'avoir cette traduction */}
                </button>
              </div>
              {/* Ici, on pourrait afficher un résumé des événements ou juste le bouton */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminEventsPage;
