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
const { protect, isSuperAdmin, isSuperAdminOrChurchAdmin } = require('./middleware/auth');

// Importer les routeurs
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const churchAdminRoutes = require('./routes/churchAdminRoutes'); // Nouvelle importation

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

// Route de test
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
