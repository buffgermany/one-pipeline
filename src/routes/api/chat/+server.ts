import { json } from '@sveltejs/kit';
import OpenAI from 'openai';

export async function POST({ request }) {
  try {
    const { messages, leadContext } = await request.json();
    
    // In a real app, use $env/static/private for the key
    const apiKey = process.env.NIM_API_KEY || 'test_key';
    
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    // Inject system prompt with lead context
    const systemMessage = {
      role: 'system',
      content: `You are a real-time AI assistant for a cold caller. Give extremely short, punchy advice to help the caller close the deal or handle objections. 
Lead Context: 
- Industry: ${leadContext?.industry || 'Unknown'}
- Notes: ${leadContext?.notes || 'None'}`
    };

    const response = await openai.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [systemMessage, ...messages],
      max_tokens: 150,
      temperature: 0.7,
      stream: false
    });

    return json({ message: response.choices[0].message });
  } catch (e: any) {
    console.error('NIM Chat error:', e);
    return json({ error: e.message }, { status: 500 });
  }
}
