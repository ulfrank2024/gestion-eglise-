require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');

const user = process.env.NODEMAILER_EMAIL;
const pass = process.env.NODEMAILER_PASSWORD;

if (!user || !pass) {
  throw new Error('Nodemailer email and password are required.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass,
  },
});

/**
 * Envoie un email
 * @param {Object} options - Options de l'email
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} options.html - Contenu HTML
 * @param {string} [options.text] - Contenu texte (optionnel)
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"MY EDEN X" <${user}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Génère le contenu HTML de l'email d'invitation admin
 */
function generateAdminInvitationEmail({ churchName, email, tempPassword, inviterName, permissions }) {
  const permissionsText = permissions.includes('all')
    ? 'Accès complet à tous les modules'
    : `Accès aux modules: ${permissions.map(p => {
        const labels = {
          events: 'Événements',
          members: 'Membres',
          roles: 'Rôles',
          announcements: 'Annonces'
        };
        return labels[p] || p;
      }).join(', ')}`;

  const loginUrl = process.env.FRONTEND_BASE_URL + '/admin/login';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation - MY EDEN X</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Invitation à rejoindre l'équipe</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">Bonjour,</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 20px;">
            <strong style="color: #a5b4fc;">${inviterName}</strong> vous invite à rejoindre l'équipe d'administration de <strong style="color: #a5b4fc;">${churchName}</strong> sur la plateforme MY EDEN X.
          </p>

          <!-- Credentials Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4f46e5;">
            <h3 style="color: #f3f4f6; margin: 0 0 15px; font-size: 16px;">Vos identifiants de connexion :</h3>
            <p style="color: #d1d5db; margin: 5px 0;">
              <strong>Email :</strong> <span style="color: #a5b4fc;">${email}</span>
            </p>
            <p style="color: #d1d5db; margin: 5px 0;">
              <strong>Mot de passe temporaire :</strong> <span style="color: #fbbf24; font-family: monospace;">${tempPassword}</span>
            </p>
          </div>

          <!-- Permissions Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #f3f4f6; margin: 0 0 10px; font-size: 14px;">Vos permissions :</h4>
            <p style="color: #10b981; margin: 0; font-size: 14px;">${permissionsText}</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Se connecter
            </a>
          </div>

          <!-- Security Note -->
          <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 8px; padding: 15px; margin-top: 25px; border: 1px solid rgba(251, 191, 36, 0.3);">
            <p style="color: #fbbf24; margin: 0; font-size: 13px;">
              <strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion via Paramètres > Changer le mot de passe.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} MY EDEN X - Plateforme de gestion d'église
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère le contenu HTML de l'email de réinitialisation de mot de passe
 */
function generatePasswordResetEmail({ resetUrl, userType = 'admin', language = 'fr' }) {
  const isAdmin = userType === 'admin';
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Réinitialisation de mot de passe',
      greeting: 'Bonjour,',
      intro: isAdmin
        ? 'Vous avez demandé la réinitialisation de votre mot de passe pour votre compte administrateur MY EDEN X.'
        : 'Vous avez demandé la réinitialisation de votre mot de passe pour votre compte membre MY EDEN X.',
      instruction: 'Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :',
      button: 'Réinitialiser mon mot de passe',
      expiry: 'Ce lien expirera dans 1 heure.',
      ignore: 'Si vous n\'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Password Reset',
      greeting: 'Hello,',
      intro: isAdmin
        ? 'You have requested a password reset for your MY EDEN X administrator account.'
        : 'You have requested a password reset for your MY EDEN X member account.',
      instruction: 'Click the button below to create a new password:',
      button: 'Reset my password',
      expiry: 'This link will expire in 1 hour.',
      ignore: 'If you did not request this reset, you can safely ignore this email.',
      footer: 'Church Management Platform'
    }
  };

  const t = texts[isFrench ? 'fr' : 'en'];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.title} - MY EDEN X</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${t.title}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 20px;">
            ${t.intro}
          </p>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px;">
            ${t.instruction}
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ${t.button}
            </a>
          </div>

          <!-- Expiry Note -->
          <div style="background-color: #1f2937; border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid #fbbf24;">
            <p style="color: #fbbf24; margin: 0; font-size: 14px;">
              <strong>⏱️ ${t.expiry}</strong>
            </p>
          </div>

          <!-- Security Note -->
          <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
            ${t.ignore}
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} MY EDEN X - ${t.footer}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { transporter, sendEmail, generateAdminInvitationEmail, generatePasswordResetEmail };
