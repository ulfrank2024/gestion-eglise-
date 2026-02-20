const cron = require('node-cron');
const { supabaseAdmin } = require('../db/supabase');
const { sendEmail, generateEventReminderEmail, generateMeetingReminderEmail } = require('./mailer');
const { notifyAllAdmins, notifyMembers } = require('./notificationService');

/**
 * Envoie les rappels 24h avant les événements
 * - Fenêtre: entre NOW+23h et NOW+25h (tolérance si cron légèrement décalé)
 * - Anti-doublon: reminder_sent_at IS NULL
 */
async function sendEventReminders() {
  console.log('[CRON] sendEventReminders: début');
  try {
    const now = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    // Récupérer les événements dans la fenêtre 23h-25h, non archivés, rappel pas encore envoyé
    const { data: eventsRaw, error: eventsError } = await supabaseAdmin
      .from('events_v2')
      .select('id, name_fr, name_en, event_start_date, location, church_id, subdomain, is_archived')
      .gte('event_start_date', from)
      .lte('event_start_date', to)
      .is('reminder_sent_at', null);

    if (eventsError) {
      console.error('[CRON] Erreur récupération événements:', eventsError.message);
      return;
    }

    // Filtre JS : exclure les explicitement archivés (is_archived = true). null/false = OK
    const events = (eventsRaw || []).filter(e => e.is_archived !== true);

    if (events.length === 0) {
      console.log('[CRON] Aucun événement à rappeler.');
      return;
    }

    console.log(`[CRON] ${events.length} événement(s) à rappeler.`);

    for (const event of events) {
      try {
        // Récupérer le nom de l'église
        const { data: church } = await supabaseAdmin
          .from('churches_v2')
          .select('name, subdomain')
          .eq('id', event.church_id)
          .single();

        const churchName  = church?.name || 'MY EDEN X';
        const subdomain   = church?.subdomain || event.church_id;
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'https://my-eden-x.onrender.com';
        const eventUrl    = `${frontendUrl}/${subdomain}/event/${event.id}`;

        // Récupérer les inscrits avec email
        const { data: attendees, error: attendeesError } = await supabaseAdmin
          .from('attendees_v2')
          .select('full_name, email')
          .eq('event_id', event.id)
          .eq('church_id', event.church_id);

        if (attendeesError) {
          console.error(`[CRON] Erreur attendees pour événement ${event.id}:`, attendeesError.message);
        }

        if (attendees && attendees.length > 0) {
          // Envoyer un email à chaque inscrit
          const emailPromises = attendees.map(attendee =>
            sendEmail({
              to: attendee.email,
              subject: `⏰ Rappel : ${event.name_fr} — demain !`,
              html: generateEventReminderEmail({
                event,
                attendeeName: attendee.full_name,
                churchName,
                eventUrl,
                language: 'fr',
              }),
            }).catch(err => console.error(`[CRON] Échec email rappel à ${attendee.email}:`, err.message))
          );
          await Promise.allSettled(emailPromises);
        }

        // Notification in-app aux admins de l'église
        await notifyAllAdmins({
          churchId: event.church_id,
          excludeUserId: null,
          titleFr: `Rappel automatique envoyé — ${event.name_fr}`,
          titleEn: `Automatic reminder sent — ${event.name_en || event.name_fr}`,
          messageFr: `Le rappel 24h a été envoyé à ${attendees?.length || 0} inscrit(s) pour l'événement de demain.`,
          messageEn: `The 24h reminder was sent to ${attendees?.length || 0} attendee(s) for tomorrow's event.`,
          type: 'event',
          icon: 'event',
          link: `/admin/events/${event.id}`,
        });

        // Marquer l'événement comme rappelé (anti-doublon)
        await supabaseAdmin
          .from('events_v2')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', event.id);

        console.log(`[CRON] Rappel événement "${event.name_fr}" envoyé à ${attendees?.length || 0} inscrit(s).`);
      } catch (eventErr) {
        console.error(`[CRON] Erreur traitement événement ${event.id}:`, eventErr.message);
      }
    }
  } catch (err) {
    console.error('[CRON] sendEventReminders erreur globale:', err.message);
  }
  console.log('[CRON] sendEventReminders: fin');
}

/**
 * Envoie les rappels 24h avant les réunions
 * - Fenêtre: entre NOW+23h et NOW+25h
 * - Anti-doublon: reminder_sent_at IS NULL
 */
