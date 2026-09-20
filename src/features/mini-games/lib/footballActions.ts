/** Original authored interpretations of familiar football movement styles. */
export const FOOTBALL_STYLES = {
  power: { label: 'Ronaldo · power / jump-turn', stance: 'stance_power', shot: 'strike_power', celebration: 'celebrate_siu', foot: 'r', keeper: 'parry' },
  samba: { label: 'Ronaldinho · toe-poke / samba', stance: 'stance_samba', shot: 'strike_toe', celebration: 'celebrate_samba', foot: 'r', keeper: 'catch' },
  left: { label: 'Messi · left foot / sky-point', stance: 'stance_left', shot: 'strike_left', celebration: 'celebrate_sky', foot: 'l', keeper: 'tip' },
  curl: { label: 'Beckham · curled instep / sky-point', stance: 'stance_curl', shot: 'strike_curl', celebration: 'celebrate_sky', foot: 'r', keeper: 'catch' },
  neymar: { label: 'Neymar · staggered stance / whipped shot', stance: 'stance_neymar', shot: 'strike_whip', celebration: 'celebrate_samba', foot: 'r', keeper: 'tip' },
  composed: { label: 'Mbappé · power / folded arms', stance: 'outfield_idle', shot: 'strike_power', celebration: 'celebrate_fold', foot: 'r', keeper: 'parry' },
  carlos: { label: 'Roberto Carlos · angled stance / left-foot power', stance: 'stance_carlos', shot: 'strike_left_power', celebration: 'celebrate', foot: 'l', keeper: 'parry' },
  neutral: { label: 'Classic · relaxed stance / instep strike', stance: 'outfield_idle', shot: 'strike', celebration: 'celebrate', foot: 'r', keeper: 'catch' },
} as const;
export type FootballStyle = keyof typeof FOOTBALL_STYLES;
const PLAYER_STYLES: Record<string, FootballStyle> = {
  ronaldo: 'power', messi: 'left', beckham: 'curl', carlos: 'carlos',
  ronaldinho: 'samba', neymar: 'neymar', zidane: 'neutral', juninho: 'curl',
  mbappe: 'composed', kvara: 'neutral',
};
export function footballStyleForPlayer(id: string): FootballStyle {
  return PLAYER_STYLES[id] ?? 'neutral';
}

export const FREE_KICK_PLAYERS = ['Ronaldo', 'Messi', 'Beckham', 'Roberto Carlos', 'Ronaldinho', 'Neymar', 'Zidane', 'Juninho', 'Mbappé', 'Kvaratskhelia'] as const;
