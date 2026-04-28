import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');

    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No text provided' }) };
    }

    const systemPrompt = `You are a high-precision biometric data extractor. 
    Analyze the user's natural language description and extract numeric values for the following metrics:
    - restingHR (beats per minute)
    - hrv (ms, usually RMSSD)
    - sleep (hours)
    - steps (daily count)
    - perceivedStress (scale 1-10)

    Rules:
    1. If a value is mentioned (e.g. "my heart rate is 65"), extract it.
    2. If a value is described qualitatively (e.g. "I feel peak stress"), map it to the 1-10 scale (Peak = 10, Moderate = 5, Low = 2).
    3. If a value is missing, return null.
    4. Return ONLY a valid JSON object. No extra text.

    Example Output:
    { "restingHR": 65, "hrv": 45, "sleep": 7.5, "steps": 8000, "perceivedStress": 7 }`;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract from: "${text}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    const metrics = JSON.parse(resultText);

    return {
      statusCode: 200,
      body: JSON.stringify(metrics),
    };
  } catch (error) {
    console.error('Error parsing metrics:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to parse metrics' }),
    };
  }
};
