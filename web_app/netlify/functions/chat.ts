import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid messages array' }) };
    }

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
        model: 'nvidia/nemo', // Requested agentic model
        messages: [
          {
            role: 'system',
            content: 'You are the mcPHASES Agentic AI. You are embedded in a React web app prototyping a physiological alignment model. The app demonstrates how female wearables mistakenly classify Progesterone fluctuations (which lower HRV) as "stress" during the luteal phase, creating an alignment gap. Be extremely helpful, concise, and guide the user through the pipeline.'
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
