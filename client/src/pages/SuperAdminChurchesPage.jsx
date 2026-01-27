import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import { MdVisibility } from 'react-icons/md';
import InviteChurchModal from '../components/InviteChurchModal';
import EditChurchModal from '../components/EditChurchModal';
import DeleteChurchModal from '../components/DeleteChurchModal';

const SuperAdminChurchesPage = () => {
  const { t } = useTranslation();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [churchToEdit, setChurchToEdit] = useState(null);
  const [churchToDelete, setChurchToDelete] = useState(null);

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

  const handleChurchUpdated = (updatedChurch) => {
    setChurches(
      churches.map((c) => (c.id === updatedChurch.id ? updatedChurch : c))
    );
  };

  const openEditModal = (church) => {
    setChurchToEdit(church);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setChurchToEdit(null);
    setIsEditModalOpen(false);
  };

  const openDeleteModal = (church) => {
    setChurchToDelete(church);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setChurchToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteChurch = async () => {
    if (!churchToDelete) return;
    try {
      await api.superAdmin.deleteChurch(churchToDelete.id);
      setChurches(churches.filter((c) => c.id !== churchToDelete.id));
      closeDeleteModal();
    } catch (err) {
      setError('Failed to delete church.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-gray-300">{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">{t('super_admin_dashboard.title')}</h1>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          {t('invite_new_church')}
        </button>
      </div>

      <InviteChurchModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <EditChurchModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onChurchUpdated={handleChurchUpdated}
        church={churchToEdit}
      />

      <DeleteChurchModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteChurch}
        churchName={churchToDelete?.name}
      />

      <div className="bg-gray-800 shadow-md rounded my-6 border border-gray-700">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.logo')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.church_name')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.subdomain')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.location')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.email')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.phone')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {t('super_admin_dashboard.created_at')}
              </th>
              <th className="px-6 py-3 border-b-2 border-gray-600"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-800">
            {churches.map((church) => (
              <tr key={church.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700">
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                    {church.logo_url ? (
                      <img src={church.logo_url} alt="Logo" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">{church.name ? church.name.charAt(0).toUpperCase() : '?'}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {church.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {church.subdomain}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {church.location || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {church.email || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {church.phone || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-700 text-gray-300">
                  {new Date(church.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right border-b border-gray-700 text-sm font-medium">
                  <Link
                    to={`/super-admin/churches/${church.id}`}
                    className="text-emerald-400 hover:text-emerald-300 mr-4 inline-flex items-center"
                  >
                    <MdVisibility className="mr-1" />
                    {t('view_details')}
                  </Link>
                  <button
                    onClick={() => openEditModal(church)}
                    className="text-indigo-400 hover:text-indigo-300 mr-4"
                  >
                    {t('super_admin_dashboard.edit')}
                  </button>
                  <button
                    onClick={() => openDeleteModal(church)}
                    className="text-red-400 hover:text-red-300"
                  >
                    {t('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminChurchesPage;
