require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');

const user = process.env.NODEMAILER_EMAIL;
const pass = process.env.NODEMAILER_PASSWORD;

if (!user || !pass) {
  throw new Error('Nodemailer email and password are required.');
}

// Configuration explicite Gmail SMTP (plus fiable que service: 'gmail')
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: { user, pass },
  pool: true,           // Réutiliser les connexions
  maxConnections: 3,
  maxMessages: 10,
  rateDelta: 1000,      // Espacer d'1 seconde entre envois
  rateLimit: 5,         // Max 5 emails par seconde
  socketTimeout: 30000, // 30s timeout
  connectionTimeout: 30000,
  greetingTimeout: 15000,
});

/**
 * Délai utilitaire
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envoie un email avec retry automatique (3 tentatives, backoff exponentiel)
 * Gère les erreurs temporaires Gmail 421 4.3.0
 */
async function sendEmail({ to, subject, html, text }, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: `"MY EDEN X" <${user}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      });
      console.log(`Email sent (attempt ${attempt}):`, info.messageId, '→', to);
      return info;
    } catch (error) {
      const isTemporary =
        error.responseCode === 421 ||
        (error.message || '').includes('421') ||
        (error.message || '').includes('Temporary') ||
        (error.message || '').includes('try again');

      if (isTemporary && attempt < retries) {
        const waitMs = attempt * 5000; // 5s, 10s
        console.warn(`[mailer] Temporary error (attempt ${attempt}/${retries}), retrying in ${waitMs / 1000}s...`, error.message);
        await delay(waitMs);
      } else {
        console.error(`[mailer] Failed to send email to ${to} (attempt ${attempt}/${retries}):`, error.message);
        throw error;
      }
    }
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

/**
 * Génère le contenu HTML de l'email d'invitation pour créer une église
 */
function generateChurchInvitationEmail({ registrationUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Invitation à créer votre église',
      subtitle: 'Bienvenue sur MY EDEN X',
      greeting: 'Bonjour,',
      intro: 'Vous avez été invité à rejoindre la plateforme MY EDEN X pour créer et gérer votre église.',
      benefits_title: 'Avec MY EDEN X, vous pourrez :',
      benefit1: 'Gérer vos événements et inscriptions',
      benefit2: 'Suivre vos membres et leur participation',
      benefit3: 'Envoyer des communications ciblées',
      benefit4: 'Accéder à des statistiques détaillées',
      instruction: 'Cliquez sur le bouton ci-dessous pour créer votre église :',
      button: 'Créer mon église',
      expiry: 'Ce lien d\'invitation expirera dans 24 heures.',
      support: 'Si vous avez des questions, n\'hésitez pas à nous contacter.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Invitation to create your church',
      subtitle: 'Welcome to MY EDEN X',
      greeting: 'Hello,',
      intro: 'You have been invited to join the MY EDEN X platform to create and manage your church.',
      benefits_title: 'With MY EDEN X, you can:',
      benefit1: 'Manage your events and registrations',
      benefit2: 'Track your members and their participation',
      benefit3: 'Send targeted communications',
      benefit4: 'Access detailed statistics',
      instruction: 'Click the button below to create your church:',
      button: 'Create my church',
      expiry: 'This invitation link will expire in 24 hours.',
      support: 'If you have any questions, feel free to contact us.',
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
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">${t.subtitle}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 24px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Benefits Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.benefits_title}</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px; line-height: 2;">
              <li>📅 ${t.benefit1}</li>
              <li>👥 ${t.benefit2}</li>
              <li>📧 ${t.benefit3}</li>
              <li>📊 ${t.benefit4}</li>
            </ul>
          </div>

          <p style="color: #d1d5db; line-height: 1.6; margin: 25px 0; font-size: 16px;">
            ${t.instruction}
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 10px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
              ${t.button}
            </a>
          </div>

          <!-- Expiry Note -->
          <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 8px; padding: 15px; margin: 25px 0; border: 1px solid rgba(251, 191, 36, 0.3);">
            <p style="color: #fbbf24; margin: 0; font-size: 14px;">
              <strong>⏱️ ${t.expiry}</strong>
            </p>
          </div>

          <!-- Support Note -->
          <p style="color: #9ca3af; font-size: 14px; margin-top: 20px; text-align: center;">
            ${t.support}
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

/**
 * Génère le contenu HTML de l'email de confirmation d'inscription à un événement
 */
function generateEventRegistrationEmail({ eventName, eventDate, eventLocation, churchName, churchLogo, attendeeName, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Confirmation d\'inscription',
      greeting: `Bonjour ${attendeeName},`,
      intro: 'Votre inscription a été confirmée avec succès !',
      event_details: 'Détails de l\'événement',
      event: 'Événement',
      date: 'Date',
      location: 'Lieu',
      organized_by: 'Organisé par',
      reminder: 'N\'oubliez pas de vous présenter à l\'heure. Nous avons hâte de vous voir !',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Registration Confirmation',
      greeting: `Hello ${attendeeName},`,
      intro: 'Your registration has been successfully confirmed!',
      event_details: 'Event Details',
      event: 'Event',
      date: 'Date',
      location: 'Location',
      organized_by: 'Organized by',
      reminder: 'Don\'t forget to arrive on time. We look forward to seeing you!',
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

          <div style="background-color: #10b981; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 16px; font-weight: bold;">
              ✅ ${t.intro}
            </p>
          </div>

          <!-- Event Details Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4f46e5;">
            <h3 style="color: #a5b4fc; margin: 0 0 20px; font-size: 16px;">${t.event_details}</h3>
            <table style="width: 100%; color: #d1d5db;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.event}:</td>
                <td style="padding: 8px 0; color: #f3f4f6; font-weight: bold;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.date}:</td>
                <td style="padding: 8px 0; color: #f3f4f6;">${eventDate}</td>
              </tr>
              ${eventLocation ? `
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.location}:</td>
                <td style="padding: 8px 0; color: #f3f4f6;">${eventLocation}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.organized_by}:</td>
                <td style="padding: 8px 0; color: #a5b4fc; font-weight: bold;">${churchName}</td>
              </tr>
            </table>
          </div>

          <!-- Reminder -->
          <p style="color: #d1d5db; line-height: 1.6; margin: 25px 0; font-size: 14px; text-align: center;">
            ${t.reminder}
          </p>

          <!-- Bible Verse -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; font-style: italic; font-size: 13px; margin: 0;">
              ${isFrench ? 'Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\'eux.' : 'For where two or three gather in my name, there am I with them.'}
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
              - ${isFrench ? 'Matthieu 18:20' : 'Matthew 18:20'}
            </p>
          </div>
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

