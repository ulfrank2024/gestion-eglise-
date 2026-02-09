require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de débogage pour toutes les requêtes entrantes
app.use((req, res, next) => {
  console.log('--- Nouvelle requête ---');
  console.log(`--> ${req.method} ${req.originalUrl}`);
  console.log('En-têtes:', JSON.stringify(req.headers, null, 2));
  
  res.on('finish', () => {
    console.log(`<-- ${res.statusCode} pour ${req.method} ${req.originalUrl}`);
    console.log('----------------------\n');
  });

  next();
});

// Importer le middleware de protection et isSuperAdmin
const { protect, isSuperAdmin, isSuperAdminOrChurchAdmin, isMember } = require('./middleware/auth');

// Importer les routeurs
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const churchAdminRoutes = require('./routes/churchAdminRoutes');
// Module Gestion des Membres
const memberRoutes = require('./routes/memberRoutes');
const roleRoutes = require('./routes/roleRoutes');
const memberInvitationRoutes = require('./routes/memberInvitationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const memberDashboardRoutes = require('./routes/memberDashboardRoutes');
// Module Gestion de la Chorale
const choirRoutes = require('./routes/choirRoutes');
// Module Gestion des Réunions
const meetingRoutes = require('./routes/meetingRoutes');
// Routes Chorale pour les Membres
const memberChoirRoutes = require('./routes/memberChoirRoutes');

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_BASE_URL // L'URL de production du frontend
].filter(Boolean); // Retire les entrées vides si une variable n'est pas définie

// whitelist Vercel preview domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.includes('vercel.app')) {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  }
  next();
});


app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Utilisation des routes
app.use('/api/auth', authRoutes);       // Routes pour le login/logout
app.use('/api/public', publicRoutes);   // Routes publiques (détails d'événement, inscription)
app.use('/api/admin', protect, isSuperAdminOrChurchAdmin, adminRoutes); // Routes d'administration (CRUD événements, gestion participants)
app.use('/api/super-admin', protect, isSuperAdmin, superAdminRoutes); // Routes Super-Admin
app.use('/api/church-admin', protect, churchAdminRoutes); // Routes Admin d'Église
// Routes du module Gestion des Membres
app.use('/api/admin/members', memberRoutes); // CRUD membres
app.use('/api/admin/roles', roleRoutes); // CRUD rôles
app.use('/api/admin/member-invitations', memberInvitationRoutes); // Invitations membres
app.use('/api/admin/announcements', announcementRoutes); // Annonces
app.use('/api/admin/notifications', notificationRoutes); // Notifications admin
app.use('/api/member', memberDashboardRoutes); // Dashboard membre
app.use('/api/member/choir', memberChoirRoutes); // Routes chorale pour les membres
// Routes du module Gestion de la Chorale
app.use('/api/admin/choir', choirRoutes); // Gestion chorale (managers, choristes, planning, répertoire)
// Routes du module Gestion des Réunions
app.use('/api/admin/meetings', meetingRoutes); // Gestion des réunions et rapports

// Route de test
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
