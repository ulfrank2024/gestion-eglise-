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
  },
  
  superAdmin: {
    // --- Churches ---
    listChurches: async () => {
      const { data } = await apiClient.get('/super-admin/churches');
      return data;
    },
    createChurch: async (churchData) => {
      const { data } = await apiClient.post('/super-admin/churches', churchData);
      return data;
    },
    getChurch: async (id) => {
      const { data } = await apiClient.get(`/super-admin/churches/${id}`);
      return data;
    },
    updateChurch: async (id, churchData) => {
      const { data } = await apiClient.put(`/super-admin/churches/${id}`, churchData);
      return data;
    },
    deleteChurch: async (id) => {
      await apiClient.delete(`/super-admin/churches/${id}`);
    },
  },

  admin: {
    // --- Events ---
    listEvents: async (isArchived) => {
        const params = isArchived !== undefined ? { is_archived: isArchived } : {};
        const { data } = await apiClient.get('/admin/events', { params });
        return data;
    },
    // ... autres fonctions pour les admins
  },

  public: {
    listEvents: async (churchId) => {
      const { data } = await apiClient.get(`/public/${churchId}/events`);
      return data;
    },
    // ... autres fonctions publiques
  },
};