/**
 * Génère le contenu HTML de l'email de bienvenue pour un nouvel admin d'église
 */
function generateWelcomeChurchAdminEmail({ churchName, adminName, loginUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Bienvenue sur MY EDEN X',
      greeting: `Félicitations ${adminName} !`,
      intro: `Votre église <strong style="color: #a5b4fc;">${churchName}</strong> a été créée avec succès sur MY EDEN X.`,
      features_title: 'Vous pouvez maintenant :',
      feature1: 'Créer et gérer vos événements',
      feature2: 'Suivre les inscriptions et présences',
      feature3: 'Gérer les membres de votre église',
      feature4: 'Envoyer des communications',
      button: 'Accéder à mon tableau de bord',
      support: 'Si vous avez des questions, n\'hésitez pas à nous contacter.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Welcome to MY EDEN X',
      greeting: `Congratulations ${adminName}!`,
      intro: `Your church <strong style="color: #a5b4fc;">${churchName}</strong> has been successfully created on MY EDEN X.`,
      features_title: 'You can now:',
      feature1: 'Create and manage your events',
      feature2: 'Track registrations and attendance',
      feature3: 'Manage your church members',
      feature4: 'Send communications',
      button: 'Access my dashboard',
      support: 'If you have any questions, feel free to contact us.',
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
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">${t.title}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 24px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Features Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.features_title}</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px; line-height: 2;">
              <li>📅 ${t.feature1}</li>
              <li>✅ ${t.feature2}</li>
              <li>👥 ${t.feature3}</li>
              <li>📧 ${t.feature4}</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
              ${t.button}
            </a>
          </div>

          <!-- Support Note -->
          <p style="color: #9ca3af; font-size: 14px; margin-top: 20px; text-align: center;">
            ${t.support}
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

/**
 * Génère le contenu HTML de l'email d'invitation membre
 */
function generateMemberInvitationEmail({ churchName, churchLogo, inviterName, joinUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Invitation à rejoindre',
      greeting: 'Bonjour,',
      intro: `<strong style="color: #a5b4fc;">${inviterName}</strong> vous invite à rejoindre <strong style="color: #a5b4fc;">${churchName}</strong> sur MY EDEN X.`,
      benefits_title: 'En tant que membre, vous pourrez :',
      benefit1: 'Voir les événements de votre église',
      benefit2: 'Vous inscrire facilement aux activités',
      benefit3: 'Recevoir les annonces et notifications',
      benefit4: 'Gérer votre profil membre',
      button: 'Rejoindre maintenant',
      expiry: 'Ce lien d\'invitation expirera dans 7 jours.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Invitation to Join',
      greeting: 'Hello,',
      intro: `<strong style="color: #a5b4fc;">${inviterName}</strong> invites you to join <strong style="color: #a5b4fc;">${churchName}</strong> on MY EDEN X.`,
      benefits_title: 'As a member, you will be able to:',
      benefit1: 'View your church events',
      benefit2: 'Easily register for activities',
      benefit3: 'Receive announcements and notifications',
      benefit4: 'Manage your member profile',
      button: 'Join Now',
      expiry: 'This invitation link will expire in 7 days.',
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

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Benefits Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.benefits_title}</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px; line-height: 2;">
              <li>📅 ${t.benefit1}</li>
              <li>✅ ${t.benefit2}</li>
              <li>🔔 ${t.benefit3}</li>
              <li>👤 ${t.benefit4}</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 10px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
              ${t.button}
            </a>
          </div>

          <!-- Expiry Note -->
          <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 8px; padding: 15px; margin: 25px 0; border: 1px solid rgba(251, 191, 36, 0.3);">
            <p style="color: #fbbf24; margin: 0; font-size: 14px;">
              <strong>⏱️ ${t.expiry}</strong>
            </p>
          </div>
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

/**
 * Génère le contenu HTML de l'email de bienvenue pour un nouveau membre
 */
function generateMemberWelcomeEmail({ memberName, churchName, loginUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Bienvenue dans la famille !',
      greeting: `Bienvenue ${memberName} !`,
      intro: `Vous êtes maintenant membre de <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      features_title: 'Votre espace membre vous permet de :',
      feature1: 'Consulter les événements à venir',
      feature2: 'Vous inscrire aux activités',
      feature3: 'Recevoir les annonces de votre église',
      feature4: 'Mettre à jour votre profil',
      button: 'Accéder à mon espace',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Welcome to the family!',
      greeting: `Welcome ${memberName}!`,
      intro: `You are now a member of <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      features_title: 'Your member space allows you to:',
      feature1: 'View upcoming events',
      feature2: 'Register for activities',
      feature3: 'Receive announcements from your church',
      feature4: 'Update your profile',
      button: 'Access my space',
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
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 ${t.title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">${churchName}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 24px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Features Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.features_title}</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px; line-height: 2;">
              <li>📅 ${t.feature1}</li>
              <li>✅ ${t.feature2}</li>
              <li>🔔 ${t.feature3}</li>
              <li>👤 ${t.feature4}</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
              ${t.button}
            </a>
          </div>

          <!-- Bible Verse -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; font-style: italic; font-size: 13px; margin: 0;">
              ${isFrench ? 'Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\'eux.' : 'For where two or three gather in my name, there am I with them.'}
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
              - ${isFrench ? 'Matthieu 18:20' : 'Matthew 18:20'}
            </p>
          </div>
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

/**
 * Génère le contenu HTML de l'email de remerciement après un événement
 */
function generateThankYouEmail({ eventName, churchName, attendeeName, customMessage, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Merci pour votre participation !',
      greeting: `Cher(e) ${attendeeName},`,
      intro: `Nous tenons à vous remercier sincèrement pour votre participation à <strong style="color: #a5b4fc;">${eventName}</strong>.`,
      message_title: 'Message de l\'équipe',
      stay_connected: 'Restez connecté(e)',
      stay_connected_text: 'Suivez nos prochains événements et restez informé(e) des activités de notre église.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Thank you for your participation!',
      greeting: `Dear ${attendeeName},`,
      intro: `We sincerely thank you for your participation in <strong style="color: #a5b4fc;">${eventName}</strong>.`,
      message_title: 'Message from the team',
      stay_connected: 'Stay Connected',
      stay_connected_text: 'Follow our upcoming events and stay informed about our church activities.',
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

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${isFrench ? 'Votre présence a contribué à faire de cet événement un moment mémorable.' : 'Your presence helped make this event a memorable moment.'}
          </p>

          ${customMessage ? `
          <!-- Custom Message Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.message_title}</h3>
            <p style="color: #d1d5db; margin: 0; line-height: 1.6; font-style: italic;">
              "${customMessage}"
            </p>
          </div>
          ` : ''}

          <!-- Stay Connected Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #a5b4fc; margin: 0 0 10px; font-size: 16px;">${t.stay_connected}</h3>
            <p style="color: #d1d5db; margin: 0; font-size: 14px;">
              ${t.stay_connected_text}
            </p>
          </div>

          <p style="color: #d1d5db; margin: 25px 0 0; font-size: 16px;">
            ${isFrench ? 'Avec gratitude,' : 'With gratitude,'}
          </p>
          <p style="color: #a5b4fc; font-weight: bold; margin: 5px 0 0; font-size: 16px;">
            ${churchName}
          </p>

          <!-- Bible Verse -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; font-style: italic; font-size: 13px; margin: 0;">
              ${isFrench ? 'Rendez grâces en toutes choses, car c\'est à votre égard la volonté de Dieu en Jésus-Christ.' : 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.'}
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
              - ${isFrench ? '1 Thessaloniciens 5:18' : '1 Thessalonians 5:18'}
            </p>
          </div>
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

/**
 * Génère le contenu HTML d'un email de notification générique
 */
function generateNotificationEmail({ title, message, churchName, ctaText, ctaUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - MY EDEN X</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${churchName}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">${title}</h2>

          <div style="color: #d1d5db; line-height: 1.8; margin: 0 0 25px; font-size: 16px;">
            ${message}
          </div>

          ${ctaText && ctaUrl ? `
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ${ctaText}
            </a>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} MY EDEN X - ${isFrench ? 'Plateforme de gestion d\'église' : 'Church Management Platform'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère le contenu HTML de l'email de notification d'attribution de rôle
 */
function generateRoleAssignedEmail({ memberName, roleName, roleColor, churchName, dashboardUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Nouveau rôle attribué !',
      greeting: `Bonjour ${memberName},`,
      intro: `Nous avons le plaisir de vous informer qu'un nouveau rôle vous a été attribué au sein de <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      role_label: 'Votre nouveau rôle',
      responsibilities: 'Responsabilités',
      responsibilities_text: 'Ce rôle vous confère de nouvelles responsabilités au sein de notre communauté. Vous pouvez consulter les détails dans votre espace membre.',
      button: 'Accéder à mon espace',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'New Role Assigned!',
      greeting: `Hello ${memberName},`,
      intro: `We are pleased to inform you that a new role has been assigned to you within <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      role_label: 'Your new role',
      responsibilities: 'Responsibilities',
      responsibilities_text: 'This role grants you new responsibilities within our community. You can view the details in your member space.',
      button: 'Access my space',
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
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎖️ MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${t.title}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Role Badge -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="color: #9ca3af; margin: 0 0 10px; font-size: 14px;">${t.role_label}</p>
            <div style="display: inline-block; background-color: ${roleColor || '#6366f1'}; color: white; padding: 12px 30px; border-radius: 25px; font-size: 18px; font-weight: bold;">
              ${roleName}
            </div>
          </div>

          <!-- Responsibilities Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 15px; font-size: 16px;">${t.responsibilities}</h3>
            <p style="color: #d1d5db; margin: 0; font-size: 14px; line-height: 1.6;">
              ${t.responsibilities_text}
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ${t.button}
            </a>
          </div>

          <!-- Bible Verse -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; font-style: italic; font-size: 13px; margin: 0;">
              ${isFrench ? 'Chacun de vous a reçu un don particulier: mettez-le au service des autres.' : 'Each of you should use whatever gift you have received to serve others.'}
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
              - ${isFrench ? '1 Pierre 4:10' : '1 Peter 4:10'}
            </p>
          </div>
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

/**
 * Génère le contenu HTML de l'email de notification de retrait de rôle
 */
function generateRoleRemovedEmail({ memberName, roleName, churchName, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Modification de vos rôles',
      greeting: `Bonjour ${memberName},`,
      intro: `Nous vous informons qu'un rôle vous a été retiré au sein de <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      role_label: 'Rôle retiré',
      message: 'Si vous avez des questions concernant ce changement, n\'hésitez pas à contacter l\'administration de votre église.',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'Role Update',
      greeting: `Hello ${memberName},`,
      intro: `We inform you that a role has been removed from your profile within <strong style="color: #a5b4fc;">${churchName}</strong>.`,
      role_label: 'Role removed',
      message: 'If you have any questions about this change, please contact your church administration.',
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
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${t.title}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Role Badge -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="color: #9ca3af; margin: 0 0 10px; font-size: 14px;">${t.role_label}</p>
            <div style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 30px; border-radius: 25px; font-size: 18px; font-weight: bold; text-decoration: line-through;">
              ${roleName}
            </div>
          </div>

          <p style="color: #9ca3af; line-height: 1.6; margin: 25px 0 0; font-size: 14px; text-align: center;">
            ${t.message}
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

/**
 * Génère le contenu HTML de l'email de notification de nouvel événement
 */
function generateNewEventNotificationEmail({ eventName, eventDate, eventDescription, churchName, eventUrl, language = 'fr' }) {
  const isFrench = language === 'fr';

  const texts = {
    fr: {
      title: 'Nouvel événement !',
      greeting: 'Bonjour,',
      intro: `Un nouvel événement a été créé par <strong style="color: #a5b4fc;">${churchName}</strong> !`,
      event_details: 'Détails de l\'événement',
      event: 'Événement',
      date: 'Date',
      description: 'Description',
      button: 'Voir l\'événement',
      footer: 'Plateforme de gestion d\'église'
    },
    en: {
      title: 'New Event!',
      greeting: 'Hello,',
      intro: `A new event has been created by <strong style="color: #a5b4fc;">${churchName}</strong>!`,
      event_details: 'Event Details',
      event: 'Event',
      date: 'Date',
      description: 'Description',
      button: 'View Event',
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
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📅 MY EDEN X</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${t.title}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #374151; padding: 40px 30px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #f3f4f6; margin: 0 0 20px; font-size: 22px;">${t.greeting}</h2>

          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            ${t.intro}
          </p>

          <!-- Event Details Box -->
          <div style="background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #fbbf24; margin: 0 0 20px; font-size: 16px;">${t.event_details}</h3>
            <table style="width: 100%; color: #d1d5db;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.event}:</td>
                <td style="padding: 8px 0; color: #f3f4f6; font-weight: bold;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">${t.date}:</td>
                <td style="padding: 8px 0; color: #f3f4f6;">${eventDate}</td>
              </tr>
              ${eventDescription ? `
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; vertical-align: top;">${t.description}:</td>
                <td style="padding: 8px 0; color: #d1d5db;">${eventDescription}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ${t.button}
            </a>
          </div>

          <!-- Bible Verse -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; font-style: italic; font-size: 13px; margin: 0;">
              ${isFrench ? 'Voici, je fais une chose nouvelle; elle va éclater: ne la connaîtrez-vous pas?' : 'See, I am doing a new thing! Now it springs up; do you not perceive it?'}
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
              - ${isFrench ? 'Ésaïe 43:19' : 'Isaiah 43:19'}
            </p>
          </div>
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

/**
 * Email quand un admin crée manuellement un membre
 */
function generateMemberCreatedByAdminEmail({ memberName, churchName, email, tempPassword, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';
  const t = isFr ? {
    title: 'Bienvenue dans notre communauté !',
    greeting: `Bonjour ${memberName},`,
    intro: `L'administrateur de <strong style="color: #a5b4fc;">${churchName}</strong> vous a ajouté comme membre de notre communauté sur MY EDEN X.`,
    credentials: 'Vos identifiants de connexion',
    email_label: 'Email',
    password_label: 'Mot de passe temporaire',
    password_note: 'Nous vous recommandons de changer votre mot de passe après votre première connexion.',
    features: 'Votre espace membre vous permet de',
    feature_1: 'Consulter les événements de l\'église',
    feature_2: 'Voir vos rôles et responsabilités',
    feature_3: 'Recevoir les annonces importantes',
    feature_4: 'Participer aux réunions',
    button: 'Accéder à mon espace',
    verse: '« Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\'eux. » — Matthieu 18:20',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'Welcome to our community!',
    greeting: `Hello ${memberName},`,
    intro: `The administrator of <strong style="color: #a5b4fc;">${churchName}</strong> has added you as a member of our community on MY EDEN X.`,
    credentials: 'Your login credentials',
    email_label: 'Email',
    password_label: 'Temporary password',
    password_note: 'We recommend changing your password after your first login.',
    features: 'Your member space allows you to',
    feature_1: 'View church events',
    feature_2: 'See your roles and responsibilities',
    feature_3: 'Receive important announcements',
    feature_4: 'Participate in meetings',
    button: 'Access my space',
    verse: '"For where two or three gather in my name, there am I with them." — Matthew 18:20',
    footer: 'Church Management Platform'
  };

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">🤝 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          ${tempPassword ? `
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #f59e0b;">
            <h3 style="color:#f59e0b;margin:0 0 15px;font-size:16px;">🔑 ${t.credentials}</h3>
            <p style="color:#d1d5db;margin:0 0 8px;font-size:14px;"><strong>${t.email_label}:</strong> ${email}</p>
            <p style="color:#d1d5db;margin:0 0 12px;font-size:14px;"><strong>${t.password_label}:</strong> <code style="background:#4b5563;padding:4px 10px;border-radius:4px;color:#fbbf24;">${tempPassword}</code></p>
            <p style="color:#9ca3af;margin:0;font-size:12px;">⚠️ ${t.password_note}</p>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;">
            <h3 style="color:#10b981;margin:0 0 15px;font-size:16px;">✨ ${t.features}</h3>
            <ul style="color:#d1d5db;margin:0;padding-left:20px;font-size:14px;line-height:2;">
              <li>${t.feature_1}</li><li>${t.feature_2}</li><li>${t.feature_3}</li><li>${t.feature_4}</li>
            </ul>
          </div>
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

/**
 * Email quand un membre est ajouté à une réunion
 */
function generateMeetingInvitationEmail({ memberName, meetingTitle, meetingDate, meetingTime, meetingLocation, agenda, churchName, role, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';
  const roleLabels = {
    fr: { organizer: 'Organisateur', secretary: 'Secrétaire', participant: 'Participant' },
    en: { organizer: 'Organizer', secretary: 'Secretary', participant: 'Participant' }
  };
  const roleLabel = (isFr ? roleLabels.fr : roleLabels.en)[role] || role;

  const t = isFr ? {
    title: 'Invitation à une réunion',
    greeting: `Bonjour ${memberName},`,
    intro: `Vous êtes invité(e) à participer à une réunion au sein de <strong style="color: #a5b4fc;">${churchName}</strong>.`,
    meeting_details: 'Détails de la réunion',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    your_role: 'Votre rôle',
    agenda_label: 'Ordre du jour',
    button: 'Voir dans mon espace',
    verse: '« Là où il y a un conseil, les projets réussissent. » — Proverbes 15:22',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'Meeting Invitation',
    greeting: `Hello ${memberName},`,
    intro: `You are invited to attend a meeting at <strong style="color: #a5b4fc;">${churchName}</strong>.`,
    meeting_details: 'Meeting Details',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    your_role: 'Your role',
    agenda_label: 'Agenda',
    button: 'View in my space',
    verse: '"Plans fail for lack of counsel, but with many advisers they succeed." — Proverbs 15:22',
    footer: 'Church Management Platform'
  };

  const formattedDate = meetingDate ? new Date(meetingDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">📋 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #7c3aed;">
            <h3 style="color:#a78bfa;margin:0 0 15px;font-size:16px;">${t.meeting_details}</h3>
            <p style="color:#f3f4f6;margin:0 0 5px;font-size:18px;font-weight:bold;">${meetingTitle}</p>
            <p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">📅 ${t.date}: ${formattedDate}</p>
            ${meetingTime ? `<p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">🕐 ${t.time}: ${meetingTime}</p>` : ''}
            ${meetingLocation ? `<p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">📍 ${t.location}: ${meetingLocation}</p>` : ''}
            <p style="color:#d1d5db;margin:10px 0 0;font-size:14px;">👤 ${t.your_role}: <span style="background:#7c3aed;color:white;padding:3px 12px;border-radius:12px;font-size:12px;">${roleLabel}</span></p>
          </div>
          ${agenda ? `
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;">
            <h3 style="color:#a78bfa;margin:0 0 15px;font-size:16px;">📝 ${t.agenda_label}</h3>
            <p style="color:#d1d5db;margin:0;font-size:14px;line-height:1.6;white-space:pre-line;">${agenda}</p>
          </div>` : ''}
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

/**
 * Email quand un membre est ajouté à la chorale
 */
function generateChoirMemberAddedEmail({ memberName, voiceType, isLead, churchName, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';
  const voiceLabels = {
    fr: { soprano: 'Soprano', alto: 'Alto', tenor: 'Ténor', bass: 'Basse' },
    en: { soprano: 'Soprano', alto: 'Alto', tenor: 'Tenor', bass: 'Bass' }
  };
  const voiceLabel = (isFr ? voiceLabels.fr : voiceLabels.en)[voiceType] || voiceType;

  const t = isFr ? {
    title: 'Bienvenue dans la chorale !',
    greeting: `Bonjour ${memberName},`,
    intro: `Vous avez été ajouté(e) à la chorale de <strong style="color: #a5b4fc;">${churchName}</strong>. Nous sommes heureux de vous accueillir !`,
    voice_label: 'Votre type de voix',
    lead_label: 'Vous êtes désigné(e) comme Lead — vous pourrez diriger des chants lors des événements.',
    features: 'En tant que choriste, vous pouvez',
    feature_1: 'Consulter le répertoire des chants',
    feature_2: 'Voir les plannings musicaux',
    feature_3: 'Proposer de nouveaux chants',
    feature_4: 'Gérer votre répertoire personnel (si Lead)',
    button: 'Accéder à mon espace chorale',
    verse: '« Chantez à l\'Éternel un cantique nouveau ! Chantez à l\'Éternel, vous tous, habitants de la terre ! » — Psaume 96:1',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'Welcome to the choir!',
    greeting: `Hello ${memberName},`,
    intro: `You have been added to the choir of <strong style="color: #a5b4fc;">${churchName}</strong>. We are happy to welcome you!`,
    voice_label: 'Your voice type',
    lead_label: 'You have been designated as Lead — you can lead songs during events.',
    features: 'As a chorister, you can',
    feature_1: 'Browse the song repertoire',
    feature_2: 'View musical planning',
    feature_3: 'Suggest new songs',
    feature_4: 'Manage your personal repertoire (if Lead)',
    button: 'Access my choir space',
    verse: '"Sing to the Lord a new song; sing to the Lord, all the earth." — Psalm 96:1',
    footer: 'Church Management Platform'
  };

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#ec4899 0%,#be185d 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">🎵 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;margin:0 0 10px;font-size:14px;">${t.voice_label}</p>
            <div style="display:inline-block;background:linear-gradient(135deg,#ec4899,#be185d);color:white;padding:12px 30px;border-radius:25px;font-size:18px;font-weight:bold;">🎶 ${voiceLabel}</div>
            ${isLead ? `<p style="color:#fbbf24;margin:15px 0 0;font-size:14px;font-weight:bold;">⭐ ${t.lead_label}</p>` : ''}
          </div>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;">
            <h3 style="color:#ec4899;margin:0 0 15px;font-size:16px;">✨ ${t.features}</h3>
            <ul style="color:#d1d5db;margin:0;padding-left:20px;font-size:14px;line-height:2;">
              <li>${t.feature_1}</li><li>${t.feature_2}</li><li>${t.feature_3}</li><li>${t.feature_4}</li>
            </ul>
          </div>
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#be185d);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

/**
 * Email quand un planning chorale est créé (notification aux choristes)
 */
function generateChoirPlanningNotificationEmail({ memberName, eventName, eventDate, eventTime, eventType, churchName, songsCount, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';
  const typeLabels = {
    fr: { worship: 'Culte', rehearsal: 'Répétition', concert: 'Concert', other: 'Autre' },
    en: { worship: 'Worship', rehearsal: 'Rehearsal', concert: 'Concert', other: 'Other' }
  };
  const typeLabel = (isFr ? typeLabels.fr : typeLabels.en)[eventType] || eventType;
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  const t = isFr ? {
    title: 'Nouveau planning musical',
    greeting: `Bonjour ${memberName},`,
    intro: `Un nouveau planning musical a été créé pour <strong style="color: #a5b4fc;">${churchName}</strong>. Consultez les détails ci-dessous.`,
    event_details: 'Détails de l\'événement',
    type: 'Type',
    date: 'Date',
    time: 'Heure',
    songs: 'Chants programmés',
    button: 'Voir le planning',
    verse: '« Louez l\'Éternel ! Car il est bon de célébrer notre Dieu. » — Psaume 147:1',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'New Musical Planning',
    greeting: `Hello ${memberName},`,
    intro: `A new musical planning has been created for <strong style="color: #a5b4fc;">${churchName}</strong>. Check the details below.`,
    event_details: 'Event Details',
    type: 'Type',
    date: 'Date',
    time: 'Time',
    songs: 'Scheduled songs',
    button: 'View planning',
    verse: '"Praise the Lord! For it is good to sing praises to our God." — Psalm 147:1',
    footer: 'Church Management Platform'
  };

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">🎼 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #f59e0b;">
            <h3 style="color:#fbbf24;margin:0 0 15px;font-size:16px;">${t.event_details}</h3>
            <p style="color:#f3f4f6;margin:0 0 5px;font-size:18px;font-weight:bold;">${eventName}</p>
            <p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">🏷️ ${t.type}: <span style="background:#f59e0b;color:white;padding:2px 10px;border-radius:10px;font-size:12px;">${typeLabel}</span></p>
            <p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">📅 ${t.date}: ${formattedDate}</p>
            ${eventTime ? `<p style="color:#d1d5db;margin:0 0 5px;font-size:14px;">🕐 ${t.time}: ${eventTime}</p>` : ''}
            ${songsCount ? `<p style="color:#d1d5db;margin:10px 0 0;font-size:14px;">🎵 ${t.songs}: ${songsCount}</p>` : ''}
          </div>
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

/**
 * Email quand un lead est assigné à un chant dans un planning
 */
function generateChoirSongAssignmentEmail({ memberName, songTitle, eventName, eventDate, churchName, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  const t = isFr ? {
    title: 'Chant assigné — Vous êtes Lead !',
    greeting: `Bonjour ${memberName},`,
    intro: `Vous avez été désigné(e) pour diriger un chant lors d'un événement musical de <strong style="color: #a5b4fc;">${churchName}</strong>.`,
    song_label: 'Chant à diriger',
    event_label: 'Événement',
    date_label: 'Date',
    preparation: 'Préparation',
    preparation_text: 'Assurez-vous de bien maîtriser ce chant. Consultez les paroles et la tonalité dans votre espace chorale.',
    button: 'Voir dans mon espace',
    verse: '« Que la parole de Christ habite parmi vous abondamment ; instruisez-vous et exhortez-vous les uns les autres par des psaumes, des hymnes et des cantiques spirituels. » — Colossiens 3:16',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'Song Assigned — You are Lead!',
    greeting: `Hello ${memberName},`,
    intro: `You have been designated to lead a song during a musical event at <strong style="color: #a5b4fc;">${churchName}</strong>.`,
    song_label: 'Song to lead',
    event_label: 'Event',
    date_label: 'Date',
    preparation: 'Preparation',
    preparation_text: 'Make sure you master this song well. Check the lyrics and key in your choir space.',
    button: 'View in my space',
    verse: '"Let the word of Christ dwell in you richly; teach and admonish one another with psalms, hymns, and spiritual songs." — Colossians 3:16',
    footer: 'Church Management Platform'
  };

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">🎤 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;margin:0 0 10px;font-size:14px;">${t.song_label}</p>
            <div style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 30px;border-radius:25px;font-size:18px;font-weight:bold;">🎵 ${songTitle}</div>
            <p style="color:#d1d5db;margin:15px 0 5px;font-size:14px;">📋 ${t.event_label}: <strong>${eventName}</strong></p>
            <p style="color:#d1d5db;margin:0;font-size:14px;">📅 ${t.date_label}: ${formattedDate}</p>
          </div>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #f59e0b;">
            <h3 style="color:#fbbf24;margin:0 0 15px;font-size:16px;">📚 ${t.preparation}</h3>
            <p style="color:#d1d5db;margin:0;font-size:14px;line-height:1.6;">${t.preparation_text}</p>
          </div>
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

/**
 * Email quand une annonce est publiée (notification aux membres)
 */
function generateAnnouncementPublishedEmail({ memberName, announcementTitle, announcementContent, churchName, dashboardUrl, language = 'fr' }) {
  const isFr = language === 'fr';

  const t = isFr ? {
    title: 'Nouvelle annonce',
    greeting: `Bonjour ${memberName},`,
    intro: `<strong style="color: #a5b4fc;">${churchName}</strong> a publié une nouvelle annonce. Consultez les détails ci-dessous.`,
    button: 'Voir l\'annonce',
    verse: '« Publiez, annoncez, ne le cachez pas ! » — Jérémie 50:2',
    footer: 'Plateforme de gestion d\'église'
  } : {
    title: 'New Announcement',
    greeting: `Hello ${memberName},`,
    intro: `<strong style="color: #a5b4fc;">${churchName}</strong> has published a new announcement. Check the details below.`,
    button: 'View announcement',
    verse: '"Declare, announce, do not hide it!" — Jeremiah 50:2',
    footer: 'Church Management Platform'
  };

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title} - MY EDEN X</title></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">📢 MY EDEN X</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${t.title}</p>
        </div>
        <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
          <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${t.greeting}</h2>
          <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${t.intro}</p>
          <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #0ea5e9;">
            <h3 style="color:#38bdf8;margin:0 0 15px;font-size:18px;font-weight:bold;">${announcementTitle}</h3>
            <p style="color:#d1d5db;margin:0;font-size:14px;line-height:1.8;white-space:pre-line;">${announcementContent}</p>
          </div>
          ${dashboardUrl ? `<div style="text-align:center;margin:30px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">${t.button}</a>
          </div>` : ''}
          <div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:25px 0;text-align:center;">
            <p style="color:#9ca3af;font-style:italic;margin:0;font-size:13px;line-height:1.6;">${t.verse}</p>
          </div>
        </div>
        <div style="text-align:center;padding:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${t.footer}</p>
        </div>
      </div>
    </body></html>
  `;
}

module.exports = {
  transporter,
  sendEmail,
  generateAdminInvitationEmail,
  generatePasswordResetEmail,
  generateChurchInvitationEmail,
  generateEventRegistrationEmail,
  generateWelcomeChurchAdminEmail,
  generateMemberInvitationEmail,
  generateMemberWelcomeEmail,
  generateThankYouEmail,
  generateNotificationEmail,
  generateRoleAssignedEmail,
  generateRoleRemovedEmail,
  generateNewEventNotificationEmail,
  generateMemberCreatedByAdminEmail,
  generateMeetingInvitationEmail,
  generateChoirMemberAddedEmail,
  generateChoirPlanningNotificationEmail,
  generateChoirSongAssignmentEmail,
  generateAnnouncementPublishedEmail,
  generateMemberBlockedEmail,
  generateMemberUnblockedEmail,
  generateEventReminderEmail,
  generateMeetingReminderEmail,
};

/**
 * Template email de rappel 24h avant un événement
 * Header orange/ambre pour le distinguer visuellement
 */
function generateEventReminderEmail({ event, attendeeName, churchName, eventUrl, language = 'fr' }) {
  const isFrench = language === 'fr';
  const eventName = isFrench ? (event.name_fr || event.name_en) : (event.name_en || event.name_fr);

  const eventDate = event.event_start_date
    ? new Date(event.event_start_date).toLocaleDateString(isFrench ? 'fr-CA' : 'en-CA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '';

  const texts = {
    fr: {
      title: 'Rappel d\'événement',
      badge: '⏰ RAPPEL — DEMAIN',
      greeting: `Bonjour ${attendeeName},`,
      intro: `Ceci est un rappel amical : vous êtes inscrit(e) à l'événement de demain !`,
      eventLabel: 'Événement :',
      dateLabel: 'Date & heure :',
      locationLabel: 'Lieu :',
      cta: 'Voir l\'événement',
      verse: '"En mettant à profit le temps présent, car les jours sont mauvais." — Éphésiens 5:16',
      footer: 'Plateforme de gestion d\'église',
    },
    en: {
      title: 'Event Reminder',
      badge: '⏰ REMINDER — TOMORROW',
      greeting: `Hello ${attendeeName},`,
      intro: `This is a friendly reminder: you are registered for tomorrow's event!`,
      eventLabel: 'Event:',
      dateLabel: 'Date & time:',
      locationLabel: 'Location:',
      cta: 'View event',
      verse: '"Making the best use of the time, because the days are evil." — Ephesians 5:16',
      footer: 'Church Management Platform',
    },
  };

  const tx = texts[isFrench ? 'fr' : 'en'];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${tx.title} - MY EDEN X</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header orange/ambre -->
    <div style="background:linear-gradient(135deg,#d97706 0%,#b45309 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
      <p style="display:inline-block;background:rgba(255,255,255,0.2);color:white;font-weight:bold;font-size:13px;padding:6px 16px;border-radius:20px;margin:0 0 16px;letter-spacing:1px;">${tx.badge}</p>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:bold;">${eventName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">${churchName}</p>
    </div>

    <!-- Body -->
    <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
      <h2 style="color:#f3f4f6;margin:0 0 16px;font-size:20px;">${tx.greeting}</h2>
      <p style="color:#d1d5db;line-height:1.6;margin:0 0 24px;font-size:16px;">${tx.intro}</p>

      <!-- Détails événement -->
      <div style="background-color:#1f2937;border-radius:12px;padding:24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;width:110px;vertical-align:top;">${tx.eventLabel}</td>
            <td style="color:#f3f4f6;font-size:15px;font-weight:bold;padding:6px 0;">${eventName}</td>
          </tr>
          ${eventDate ? `<tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;vertical-align:top;">${tx.dateLabel}</td>
            <td style="color:#fbbf24;font-size:15px;font-weight:bold;padding:6px 0;">${eventDate}</td>
          </tr>` : ''}
          ${event.location ? `<tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;vertical-align:top;">${tx.locationLabel}</td>
            <td style="color:#d1d5db;font-size:15px;padding:6px 0;">${event.location}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${eventUrl}" style="display:inline-block;background:linear-gradient(135deg,#d97706 0%,#b45309 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:bold;font-size:16px;">${tx.cta}</a>
      </div>

      <!-- Verset -->
      <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #4b5563;">
        <p style="color:#9ca3af;font-style:italic;font-size:13px;margin:0;">${tx.verse}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;">
      <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X — ${tx.footer}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Template email de rappel 24h avant une réunion
 * Header bleu/indigo pour le distinguer visuellement
 */
function generateMeetingReminderEmail({ meeting, participantName, churchName, meetingUrl, language = 'fr' }) {
  const isFrench = language === 'fr';
  const meetingTitle = isFrench ? (meeting.title_fr || meeting.title_en) : (meeting.title_en || meeting.title_fr);
  const agenda = isFrench ? meeting.agenda_fr : (meeting.agenda_en || meeting.agenda_fr);

  const meetingDate = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString(isFrench ? 'fr-CA' : 'en-CA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '';

  const texts = {
    fr: {
      title: 'Rappel de réunion',
      badge: '📋 RAPPEL DE RÉUNION — DEMAIN',
      greeting: `Bonjour ${participantName},`,
      intro: `Vous êtes invité(e) à la réunion de demain. Voici un rappel des informations importantes.`,
      titleLabel: 'Réunion :',
      dateLabel: 'Date & heure :',
      locationLabel: 'Lieu :',
      agendaLabel: 'Ordre du jour :',
      cta: 'Voir mes réunions',
      verse: '"Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d\'eux." — Matthieu 18:20',
      footer: 'Plateforme de gestion d\'église',
    },
    en: {
      title: 'Meeting Reminder',
      badge: '📋 MEETING REMINDER — TOMORROW',
      greeting: `Hello ${participantName},`,
      intro: `You are invited to tomorrow's meeting. Here is a reminder of the important details.`,
      titleLabel: 'Meeting:',
      dateLabel: 'Date & time:',
      locationLabel: 'Location:',
      agendaLabel: 'Agenda:',
      cta: 'View my meetings',
      verse: '"For where two or three are gathered in my name, there am I among them." — Matthew 18:20',
      footer: 'Church Management Platform',
    },
  };

  const tx = texts[isFrench ? 'fr' : 'en'];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${tx.title} - MY EDEN X</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header bleu/indigo -->
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
      <p style="display:inline-block;background:rgba(255,255,255,0.2);color:white;font-weight:bold;font-size:13px;padding:6px 16px;border-radius:20px;margin:0 0 16px;letter-spacing:1px;">${tx.badge}</p>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:bold;">${meetingTitle}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">${churchName}</p>
    </div>

    <!-- Body -->
    <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
      <h2 style="color:#f3f4f6;margin:0 0 16px;font-size:20px;">${tx.greeting}</h2>
      <p style="color:#d1d5db;line-height:1.6;margin:0 0 24px;font-size:16px;">${tx.intro}</p>

      <!-- Détails réunion -->
      <div style="background-color:#1f2937;border-radius:12px;padding:24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;width:120px;vertical-align:top;">${tx.titleLabel}</td>
            <td style="color:#f3f4f6;font-size:15px;font-weight:bold;padding:6px 0;">${meetingTitle}</td>
          </tr>
          ${meetingDate ? `<tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;vertical-align:top;">${tx.dateLabel}</td>
            <td style="color:#a5b4fc;font-size:15px;font-weight:bold;padding:6px 0;">${meetingDate}</td>
          </tr>` : ''}
          ${meeting.location ? `<tr>
            <td style="color:#9ca3af;font-size:13px;padding:6px 0;vertical-align:top;">${tx.locationLabel}</td>
            <td style="color:#d1d5db;font-size:15px;padding:6px 0;">${meeting.location}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Ordre du jour -->
      ${agenda ? `<div style="background-color:#1f2937;border-radius:12px;padding:20px;margin:0 0 24px;border-left:4px solid #4f46e5;">
        <h4 style="color:#a5b4fc;margin:0 0 10px;font-size:14px;">${tx.agendaLabel}</h4>
        <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0;white-space:pre-line;">${agenda}</p>
      </div>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${meetingUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#1d4ed8 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:bold;font-size:16px;">${tx.cta}</a>
      </div>

      <!-- Verset -->
      <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #4b5563;">
        <p style="color:#9ca3af;font-style:italic;font-size:13px;margin:0;">${tx.verse}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;">
      <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X — ${tx.footer}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateMemberBlockedEmail({ memberName, churchName, supportEmail, language = 'fr' }) {
  const isFrench = language === 'fr';
  const texts = {
    fr: {
      title: 'Accès suspendu',
      greeting: `Bonjour ${memberName},`,
      body: `Votre accès à l'espace membre de <strong style="color:#a5b4fc;">${churchName}</strong> a été <strong style="color:#f87171;">temporairement suspendu</strong> par l'administrateur.`,
      what: 'Que faire ?',
      what_body: `Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre pasteur ou l'administrateur de l'église.`,
      contact: supportEmail ? `Contacter : <a href="mailto:${supportEmail}" style="color:#818cf8;">${supportEmail}</a>` : '',
      footer: 'Plateforme de gestion d\'église',
      verse: '"Soyez bons et miséricordieux les uns envers les autres." — Éphésiens 4:32'
    },
    en: {
      title: 'Access Suspended',
      greeting: `Hello ${memberName},`,
      body: `Your access to the member area of <strong style="color:#a5b4fc;">${churchName}</strong> has been <strong style="color:#f87171;">temporarily suspended</strong> by the administrator.`,
      what: 'What to do?',
      what_body: `If you believe this is an error, please contact your pastor or church administrator.`,
      contact: supportEmail ? `Contact: <a href="mailto:${supportEmail}" style="color:#818cf8;">${supportEmail}</a>` : '',
      footer: 'Church Management Platform',
      verse: '"Be kind and compassionate to one another." — Ephesians 4:32'
    }
  };
  const tx = texts[isFrench ? 'fr' : 'en'];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tx.title} - MY EDEN X</title></head>
  <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background-color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">🚫 MY EDEN X</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${tx.title}</p>
      </div>
      <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
        <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${tx.greeting}</h2>
        <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${tx.body}</p>
        <div style="background-color:#1f2937;border-radius:12px;padding:25px;margin:25px 0;border-left:4px solid #f87171;">
          <h3 style="color:#f87171;margin:0 0 10px;font-size:16px;">${tx.what}</h3>
          <p style="color:#d1d5db;margin:0;font-size:14px;">${tx.what_body}</p>
          ${tx.contact ? `<p style="color:#d1d5db;margin:10px 0 0;font-size:14px;">${tx.contact}</p>` : ''}
        </div>
        <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #4b5563;">
          <p style="color:#9ca3af;font-style:italic;font-size:13px;margin:0;">${tx.verse}</p>
        </div>
      </div>
      <div style="text-align:center;padding:20px;">
        <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${tx.footer}</p>
      </div>
    </div>
  </body></html>`;
}

function generateMemberUnblockedEmail({ memberName, churchName, dashboardUrl, language = 'fr' }) {
  const isFrench = language === 'fr';
  const texts = {
    fr: {
      title: 'Accès rétabli',
      greeting: `Bonjour ${memberName},`,
      body: `Bonne nouvelle ! Votre accès à l'espace membre de <strong style="color:#a5b4fc;">${churchName}</strong> a été <strong style="color:#34d399;">rétabli</strong>.`,
      cta: 'Se connecter',
      footer: 'Plateforme de gestion d\'église',
      verse: '"La miséricorde triomphe du jugement." — Jacques 2:13'
    },
    en: {
      title: 'Access Restored',
      greeting: `Hello ${memberName},`,
      body: `Good news! Your access to the member area of <strong style="color:#a5b4fc;">${churchName}</strong> has been <strong style="color:#34d399;">restored</strong>.`,
      cta: 'Log in',
      footer: 'Church Management Platform',
      verse: '"Mercy triumphs over judgment." — James 2:13'
    }
  };
  const tx = texts[isFrench ? 'fr' : 'en'];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tx.title} - MY EDEN X</title></head>
  <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background-color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">✅ MY EDEN X</h1>
        <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">${tx.title}</p>
      </div>
      <div style="background-color:#374151;padding:40px 30px;border-radius:0 0 16px 16px;">
        <h2 style="color:#f3f4f6;margin:0 0 20px;font-size:22px;">${tx.greeting}</h2>
        <p style="color:#d1d5db;line-height:1.6;margin:0 0 25px;font-size:16px;">${tx.body}</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#047857 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:bold;font-size:16px;">${tx.cta}</a>
        </div>
        <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #4b5563;">
          <p style="color:#9ca3af;font-style:italic;font-size:13px;margin:0;">${tx.verse}</p>
        </div>
      </div>
      <div style="text-align:center;padding:20px;">
        <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} MY EDEN X - ${tx.footer}</p>
      </div>
    </div>
  </body></html>`;
}

