import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAuth } from "../_shared/requireAuth.ts";
import { getElevenLabsKey } from '../_shared/elevenlabsKey.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;

  try {
    const apiKey = await getElevenLabsKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let agentId = url.searchParams.get('agent_id');
    if (!agentId && (req.method === 'POST')) {
      try {
        const body = await req.json();
        agentId = body?.agent_id ?? body?.agentId ?? null;
      } catch { /* no body */ }
    }
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(15000) }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `ElevenLabs token request failed [${resp.status}]: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    return new Response(JSON.stringify({ token: data.token, agentId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});