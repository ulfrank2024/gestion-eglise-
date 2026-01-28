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
  generateNewEventNotificationEmail
};
