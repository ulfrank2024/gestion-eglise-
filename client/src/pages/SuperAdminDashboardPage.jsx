import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useTranslation } from 'react-i18next';
import CreateChurchModal from '../components/CreateChurchModal';
import EditChurchModal from '../components/EditChurchModal';
import DeleteChurchModal from '../components/DeleteChurchModal';

const SuperAdminDashboardPage = () => {
  const { t } = useTranslation();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const handleChurchCreated = (newChurch) => {
    setChurches([newChurch, ...churches]);
  };

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
    return <div>{t('loading')}...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('super_admin_dashboard.title')}</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          {t('create_new_church')}
        </button>
      </div>

      <CreateChurchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onChurchCreated={handleChurchCreated}
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
                  <button
                    onClick={() => openEditModal(church)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    {t('super_admin_dashboard.edit')}
                  </button>
                  <button
                    onClick={() => openDeleteModal(church)}
                    className="text-red-600 hover:text-red-900"
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

export default SuperAdminDashboardPage;
