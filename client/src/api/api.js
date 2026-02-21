import axios from 'axios';

// Crée une instance d'Axios avec une configuration de base
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api', // URL de base pour toutes les requêtes
});

// Intercepteur de requêtes pour ajouter le token d'authentification et éviter le cache
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
    // Ajouter les headers no-cache pour éviter les problèmes de réponses 304 vides
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponses pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Erreur réseau (pas de connexion, serveur injoignable)
    if (!error.response) {
      // On enrichit l'erreur avec un message friendly mais on laisse la page gérer
      error.isNetworkError = true;
      return Promise.reject(error);
    }

    const status = error.response.status;

    // 401 → déconnexion et redirection vers login
    if (status === 401) {
      localStorage.removeItem('supabase.auth.token');
      const path = window.location.pathname;
      if (path.startsWith('/super-admin')) {
        window.location.href = '/super-admin/login';
      } else if (path.startsWith('/member')) {
        window.location.href = '/member/login';
      } else {
        window.location.href = '/admin/login';
      }
    }

    // 403 account_blocked côté membre → déconnexion
    if (
      status === 403 &&
      error.response.data?.error === 'account_blocked' &&
      error.config?.url?.includes('/member/')
    ) {
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/member/login?blocked=1';
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
    forgotPassword: async ({ email, userType, language }) => {
      const { data } = await apiClient.post('/auth/forgot-password', { email, userType, language });
      return data;
    },
    resetPassword: async ({ email, token, newPassword }) => {
      const { data } = await apiClient.post('/auth/reset-password', { email, token, newPassword });
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
    // --- Members (Supervision) ---
    getMembersStatistics: async () => {
      const { data } = await apiClient.get('/super-admin/members/statistics');
      return data;
    },
    getChurchMembers: async (churchId, params = {}) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/members`, { params });
      return data;
    },
    getChurchMembersStatistics: async (churchId) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/members/statistics`);
      return data;
    },
    // --- Activity Tracking ---
    getActivitySummary: async (days = 30) => {
      const { data } = await apiClient.get('/super-admin/activity/summary', { params: { days } });
      return data;
    },
    getActivityByChurches: async (days = 30, limit = 50) => {
      const { data } = await apiClient.get('/super-admin/activity/churches', { params: { days, limit } });
      return data;
    },
    getActivityByUsers: async (days = 30, limit = 50, churchId = null) => {
      const params = { days, limit };
      if (churchId) params.church_id = churchId;
      const { data } = await apiClient.get('/super-admin/activity/users', { params });
      return data;
    },
    getActivityLogs: async (params = {}) => {
      const { data } = await apiClient.get('/super-admin/activity/logs', { params });
      return data;
    },

    // --- Church Suspension ---
    suspendChurch: async (churchId, { reason, message, language }) => {
      const { data } = await apiClient.put(`/super-admin/churches_v2/${churchId}/suspend`, { reason, message, language });
      return data;
    },
    reactivateChurch: async (churchId, { message, language }) => {
      const { data } = await apiClient.put(`/super-admin/churches_v2/${churchId}/reactivate`, { message, language });
      return data;
    },
    contactChurchAdmin: async (churchId, { subject, message, language }) => {
      const { data } = await apiClient.post(`/super-admin/churches_v2/${churchId}/contact`, { subject, message, language });
      return data;
    },

    // --- Church Modules Management ---
    getChurchModules: async (churchId) => {
      const { data } = await apiClient.get(`/super-admin/churches_v2/${churchId}/modules`);
      return data;
    },
    updateChurchModules: async (churchId, { enabled_modules, notify_admin, language }) => {
      const { data } = await apiClient.put(`/super-admin/churches_v2/${churchId}/modules`, { enabled_modules, notify_admin, language });
      return data;
    },
    getModulesOverview: async () => {
      const { data } = await apiClient.get('/super-admin/modules/overview');
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
    getCheckinEntries: async (eventId) => {
        const { data } = await apiClient.get(`/admin/events/${eventId}/checkin-entries`);
        return data;
    },
    listAttendees: async (eventId) => {
        const { data } = await apiClient.get(`/admin/events_v2/${eventId}/attendees`);
        return data;
    },
    listAllAttendees: async () => {
        const { data } = await apiClient.get('/admin/attendees_v2');
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
        const { data } = await apiClient.put(`/admin/form-fields/${fieldId}`, fieldData);
        return data;
    },
    deleteFormField: async (fieldId) => {
        await apiClient.delete(`/admin/form-fields/${fieldId}`);
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
    updateChurchUser: async (churchId, userId, userData) => {
      const { data } = await apiClient.put(`/church-admin/churches_v2/${churchId}/users/${userId}`, userData);
      return data;
    },
    removeChurchUser: async (churchId, userId) => {
      await apiClient.delete(`/church-admin/churches_v2/${churchId}/users/${userId}`);
    },

    // --- Activity Logs ---
    getActivityLogs: async (churchId, params = {}) => {
      const { data } = await apiClient.get(`/church-admin/churches_v2/${churchId}/activity-logs`, { params });
      return data;
    },

    // --- Admin Profile ---
    getAdminProfile: async () => {
      const { data } = await apiClient.get('/church-admin/profile');
      return data;
    },
    updateAdminProfile: async (profileData) => {
      const { data } = await apiClient.put('/church-admin/profile', profileData);
      return data;
    },
    uploadProfilePhoto: async (file) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await apiClient.post('/church-admin/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },

    // --- Members ---
    getMembers: async (params = {}) => {
      const { data } = await apiClient.get('/admin/members', { params });
      return data;
    },
    getMember: async (memberId) => {
      const { data } = await apiClient.get(`/admin/members/${memberId}`);
      return data;
    },
    createMember: async (memberData) => {
      const { data } = await apiClient.post('/admin/members', memberData);
      return data;
    },
    updateMember: async (memberId, memberData) => {
      const { data } = await apiClient.put(`/admin/members/${memberId}`, memberData);
      return data;
    },
    archiveMember: async (memberId, isArchived) => {
      const { data } = await apiClient.put(`/admin/members/${memberId}/archive`, { is_archived: isArchived });
      return data;
    },
    blockMember: async (memberId, blocked) => {
      const { data } = await apiClient.put(`/admin/members/${memberId}/block`, { blocked });
      return data;
    },
    deleteMember: async (memberId) => {
      await apiClient.delete(`/admin/members/${memberId}`);
    },
    getMemberStatistics: async () => {
      const { data } = await apiClient.get('/admin/members/statistics');
      return data;
    },

    // --- Roles ---
    getRoles: async () => {
      const { data } = await apiClient.get('/admin/roles');
      return data;
    },
    getRole: async (roleId) => {
      const { data } = await apiClient.get(`/admin/roles/${roleId}`);
      return data;
    },
    createRole: async (roleData) => {
      const { data } = await apiClient.post('/admin/roles', roleData);
      return data;
    },
    updateRole: async (roleId, roleData) => {
      const { data } = await apiClient.put(`/admin/roles/${roleId}`, roleData);
      return data;
    },
    deleteRole: async (roleId) => {
      await apiClient.delete(`/admin/roles/${roleId}`);
    },
    assignRole: async (roleId, memberId) => {
      const { data } = await apiClient.post(`/admin/roles/${roleId}/assign/${memberId}`);
      return data;
    },
    unassignRole: async (roleId, memberId) => {
      await apiClient.delete(`/admin/roles/${roleId}/unassign/${memberId}`);
    },

    // --- Member Invitations ---
    getMemberInvitations: async () => {
      const { data } = await apiClient.get('/admin/member-invitations');
      return data;
    },
    inviteMember: async (inviteData) => {
      const { data } = await apiClient.post('/admin/member-invitations/invite', inviteData);
      return data;
    },
    getPublicRegistrationLink: async () => {
      const { data } = await apiClient.get('/admin/member-invitations/public-link');
      return data;
    },
    regeneratePublicLink: async () => {
      const { data } = await apiClient.put('/admin/member-invitations/public-link/regenerate');
      return data;
    },
    deleteMemberInvitation: async (invitationId) => {
      await apiClient.delete(`/admin/member-invitations/${invitationId}`);
    },

    // --- Announcements ---
    getAnnouncements: async (params = {}) => {
      const { data } = await apiClient.get('/admin/announcements', { params });
      return data;
    },
    getAnnouncement: async (announcementId) => {
      const { data } = await apiClient.get(`/admin/announcements/${announcementId}`);
      return data;
    },
    createAnnouncement: async (announcementData) => {
      const { data } = await apiClient.post('/admin/announcements', announcementData);
      return data;
    },
    updateAnnouncement: async (announcementId, announcementData) => {
      const { data } = await apiClient.put(`/admin/announcements/${announcementId}`, announcementData);
      return data;
    },
    publishAnnouncement: async (announcementId, isPublished) => {
      const { data } = await apiClient.put(`/admin/announcements/${announcementId}/publish`, { is_published: isPublished });
      return data;
    },
    deleteAnnouncement: async (announcementId) => {
      await apiClient.delete(`/admin/announcements/${announcementId}`);
    },

    // --- Notifications Admin ---
    getNotifications: async () => {
      const { data } = await apiClient.get('/admin/notifications');
      return data;
    },
    getNotificationStatistics: async () => {
      const { data } = await apiClient.get('/admin/notifications/statistics');
      return data;
    },
    sendNotification: async (notificationData) => {
      const { data } = await apiClient.post('/admin/notifications', notificationData);
      return data;
    },
    broadcastNotification: async (notificationData) => {
      const { data } = await apiClient.post('/admin/notifications/broadcast', notificationData);
      return data;
    },
    deleteNotification: async (notificationId) => {
      await apiClient.delete(`/admin/notifications/${notificationId}`);
    },

    // --- Notifications personnelles admin (cloche) ---
    getMyNotifications: async () => {
      const { data } = await apiClient.get('/admin/my-notifications');
      return data;
    },
    getMyNotificationsUnreadCount: async () => {
      const { data } = await apiClient.get('/admin/my-notifications/unread-count');
      return data;
    },
    markMyNotificationRead: async (id) => {
      const { data } = await apiClient.put(`/admin/my-notifications/${id}/read`);
      return data;
    },
    markAllMyNotificationsRead: async () => {
      const { data } = await apiClient.put('/admin/my-notifications/read-all');
      return data;
    },

    // --- Choir/Chorale ---
    // Managers (Responsables)
    getChoirManagers: async () => {
      const { data } = await apiClient.get('/admin/choir/managers');
      return data;
    },
    addChoirManager: async (managerData) => {
      const { data } = await apiClient.post('/admin/choir/managers', managerData);
      return data;
    },
    updateChoirManager: async (managerId, managerData) => {
      const { data } = await apiClient.put(`/admin/choir/managers/${managerId}`, managerData);
      return data;
    },
    removeChoirManager: async (managerId) => {
      await apiClient.delete(`/admin/choir/managers/${managerId}`);
    },

    // Choir Members (Choristes)
    getChoirMembers: async (params = {}) => {
      const { data } = await apiClient.get('/admin/choir/members', { params });
      return data;
    },
    getChoirMember: async (memberId) => {
      const { data } = await apiClient.get(`/admin/choir/members/${memberId}`);
      return data;
    },
    addChoirMember: async (memberData) => {
      const { data } = await apiClient.post('/admin/choir/members', memberData);
      return data;
    },
    updateChoirMember: async (memberId, memberData) => {
      const { data } = await apiClient.put(`/admin/choir/members/${memberId}`, memberData);
      return data;
    },
    removeChoirMember: async (memberId) => {
      await apiClient.delete(`/admin/choir/members/${memberId}`);
    },
    getChoirStatistics: async () => {
      const { data } = await apiClient.get('/admin/choir/members/statistics');
      return data;
    },

    // Song Categories
    getSongCategories: async () => {
      const { data } = await apiClient.get('/admin/choir/categories');
      return data;
    },
    createSongCategory: async (categoryData) => {
      const { data } = await apiClient.post('/admin/choir/categories', categoryData);
      return data;
    },
    updateSongCategory: async (categoryId, categoryData) => {
      const { data } = await apiClient.put(`/admin/choir/categories/${categoryId}`, categoryData);
      return data;
    },
    deleteSongCategory: async (categoryId) => {
      await apiClient.delete(`/admin/choir/categories/${categoryId}`);
    },

    // Songs (Répertoire)
    getSongs: async (params = {}) => {
      const { data } = await apiClient.get('/admin/choir/songs', { params });
      return data;
    },
    getSong: async (songId) => {
      const { data } = await apiClient.get(`/admin/choir/songs/${songId}`);
      return data;
    },
    createSong: async (songData) => {
      const { data } = await apiClient.post('/admin/choir/songs', songData);
      return data;
    },
    updateSong: async (songId, songData) => {
      const { data } = await apiClient.put(`/admin/choir/songs/${songId}`, songData);
      return data;
    },
    deleteSong: async (songId) => {
      await apiClient.delete(`/admin/choir/songs/${songId}`);
    },

    // Choriste Repertoire (Chants qu'un lead peut diriger)
    getChoristeRepertoire: async (choirMemberId) => {
      const { data } = await apiClient.get(`/admin/choir/members/${choirMemberId}/repertoire`);
      return data;
    },
    addSongToRepertoire: async (choirMemberId, songId, repertoireData = {}) => {
      const { data } = await apiClient.post(`/admin/choir/members/${choirMemberId}/repertoire`, { song_id: songId, ...repertoireData });
      return data;
    },
    updateRepertoireSong: async (repertoireId, repertoireData) => {
      const { data } = await apiClient.put(`/admin/choir/repertoire/${repertoireId}`, repertoireData);
      return data;
    },
    removeSongFromRepertoire: async (repertoireId) => {
      await apiClient.delete(`/admin/choir/repertoire/${repertoireId}`);
    },

    // Planning
    getChoirPlannings: async (params = {}) => {
      const { data } = await apiClient.get('/admin/choir/planning', { params });
      return data;
    },
    getChoirPlanning: async (planningId) => {
      const { data } = await apiClient.get(`/admin/choir/planning/${planningId}`);
      return data;
    },
    createChoirPlanning: async (planningData) => {
      const { data } = await apiClient.post('/admin/choir/planning', planningData);
      return data;
    },
    updateChoirPlanning: async (planningId, planningData) => {
      const { data } = await apiClient.put(`/admin/choir/planning/${planningId}`, planningData);
      return data;
    },
    deleteChoirPlanning: async (planningId) => {
      await apiClient.delete(`/admin/choir/planning/${planningId}`);
    },

    // Planning Songs (Chants dans un planning)
    getPlanninsongsAsync: async (planningId) => {
      const { data } = await apiClient.get(`/admin/choir/planning/${planningId}/songs`);
      return data;
    },
    addSongToPlanning: async (planningId, songData) => {
      const { data } = await apiClient.post(`/admin/choir/planning/${planningId}/songs`, songData);
      return data;
    },
    updatePlanningSong: async (planningSongId, songData) => {
      const { data } = await apiClient.put(`/admin/choir/planning-songs/${planningSongId}`, songData);
      return data;
    },
    removeSongFromPlanning: async (planningSongId) => {
      await apiClient.delete(`/admin/choir/planning-songs/${planningSongId}`);
    },

    // Planning Participants (Choristes participant à un événement)
    getPlanningParticipants: async (planningId) => {
      const { data } = await apiClient.get(`/admin/choir/planning/${planningId}/participants`);
      return data;
    },
    addPlanningParticipants: async (planningId, choirMemberIds) => {
      const { data } = await apiClient.post(`/admin/choir/planning/${planningId}/participants`, {
        choir_member_ids: choirMemberIds
      });
      return data;
    },
    updatePlanningParticipant: async (participantId, participantData) => {
      const { data } = await apiClient.put(`/admin/choir/planning-participants/${participantId}`, participantData);
      return data;
    },
    removePlanningParticipant: async (participantId) => {
      await apiClient.delete(`/admin/choir/planning-participants/${participantId}`);
    },
    clearPlanningParticipants: async (planningId, exceptIds = []) => {
      await apiClient.delete(`/admin/choir/planning/${planningId}/participants`, {
        data: { except_ids: exceptIds }
      });
    },

    // Compilations / Medleys
    getCompilations: async () => {
      const { data } = await apiClient.get('/admin/choir/compilations');
      return data;
    },
    getCompilation: async (compilationId) => {
      const { data } = await apiClient.get(`/admin/choir/compilations/${compilationId}`);
      return data;
    },
    createCompilation: async (compilationData) => {
      const { data } = await apiClient.post('/admin/choir/compilations', compilationData);
      return data;
    },
    updateCompilation: async (compilationId, compilationData) => {
      const { data } = await apiClient.put(`/admin/choir/compilations/${compilationId}`, compilationData);
      return data;
    },
    deleteCompilation: async (compilationId) => {
      await apiClient.delete(`/admin/choir/compilations/${compilationId}`);
    },
    addSongToCompilation: async (compilationId, songData) => {
      const { data } = await apiClient.post(`/admin/choir/compilations/${compilationId}/songs`, songData);
      return data;
    },
    reorderCompilationSongs: async (compilationId, songOrder) => {
      const { data } = await apiClient.put(`/admin/choir/compilations/${compilationId}/songs/reorder`, {
        song_order: songOrder
      });
      return data;
    },
    removeSongFromCompilation: async (compilationSongId) => {
      await apiClient.delete(`/admin/choir/compilation-songs/${compilationSongId}`);
    },
    addCompilationToPlanning: async (planningId, compilationData) => {
      const { data } = await apiClient.post(`/admin/choir/planning/${planningId}/compilations`, compilationData);
      return data;
    },

    // --- Meetings (Réunions) ---
    getMeetings: async (params = '') => {
      const { data } = await apiClient.get(`/admin/meetings${params}`);
      return data;
    },
    getMeetingParticipantPool: async () => {
      const { data } = await apiClient.get('/admin/meetings/participant-pool');
      return data;
    },
    getMeeting: async (meetingId) => {
      const { data } = await apiClient.get(`/admin/meetings/${meetingId}`);
      return data;
    },
    createMeeting: async (meetingData) => {
      const { data } = await apiClient.post('/admin/meetings', meetingData);
      return data;
    },
    updateMeeting: async (meetingId, meetingData) => {
      const { data } = await apiClient.put(`/admin/meetings/${meetingId}`, meetingData);
      return data;
    },
    deleteMeeting: async (meetingId) => {
      await apiClient.delete(`/admin/meetings/${meetingId}`);
    },
    // Meeting Participants
    getMeetingParticipants: async (meetingId) => {
      const { data } = await apiClient.get(`/admin/meetings/${meetingId}/participants`);
      return data;
    },
    addMeetingParticipants: async (meetingId, participantsData) => {
      const { data } = await apiClient.post(`/admin/meetings/${meetingId}/participants`, participantsData);
      return data;
    },
    updateMeetingParticipant: async (meetingId, participantId, participantData) => {
      const { data } = await apiClient.put(`/admin/meetings/${meetingId}/participants/${participantId}`, participantData);
      return data;
    },
    removeMeetingParticipant: async (meetingId, participantId) => {
      await apiClient.delete(`/admin/meetings/${meetingId}/participants/${participantId}`);
    },
    sendMeetingReport: async (meetingId, reportData) => {
      const { data } = await apiClient.post(`/admin/meetings/${meetingId}/send-report`, reportData);
      return data;
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
      const isFormData = registrationData instanceof FormData;
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const { data } = await apiClient.post('/public/churches/register', registrationData, config);
      return data;
    },
    // --- Member Registration ---
    validateMemberInvitation: async (churchId, token) => {
      const { data } = await apiClient.get(`/public/${churchId}/join/validate-token/${token}`);
      return data;
    },
    validatePublicRegistrationLink: async (churchId, ref) => {
      const { data } = await apiClient.get(`/public/${churchId}/join/validate-link`, { params: { ref } });
      return data;
    },
    registerMember: async (churchId, memberData) => {
      const { data } = await apiClient.post(`/public/${churchId}/members/register`, memberData);
      return data;
    },
    uploadRegistrationPhoto: async (file) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await apiClient.post('/public/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    submitCheckin: async (churchId, eventId, formData) => {
      const { data } = await apiClient.post(`/public/${churchId}/checkin/${eventId}`, formData);
      return data;
    },
  },

  member: {
    // Dashboard membre
    getDashboard: async () => {
      const { data } = await apiClient.get('/member/dashboard');
      return data;
    },
    getProfile: async () => {
      const { data } = await apiClient.get('/member/profile');
      return data;
    },
    updateProfile: async (profileData) => {
      const { data } = await apiClient.put('/member/profile', profileData);
      return data;
    },
    getEvents: async () => {
      const { data } = await apiClient.get('/member/events');
      return data;
    },
    getParticipatedEvents: async () => {
      const { data } = await apiClient.get('/member/events/participated');
      return data;
    },
    uploadProfilePhoto: async (file) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await apiClient.post('/member/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    getRoles: async () => {
      const { data } = await apiClient.get('/member/roles');
      return data;
    },
    getNotifications: async () => {
      const { data } = await apiClient.get('/member/notifications');
      return data;
    },
    getNotificationsUnreadCount: async () => {
      const { data } = await apiClient.get('/member/notifications/unread-count');
      return data;
    },
    markNotificationRead: async (notificationId) => {
      await apiClient.put(`/member/notifications/${notificationId}/read`);
    },
    markAllNotificationsRead: async () => {
      await apiClient.put('/member/notifications/read-all');
    },
    getAnnouncements: async () => {
      const { data } = await apiClient.get('/member/announcements');
      return data;
    },
    // Member Meetings
    getMeetings: async () => {
      const { data } = await apiClient.get('/member/meetings');
      return data;
    },

    // =====================================================
    // MEMBER CHOIR - Espace Chorale pour les membres
    // =====================================================

    // Statut chorale du membre
    getChoirStatus: async () => {
      const { data } = await apiClient.get('/member/choir/status');
      return data;
    },

    // Dashboard chorale
    getChoirDashboard: async () => {
      const { data } = await apiClient.get('/member/choir/dashboard');
      return data;
    },

    // Mon répertoire (chants que je peux diriger)
    getChoirRepertoire: async () => {
      const { data } = await apiClient.get('/member/choir/repertoire');
      return data;
    },

    // Ajouter un chant à mon répertoire
    addToChoirRepertoire: async (songData) => {
      const { data } = await apiClient.post('/member/choir/repertoire', songData);
      return data;
    },

    // Mettre à jour un chant de mon répertoire
    updateChoirRepertoire: async (id, updateData) => {
      const { data } = await apiClient.put(`/member/choir/repertoire/${id}`, updateData);
      return data;
    },

    // Retirer un chant de mon répertoire
    deleteChoirRepertoire: async (id) => {
      await apiClient.delete(`/member/choir/repertoire/${id}`);
    },

    // Liste des chants disponibles
    getChoirSongs: async (params = {}) => {
      const { data } = await apiClient.get('/member/choir/songs', { params });
      return data;
    },

    // Créer un nouveau chant
    createChoirSong: async (songData) => {
      const { data } = await apiClient.post('/member/choir/songs', songData);
      return data;
    },

    // Détails d'un chant
    getChoirSong: async (songId) => {
      const { data } = await apiClient.get(`/member/choir/songs/${songId}`);
      return data;
    },

    // Catégories de chants
    getChoirCategories: async () => {
      const { data } = await apiClient.get('/member/choir/categories');
      return data;
    },

    // Planning musical
    getChoirPlanning: async (filter = 'upcoming') => {
      const { data } = await apiClient.get('/member/choir/planning', { params: { filter } });
      return data;
    },

    // Détails d'un planning
    getChoirPlanningDetail: async (planningId) => {
      const { data } = await apiClient.get(`/member/choir/planning/${planningId}`);
      return data;
    },

    // Compilations
    getChoirCompilations: async () => {
      const { data } = await apiClient.get('/member/choir/compilations');
      return data;
    },
  },
};