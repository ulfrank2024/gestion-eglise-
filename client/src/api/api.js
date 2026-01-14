import axios from 'axios';

// Crée une instance d'Axios avec une configuration de base
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api', // URL de base pour toutes les requêtes
});

// Intercepteur de requêtes pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const tokenString = localStorage.getItem('supabase.auth.token');
    if (tokenString) {
      try {
        const token = JSON.parse(tokenString);
        config.headers.Authorization = `Bearer ${token.access_token}`;
      } catch (e) {
        console.error("Error parsing auth token:", e);
        localStorage.removeItem('supabase.auth.token');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponses pour gérer les erreurs, notamment 401 (Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Session expired or unauthorized. Logging out.');
      localStorage.removeItem('supabase.auth.token');
      // Rediriger vers la page de connexion appropriée.
      // On vérifie si on est dans le contexte super-admin ou admin.
      if (window.location.pathname.startsWith('/super-admin')) {
        window.location.href = '/super-admin/login'; 
      } else {
        window.location.href = '/admin/login'; 
      }
    }
    return Promise.reject(error);
  }
);

// --- Définition de l'objet API ---

export const api = {
  auth: {
    login: async (credentials) => {
      const { data } = await apiClient.post('/auth/login', credentials);
      return data;
    },
    logout: async () => {
      const { data } = await apiClient.post('/auth/logout');
      return data;
    },
    me: async () => {
      const { data } = await apiClient.get('/auth/me');
      return data;
    },
  },
  
  superAdmin: {
    // --- Churches ---
    listChurches: async () => {
      const { data } = await apiClient.get('/super-admin/churches_v2'); // Utilise la table churches_v2
      return data;
    },
    createChurch: async (churchData) => {
      const { data } = await apiClient.post('/super-admin/churches_v2', churchData);
      return data;
    },
    getChurch: async (churchId) => { 
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}`);
      return data;
    },
    updateChurch: async (churchId, churchData) => { 
      const { data } = await apiClient.put(`/super-admin/churches_v2/${churchId}`, churchData);
      return data;
    },
    deleteChurch: async (churchId) => { 
      await apiClient.delete(`/super-admin/churches_v2/${churchId}`);
    },
    // --- Events ---
    listEventsByChurch: async (churchId) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/events`);
      return data;
    },
    // --- Invitations ---
    inviteChurch: async (email) => {
      const { data } = await apiClient.post('/super-admin/churches_v2/invite', { email });
      return data;
    },
    // --- Statistics ---
    getPlatformStatistics: async () => {
      const { data } = await apiClient.get('/super-admin/statistics');
      return data;
    },
    getChurchStatistics: async (churchId) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/statistics`);
      return data;
    },
    // --- Church Users ---
    getChurchUsers: async (churchId) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/users`);
      return data;
    },
  },

  admin: {
    // --- Events ---
    listEvents: async (isArchived) => {
        const params = isArchived !== undefined ? { is_archived: isArchived } : {};
        const { data } = await apiClient.get('/admin/events_v2', { params });
        return data;
    },
    createEvent: async (eventData) => {
        const { data } = await apiClient.post('/admin/events_v2', eventData);
        return data;
    },
    getEventDetails: async (id) => {
        const { data } = await apiClient.get(`/admin/events_v2/${id}`);
        return data;
    },
    updateEvent: async (id, eventData) => {
        const { data } = await apiClient.put(`/admin/events_v2/${id}`, eventData);
        return data;
    },
    deleteEvent: async (id) => {
        await apiClient.delete(`/admin/events_v2/${id}`);
    },
    getCheckinQRCode: async (id) => {
        const { data } = await apiClient.get(`/admin/events_v2/${id}/qrcode-checkin`);
        return data;
    },
    listAttendees: async (eventId) => {
        const { data } = await apiClient.get(`/admin/events_v2/${eventId}/attendees`);
        return data;
    },
    sendThankYouEmails: async (eventId, emailData) => {
        await apiClient.post(`/admin/events_v2/${eventId}/send-thanks`, emailData);
    },
    // --- Form Fields ---
    getEventFormFields: async (eventId) => {
        const { data } = await apiClient.get(`/admin/events_v2/${eventId}/form-fields`);
        return data;
    },
    createFormField: async (eventId, fieldData) => {
        const { data } = await apiClient.post(`/admin/events_v2/${eventId}/form-fields`, fieldData);
        return data;
    },
    updateFormField: async (fieldId, fieldData) => {
        const { data } = await apiClient.put(`/admin/form-fields_v2/${fieldId}`, fieldData);
        return data;
    },
    deleteFormField: async (fieldId) => {
        await apiClient.delete(`/admin/form-fields_v2/${fieldId}`);
    },
    getEventStatistics: async (id) => {
        const { data } = await apiClient.get(`/admin/events_v2/${id}/statistics`);
        return data;
    },
    getChurchDetails: async (churchId) => {
      const { data } = await apiClient.get(`/church-admin/churches_v2/${churchId}/settings`);
      return data;
    },
    updateChurchSettings: async (churchId, churchData) => {
      const { data } = await apiClient.put(`/church-admin/churches_v2/${churchId}/settings`, churchData);
      return data;
    },
    listChurchUsers: async (churchId) => {
      const { data } = await apiClient.get(`/church-admin/churches_v2/${churchId}/users`);
      return data;
    },
    inviteChurchUser: async (churchId, userData) => {
      const { data } = await apiClient.post(`/church-admin/churches_v2/${churchId}/users`, userData);
      return data;
    },
    updateChurchUserRole: async (churchId, userId, newRole) => {
      const { data } = await apiClient.put(`/church-admin/churches_v2/${churchId}/users/${userId}`, { role: newRole });
      return data;
    },
    removeChurchUser: async (churchId, userId) => {
      await apiClient.delete(`/church-admin/churches_v2/${churchId}/users/${userId}`);
    },
  },

  public: {
    listEvents: async (churchId) => {
      const { data } = await apiClient.get(`/public/${churchId}/events`);
      return data;
    },
    getEventDetails: async (churchId, id) => {
      const { data } = await apiClient.get(`/public/${churchId}/events/${id}`);
      return data;
    },
    getEventFormFields: async (churchId, eventId) => {
      const { data } = await apiClient.get(`/public/${churchId}/events/${eventId}/form-fields`);
      return data;
    },
    registerAttendee: async (churchId, eventId, payload) => {
      const { data } = await apiClient.post(`/public/${churchId}/events/${eventId}/register`, payload);
      return data;
    },
    registerChurch: async (registrationData) => {
      const { data } = await apiClient.post('/public/churches/register', registrationData);
      return data;
    },
  },
};