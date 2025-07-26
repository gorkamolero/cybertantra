import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getAIConfig, QueryAgent, CYBERTANTRA_SYSTEM_PROMPT } from '@cybertantra/ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  if (!messages || messages.length === 0) {
    return new Response('No messages provided', { status: 400 });
  }

  try {
    const config = getAIConfig();
    
    if (!config.openRouterApiKey) {
      throw new Error('OpenRouter API key required');
    }
    if (!config.googleGenerativeAIApiKey) {
      throw new Error('Google Generative AI API key required for embeddings');
    }

    const openrouter = createOpenRouter({
      apiKey: config.openRouterApiKey,
    });
    
    const queryAgent = new QueryAgent(config);
    
    // Always retrieve relevant lectures first
    const lastUserMessage = messages[messages.length - 1];
    const query = lastUserMessage.content;
    
    const chunks = await queryAgent.retrieve(query, 10);
    const context = chunks
      .map((chunk, i) => `[${i + 1}] From "${chunk.source}":\n${chunk.text}`)
      .join('\n\n---\n\n');
    
    // Use streamText with OpenRouter directly
    const result = await streamText({
      model: openrouter('moonshotai/kimi-k2'),
      system: CYBERTANTRA_SYSTEM_PROMPT + '\n\nRetrieved lecture context:\n' + context,
      messages,
      temperature: 0.8,
      maxOutputTokens: 2000,
    });

    // Return the stream response
    return result.toTextStreamResponse();
    
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat failed' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}