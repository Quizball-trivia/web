// Public, unauthenticated association. Each app build claims its own environment.
export function GET() {
  return Response.json({ applinks: { apps: [], details: [{
    appID: 'D52VX5574L.io.quizball.mobile',
    paths: ['NOT /friend/room/new', '/friend/room/*', '/play'],
  }, {
    appID: 'N9TWV36HUN.io.quizball.app',
    paths: ['NOT /friend/room/new', '/friend/room/*', '/play'],
  }] } }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
