import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config/index.js';

async function testLiveKeys() {
  console.log('\n=============================================');
  console.log('🔍 VERIFYING LIVE EXTERNAL CREDENTIALS');
  console.log('=============================================\n');

  // 1. Test Gemini API Key
  console.log('--- 1. Testing Gemini 1.5 Flash API Key ---');
  if (!config.gemini.apiKey) {
    console.log('⚠️ GEMINI_API_KEY is currently empty in .env');
  } else {
    try {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const prompt = 'Say: "RUUTED Agronomy AI is online and operational."';
      const result = await model.generateContent(prompt);
      console.log('🤖 Gemini Response:', result.response.text().trim());
      console.log('✅ Google Gemini API Key is 100% VALID and CONNECTED!\n');
    } catch (err: any) {
      console.error('❌ Google Gemini API Error:', err.message, '\n');
    }
  }

  // 2. Test Cloudinary Credentials
  console.log('--- 2. Testing Cloudinary CDN Credentials ---');
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey) {
    console.log('⚠️ Cloudinary credentials empty in .env');
  } else {
    try {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret
      });
      const ping = await cloudinary.api.ping();
      console.log('☁️ Cloudinary Ping:', ping);
      console.log('✅ Cloudinary CDN Credentials are 100% VALID and CONNECTED!\n');
    } catch (err: any) {
      console.error('❌ Cloudinary Error:', err.message, '\n');
    }
  }

  console.log('=============================================\n');
}

testLiveKeys();
