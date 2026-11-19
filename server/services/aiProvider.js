const GEMINI_KEY_PLACEHOLDER = 'your-gemini-key-or-leave-empty';
const GROQ_KEY_PLACEHOLDER = 'paste-your-Groq-key-here';

const cleanKey = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim();

const getProviderName = () => {
  const configured = String(process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (configured) {
    if (!['groq', 'gemini'].includes(configured)) {
      throw new Error('AI_PROVIDER must be either groq or gemini.');
    }
    return configured;
  }
  return cleanKey(process.env.GROQ_API_KEY) && cleanKey(process.env.GROQ_API_KEY) !== GROQ_KEY_PLACEHOLDER
    ? 'groq'
    : 'gemini';
};

const getKey = (provider) => {
  const key = cleanKey(process.env[provider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY']);
  if (!key || key === (provider === 'groq' ? GROQ_KEY_PLACEHOLDER : GEMINI_KEY_PLACEHOLDER)) return '';
  return key;
};

const createGroqModel = (apiKey) => {
  const modelName = String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
  return {
    model: `groq:${modelName}`,
    async generateContent(prompt) {
      let response;
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(75000),
        });
      } catch (error) {
        error.status = error.status || 503;
        throw error;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error?.message || `Groq request failed (${response.status}).`);
        error.status = response.status;
        error.headers = Object.fromEntries(response.headers.entries());
        throw error;
      }

      const text = payload.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Groq returned an empty response.');
      }
      return { response: { text: () => text } };
    },
  };
};

const createGeminiModel = (apiKey) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' });
};

exports.getAIProviderName = getProviderName;
exports.isAIConfigured = () => Boolean(getKey(getProviderName()));
exports.getAIModel = () => {
  const provider = getProviderName();
  const apiKey = getKey(provider);
  if (!apiKey) return null;
  return provider === 'groq' ? createGroqModel(apiKey) : createGeminiModel(apiKey);
};
exports.getMissingKeyError = () => `${getProviderName() === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} not configured`;
