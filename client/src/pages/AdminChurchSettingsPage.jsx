import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/api'; // Utiliser notre objet api
import { useNavigate } from 'react-router-dom'; // Pour la redirection

function AdminChurchSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [churchSettings, setChurchSettings] = useState({
    name: '',
    subdomain: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [churchId, setChurchId] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const storedToken = localStorage.getItem('supabase.auth.token');
        let parsedUser = null;
        if (storedToken) {
            try {
                parsedUser = JSON.parse(storedToken).user;
            } catch (e) {
                console.error("Error parsing user token:", e);
                setError(t('error_loading_user_data'));
                setLoading(false);
                navigate('/admin/login');
                return;
            }
        }
        
        const currentChurchId = parsedUser?.user_metadata?.church_id;
        if (!currentChurchId) {
            setError(t('error_loading_user_data'));
            setLoading(false);
            navigate('/admin/login');
            return;
        }
        setChurchId(currentChurchId);

        const data = await api.admin.getChurchDetails(currentChurchId);
        setChurchSettings(data);
        
      } catch (err) {
        console.error('Error fetching church settings:', err);
        setError(err.response?.data?.error || err.message || t('error_fetching_church_settings'));
        navigate('/admin/login'); // Redirect to login on error
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [t, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChurchSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setError(null);
    if (!churchId) {
        setError(t('error_church_id_missing'));
        return;
    }

    try {
      await api.admin.updateChurchSettings(churchId, churchSettings);
      setSuccessMessage(t('church_settings_updated_successfully'));
    } catch (err) {
      console.error('Error updating church settings:', err);
      setError(err.response?.data?.error || err.message || t('error_updating_church_settings'));
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
          <label htmlFor="name">{t('super_admin_dashboard.church_name')}</label>
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
          <label htmlFor="subdomain">{t('super_admin_dashboard.subdomain')}</label>
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
