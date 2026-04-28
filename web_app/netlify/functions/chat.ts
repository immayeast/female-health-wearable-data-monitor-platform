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
      clinical: "You are a clinical neuroscientist specializing in female physiological markers (HRV, P4). Your tone is objective, precise, and authoritative. Focus on the data and the P4 suppression hypothesis.",
      empathetic: "You are a health coach focusing on intuitive wellness and stress interoception. Your tone is warm, validating, and supportive. Focus on how the user feels and how to bridge the perception gap.",
      technical: "You are a machine learning engineer specializing in biometric modeling (Gradient Boosting, UMAP). Your tone is analytical, efficient, and data-driven. Focus on the R² values, feature importance, and alignment-bin experiments."
    };

    const systemPrompt = `${personaPrompts[persona as keyof typeof personaPrompts] || personaPrompts.clinical} 
    Context: The mcPHASES project explores why wearables fail women during the luteal phase due to Progesterone-driven HRV drops. 
    The 'Truth' model maps physiology directly to subjective perception to identify this gap.`;

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
