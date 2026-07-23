import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAuth } from "../_shared/requireAuth.ts";
import { getElevenLabsKey } from '../_shared/elevenlabsKey.ts';

async function ensureRuntimeVoiceOverride(apiKey: string, agentId: string) {
  const headers = { 'xi-api-key': apiKey, 'Content-Type': 'application/json' };
  const agentResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!agentResp.ok) throw new Error(`Could not read ElevenLabs agent [${agentResp.status}]: ${await agentResp.text()}`);

  const agent = await agentResp.json();
  const platformSettings = agent?.platform_settings ?? {};
  const overrides = platformSettings?.overrides ?? {};
  const configOverride = overrides?.conversation_config_override ?? {};

  const patchResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      platform_settings: {
        ...platformSettings,
        overrides: {
          ...overrides,
          conversation_config_override: {
            ...configOverride,
            agent: {
              ...configOverride.agent,
              first_message: true,
              prompt: { ...configOverride.agent?.prompt, prompt: true },
            },
            tts: { ...configOverride.tts, voice_id: true },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!patchResp.ok) throw new Error(`Could not enable ElevenLabs voice override [${patchResp.status}]: ${await patchResp.text()}`);
}

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

    let agentId: unknown = new URL(req.url).searchParams.get('agent_id');
    let mode: string = new URL(req.url).searchParams.get('mode') ?? 'websocket';
    let voiceId: unknown = new URL(req.url).searchParams.get('voice_id');
    if (!agentId && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      agentId = body?.agent_id ?? body?.agentId;
      if (typeof body?.mode === 'string') mode = body.mode;
      voiceId = body?.voiceId ?? body?.voice_id;
    }

    if (typeof agentId !== 'string' || !agentId.trim()) {
      return new Response(JSON.stringify({ error: 'agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const id = agentId.trim();
    if (typeof voiceId === 'string' && voiceId.trim()) await ensureRuntimeVoiceOverride(apiKey, id);

    const url = mode === 'webrtc'
      ? `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(id)}`
      : `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(id)}`;

    const resp = await fetch(url, { headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `ElevenLabs request failed [${resp.status}]: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    return new Response(JSON.stringify({
      signedUrl: data.signed_url,
      signed_url: data.signed_url,
      conversationToken: data.token,
      token: data.token,
      agentId: id,
    }), {
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