import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

if (!apiKey) {
  console.error('API Key not found in .env.local');
  process.exit(1);
}

async function checkAvailableModels() {
  console.log('Fetching available models via REST API...');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
        console.error('API Error:', data.error);
        return;
    }

    if (!data.models) {
        console.log('No models returned. Response:', data);
        return;
    }

    console.log('\nAvailable Models:');
    data.models.forEach(m => {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
             console.log(`- ${m.name.replace('models/', '')}`);
        }
    });

  } catch (e) {
    console.error('Fetch error:', e);
  }
}

checkAvailableModels();