async function sendMeetingReminders() {
  console.log('[CRON] sendMeetingReminders: début');
  try {
    const now = new Date();
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    // Récupérer les réunions dans la fenêtre, rappel pas encore envoyé
    const { data: meetings, error: meetingsError } = await supabaseAdmin
      .from('meetings_v2')
      .select('id, title_fr, title_en, meeting_date, location, agenda_fr, church_id')
      .gte('meeting_date', from)
      .lte('meeting_date', to)
      .is('reminder_sent_at', null);

    if (meetingsError) {
      console.error('[CRON] Erreur récupération réunions:', meetingsError.message);
      return;
    }

    if (!meetings || meetings.length === 0) {
      console.log('[CRON] Aucune réunion à rappeler.');
      return;
    }

    console.log(`[CRON] ${meetings.length} réunion(s) à rappeler.`);

    for (const meeting of meetings) {
      try {
        // Récupérer le nom de l'église
        const { data: church } = await supabaseAdmin
          .from('churches_v2')
          .select('name')
          .eq('id', meeting.church_id)
          .single();

        const churchName = church?.name || 'MY EDEN X';
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'https://my-eden-x.onrender.com';
        const meetingUrl  = `${frontendUrl}/member/meetings`;

        // Récupérer les participants (sauf statut absent) avec email via members_v2
        const { data: participants, error: participantsError } = await supabaseAdmin
          .from('meeting_participants_v2')
          .select('member_id, status')
          .eq('meeting_id', meeting.id)
          .neq('status', 'absent');

        if (participantsError) {
          console.error(`[CRON] Erreur participants réunion ${meeting.id}:`, participantsError.message);
        }

        const memberIds = (participants || []).map(p => p.member_id);

        let membersWithEmail = [];
        if (memberIds.length > 0) {
          const { data: members } = await supabaseAdmin
            .from('members_v2')
            .select('id, full_name, email')
            .in('id', memberIds)
            .eq('is_active', true);

          membersWithEmail = members || [];
        }

        if (membersWithEmail.length > 0) {
          // Envoyer un email à chaque participant
          const emailPromises = membersWithEmail.map(member =>
            sendEmail({
              to: member.email,
              subject: `📋 Rappel : ${meeting.title_fr} — demain !`,
              html: generateMeetingReminderEmail({
                meeting,
                participantName: member.full_name,
                churchName,
                meetingUrl,
                language: 'fr',
              }),
            }).catch(err => console.error(`[CRON] Échec email rappel réunion à ${member.email}:`, err.message))
          );
          await Promise.allSettled(emailPromises);

          // Notification in-app aux membres participants
          const notifMemberIds = membersWithEmail.map(m => m.id);
          await notifyMembers({
            churchId: meeting.church_id,
            memberIds: notifMemberIds,
            titleFr: `Rappel : ${meeting.title_fr} demain`,
            titleEn: `Reminder: ${meeting.title_en || meeting.title_fr} tomorrow`,
            messageFr: `Votre réunion "${meeting.title_fr}" a lieu demain${meeting.location ? ` à ${meeting.location}` : ''}.`,
            messageEn: `Your meeting "${meeting.title_en || meeting.title_fr}" is tomorrow${meeting.location ? ` at ${meeting.location}` : ''}.`,
            type: 'meeting',
            icon: 'meeting',
            link: meetingUrl,
          });
        }

        // Marquer la réunion comme rappelée (anti-doublon)
        await supabaseAdmin
          .from('meetings_v2')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', meeting.id);

        console.log(`[CRON] Rappel réunion "${meeting.title_fr}" envoyé à ${membersWithEmail.length} participant(s).`);
      } catch (meetingErr) {
        console.error(`[CRON] Erreur traitement réunion ${meeting.id}:`, meetingErr.message);
      }
    }
  } catch (err) {
    console.error('[CRON] sendMeetingReminders erreur globale:', err.message);
  }
  console.log('[CRON] sendMeetingReminders: fin');
}

/**
 * Initialise les cron jobs de rappels.
 * Exécution chaque jour à 9h00 heure de Montréal.
 */
function initReminderCronJobs() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] ⏰ Lancement des rappels 24h —', new Date().toISOString());
    await sendEventReminders();
    await sendMeetingReminders();
  }, {
    timezone: 'America/Toronto',
  });

  console.log('[CRON] Jobs de rappels initialisés — exécution quotidienne à 9h00 (America/Toronto)');
}

module.exports = {
  initReminderCronJobs,
  sendEventReminders,
  sendMeetingReminders,
};
