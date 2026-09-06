/** TEMPORARY test identity — in production this comes from the Betsson
 *  handoff payload (username/email) + our backend (QP, favorite club).
 *  Used as display fallbacks so every profile surface is populated
 *  during prototype testing. */

export const MOCK_USER = {
  name: 'გიორგი ბ.',
  points: 125,
  club: 'FC Barcelona',
} as const;
