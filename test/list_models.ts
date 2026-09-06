import { config } from '../src/config/index.js';

async function listGeminiModels() {
  const apiKey = config.gemini.apiKey;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const json = await res.json() as any;
  if (json.models) {
    console.log('Available Models for this API Key:');
    json.models.forEach((m: any) => {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${m.name} (${m.displayName})`);
      }
    });
  } else {
    console.log('Error listing models:', json);
  }
}

listGeminiModels();
