import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages, persona } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid messages array' }) };
    }

    const personaPrompts = {
      technical: "You are the Technical Research Lead. Focus on person-specific z-score normalization and computing the perception-physiology gap. Use signed_gap (direction + magnitude), absolute_gap (mismatch), and gap_category (aligned | self_higher | wearable_higher using ±0.5 SD threshold). Tone: Concise, analytic.",
      empathetic: "You are the Empathetic Lead. Focus on stress relative to each person's normal, not raw numbers. Explain which is higher (feeling vs body), how far apart they are, and provide personalized insights. Tone: Warm, natural, concise."
    };

    const systemPrompt = `
      ${personaPrompts[persona as keyof typeof personaPrompts] || personaPrompts.technical} 
      NEVER provide clinical or medical advice. You are a research tool for identifying the "Truth Gap" in physiological wearable data.
      Use natural language. Avoid robotic symbols or artifacts. Focus on the P4 (Progesterone) suppression hypothesis.
    `;

    // Call OpenRouter
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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"; // Fallback to provided key for prototype. Highly recommend removing from static code in prod.

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://mcphases.netlify.app', // Required by OpenRouter
        'X-Title': 'mcPHASES Agent',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct', // Requested agentic model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
      }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate response' }),
    };
  }
};
