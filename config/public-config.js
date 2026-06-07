/*
 * Public runtime configuration for the browser app.
 *
 * Keep only browser-safe values in this file. Do not put GitHub tokens,
 * Supabase access tokens, service-role keys, or database passwords here.
 */
window.CHO_TALENTS_CONFIG = Object.freeze({
  env: 'production',
  supabase: {
    url: 'https://rabakjtjtkelpskptnvi.supabase.co',
    anonKey: 'sb_publishable_X_5jRmNvnhIbwrkC2Dv0uQ_VoO3RtKo',
//    url: 'https://blitrrcdkkkszvgylnus.supabase.co',
//    anonKey: 'sb_publishable_TgsQePzjxca9Hr3Lh_dHvA_O1JqRAQ6',
    authEmailDomain: '@cho-talents.app'
  },
  kakao: {
    mapKey: '0ef8925b28135eeac474bc411c456170'
  },
  github: {
    owner: 'CHO-Talents',
    repo: 'CHO-Talents',
    defaultBranch: 'develop'
  }
});
