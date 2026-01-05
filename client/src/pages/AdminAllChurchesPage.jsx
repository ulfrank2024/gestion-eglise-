import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { NavLink } from 'react-router-dom';

function AdminAllChurchesPage() {
  const { t } = useTranslation();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChurches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('supabase.auth.token'); // Assurez-vous que le token est stocké et récupéré correctement
        if (!token) {
          setError('Authentication token not found.');
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/super-admin/churches', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChurches(response.data);
      } catch (err) {
        console.error('Error fetching churches:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch churches');
      } finally {
        setLoading(false);
      }
    };

    fetchChurches();
  }, []);

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="admin-all-churches-page">
      <h2>{t('all_churches')}</h2>
      <button onClick={() => console.log('Naviguer vers la création d\'église')} className="btn btn-primary mb-3">
        {t('create_new_church')}
      </button>

      {churches.length === 0 ? (
        <p>{t('no_churches_yet')}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('church_name')}</th>
              <th>{t('subdomain')}</th>
              <th>{t('created_at')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {churches.map((church) => (
              <tr key={church.id}>
                <td>{church.name}</td>
                <td>{church.subdomain}</td>
                <td>{new Date(church.created_at).toLocaleDateString()}</td>
                <td>
                  <NavLink to={`/admin/churches/${church.id}`} className="btn btn-info btn-sm mr-2">
                    {t('view_details')}
                  </NavLink>
                  {/* Ajouter des boutons Modifier et Supprimer */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminAllChurchesPage;
