import { Injectable, BadGatewayException } from '@nestjs/common';
import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class OpenRouterService {
  /**
   * Streams a chat completion from OpenRouter.
   * Yields string chunks as they arrive.
   */
  async *streamChat(
    openRouterKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string> {
    let response: any;

    try {
      response = await axios.post(
        OPENROUTER_URL,
        {
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 120000,
        },
      );
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message ?? err.message;
      throw new BadGatewayException(
        `OpenRouter error (${status ?? 'network'}): ${msg}`,
      );
    }

    let buffer = '';

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
