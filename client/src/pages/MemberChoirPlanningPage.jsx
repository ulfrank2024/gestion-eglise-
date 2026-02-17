import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MdCalendarMonth, MdMusicNote, MdPerson, MdArrowBack, MdStar, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { api } from '../api/api';

export default function MemberChoirPlanningPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [plannings, setPlannings] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [expandedId, setExpandedId] = useState(null);
  const [planningDetails, setPlanningDetails] = useState({});

  useEffect(() => {
    fetchPlannings();
  }, [filter]);

  const fetchPlannings = async () => {
    try {
      setLoading(true);
      const data = await api.member.getChoirPlanning(filter);
      setPlannings(data);
    } catch (err) {
      console.error('Error fetching plannings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (planningId) => {
    if (expandedId === planningId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(planningId);

    // Fetch details if not already loaded
    if (!planningDetails[planningId]) {
      try {
        const details = await api.member.getChoirPlanningDetail(planningId);
        setPlanningDetails(prev => ({ ...prev, [planningId]: details }));
      } catch (err) {
        console.error('Error fetching planning details:', err);
      }
    }
  };

  const eventTypeLabels = {
    culte: t('choir.event_type_culte'),
    repetition: t('choir.event_type_repetition'),
    concert: t('choir.event_type_concert'),
    special: t('choir.event_type_special')
  };

  const eventTypeColors = {
    culte: 'bg-purple-500/20 text-purple-400',
    repetition: 'bg-blue-500/20 text-blue-400',
    concert: 'bg-green-500/20 text-green-400',
    special: 'bg-yellow-500/20 text-yellow-400'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/member/choir"
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <MdArrowBack className="w-5 h-5 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <MdCalendarMonth className="w-7 h-7 text-purple-400" />
              {t('member_choir.planning')}
            </h1>
            <p className="text-gray-400">{plannings.length} {t('member_choir.events')}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['upcoming', 'past', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t(`member_choir.filter_${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Plannings List */}
      {plannings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <MdCalendarMonth className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-200 mb-2">
            {t('member_choir.no_plannings')}
          </h2>
          <p className="text-gray-400">
            {filter === 'upcoming'
              ? t('member_choir.no_upcoming_plannings')
              : t('member_choir.no_past_plannings')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plannings.map((planning) => {
            const isExpanded = expandedId === planning.id;
            const details = planningDetails[planning.id];
            const isPast = new Date(planning.event_date) < new Date();

            return (
              <div
                key={planning.id}
                className={`bg-gray-800 rounded-xl border ${
                  planning.is_lead_in_planning ? 'border-yellow-500/50' : 'border-gray-700'
                } overflow-hidden`}
              >
                {/* Header */}
                <div
                  onClick={() => handleExpand(planning.id)}
                  className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${isPast ? 'text-gray-400' : 'text-gray-100'}`}>
                          {lang === 'fr' ? planning.event_name_fr : planning.event_name_en}
                        </h3>
                        {planning.is_lead_in_planning && (
                          <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                            <MdStar className="w-3 h-3" />
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {new Date(planning.event_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                        {planning.event_time && ` • ${planning.event_time}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${eventTypeColors[planning.event_type] || eventTypeColors.culte}`}>
                        {eventTypeLabels[planning.event_type] || planning.event_type}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <MdMusicNote className="w-4 h-4" />
                        {planning.songs_count}
                      </span>
                      {isExpanded ? (
                        <MdExpandLess className="w-5 h-5 text-gray-400" />
                      ) : (
                        <MdExpandMore className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                    {!details ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Notes */}
                        {details.notes && (
                          <div className="text-sm text-gray-400 italic">
                            {details.notes}
                          </div>
                        )}

                        {/* My Songs (if I'm a lead) */}
                        {details.my_songs?.length > 0 && (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                              <MdStar className="w-4 h-4" />
                              {t('member_choir.my_songs_to_lead')}
                            </h4>
                            <ul className="space-y-1">
                              {details.my_songs.map((song) => (
                                <li key={song.id} className="text-sm text-gray-300 flex items-center gap-2">
                                  <span className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center text-xs text-yellow-400">
                                    {song.order_position}
                                  </span>
                                  {song.song?.title || song.compilation?.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* All Songs */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">
                            {t('member_choir.program')}
                          </h4>
                          <ul className="space-y-2">
                            {details.songs?.map((item, index) => (
                              <li
                                key={item.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  item.lead_choriste?.id === details.choir_member_id
                                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                                    : 'bg-gray-800'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400">
                                    {item.order_position || index + 1}
                                  </span>
                                  <div>
                                    <p className="text-gray-200">
                                      {item.song?.title || item.compilation?.name}
                                      {item.medley_name && (
                                        <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                                          {item.medley_name}
                                        </span>
                                      )}
                                    </p>
                                    {item.song?.author && (
                                      <p className="text-xs text-gray-500">{item.song.author}</p>
                                    )}
                                  </div>
                                </div>
                                {item.lead_choriste && (
                                  <div className="flex items-center gap-2 text-sm">
                                    {item.lead_choriste.member?.profile_photo_url ? (
                                      <img
                                        src={item.lead_choriste.member.profile_photo_url}
                                        alt=""
                                        className="w-6 h-6 rounded-full"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                                        <MdPerson className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    <span className="text-gray-400">
                                      {item.lead_choriste.member?.full_name}
                                    </span>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* View Song Lyrics Button */}
                        <div className="flex justify-end pt-2">
                          <Link
                            to={`/member/choir/planning/${planning.id}`}
                            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {t('member_choir.view_full_program')} →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
