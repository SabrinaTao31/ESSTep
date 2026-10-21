import handler from 'vinext/server/fetch-handler';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    const result = new Response(response.body, response);
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('X-Frame-Options', 'DENY');
    result.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // The server renders account information. Never cache its pages or API data.
    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  },
};
