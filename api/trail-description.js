import Anthropic from '@anthropic-ai/sdk';

// Lazily constructed so a missing key returns a clean 503 instead of an
// import-time crash. Reads ANTHROPIC_API_KEY from the environment.
let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Stable across every request so it can sit behind a prompt-cache breakpoint.
// NOTE: Haiku 4.5's minimum cacheable prefix is ~4096 tokens; this prompt is
// far shorter, so the cache_control marker below is effectively a no-op until
// the system prompt grows past that threshold (it will simply report
// cache_creation_input_tokens: 0, never erroring). The real cost saver here is
// the client-side per-trail cache in TrailMap.jsx.
const SYSTEM_PROMPT = `You are a Colorado backcountry trail writer for RadCamp Adventures, an app for mountain bikers, moto/OHV riders, hikers, and overlanders.

Given structured metadata about a single trail segment, write a short, vivid description (2 sentences, ~40 words max) that helps a rider decide whether it's worth the trip.

Rules:
- Ground every claim in the metadata provided. Do NOT invent trailhead names, specific landmarks, mileposts, water crossings, or facts you cannot derive from the data.
- It is fine to speak generally about the terrain implied by the surface and trail type (e.g. dirt singletrack, gravel doubletrack, paved path) and the listed activities.
- Match the tone to the activities: technical and stoked for moto/MTB, scenic and welcoming for hiking.
- If elevation range is given, you may reference the climb/descent character.
- Output plain prose only — no markdown, no headings, no preamble like "This trail". Just the description.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI descriptions not configured (ANTHROPIC_API_KEY missing)' });
  }

  // Vercel parses JSON bodies automatically; guard for safety.
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const {
    name,
    activities = [],
    surface,
    trailType,
    lengthMi,
    minElevFt,
    maxElevFt,
    manager,
    lat,
    lng,
  } = body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing trail name' });
  }

  const facts = [
    `Name: ${name}`,
    activities.length ? `Activities allowed: ${activities.join(', ')}` : null,
    trailType ? `Trail type: ${trailType}` : null,
    surface ? `Surface: ${surface}` : null,
    lengthMi ? `Length: ${lengthMi} miles` : null,
    minElevFt && maxElevFt ? `Elevation: ${minElevFt}–${maxElevFt} ft` : null,
    manager ? `Land manager: ${manager}` : null,
    lat && lng ? `Approx. location: ${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)} (Colorado)` : null,
  ].filter(Boolean).join('\n');

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: `Write the description for this trail:\n\n${facts}` },
      ],
    });

    const description = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return res.status(200).json({ description });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${err.status}:`, err.message);
      return res.status(502).json({ error: 'Description service unavailable' });
    }
    console.error('trail-description error:', err);
    return res.status(500).json({ error: 'Failed to generate description' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
