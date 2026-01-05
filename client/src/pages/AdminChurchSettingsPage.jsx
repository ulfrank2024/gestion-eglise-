import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
// import { useNavigate } from 'react-router-dom'; // Supprimé car non utilisé

function AdminChurchSettingsPage() {
  const { t } = useTranslation();
  // const navigate = useNavigate(); // Supprimé
  const [churchSettings, setChurchSettings] = useState({
    name: '',
    subdomain: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchChurchSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
          setError('Authentication token not found.');
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/admin/church-settings', { // TODO: Créer cet endpoint GET
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChurchSettings(response.data);
      } catch (err) {
        console.error('Error fetching church settings:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch church settings');
      } finally {
        setLoading(false);
      }
    };

    fetchChurchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChurchSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setError(null);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        setError('Authentication token not found.');
        return;
      }

      await axios.put('/api/admin/church-settings', churchSettings, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccessMessage(t('church_settings_updated_successfully'));
    } catch (err) {
      console.error('Error updating church settings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update church settings');
    }
  };

  if (loading) return <div>{t('loading')}...</div>;
  if (error) return <div>{t('error')}: {error}</div>;

  return (
    <div className="admin-church-settings-page">
      <h2>{t('church_settings')}</h2>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">{t('church_name')}</label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            value={churchSettings.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="subdomain">{t('subdomain')}</label>
          <input
            type="text"
            className="form-control"
            id="subdomain"
            name="subdomain"
            value={churchSettings.subdomain}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="logo_url">{t('logo_url')}</label>
          <input
            type="text"
            className="form-control"
            id="logo_url"
            name="logo_url"
            value={churchSettings.logo_url}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="btn btn-primary">{t('update_settings')}</button>
      </form>
    </div>
  );
}

export default AdminChurchSettingsPage;
