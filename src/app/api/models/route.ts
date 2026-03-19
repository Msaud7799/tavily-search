import { NextResponse } from 'next/server';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  supports_image: boolean;
  supports_tools: boolean;
}

export async function GET() {
  try {
    const hfToken = process.env.HF_TOKEN;

    if (!hfToken) {
      return NextResponse.json(
        { error: 'لم يتم العثور على مفتاح HuggingFace.' },
        { status: 500 }
      );
    }

    const res = await fetch('https://router.huggingface.co/v1/models', {
      headers: {
        Authorization: `Bearer ${hfToken}`,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.statusText}`);
    }

    const data = await res.json();
    const rawModels = data.data || [];

    // Transform and map models to our simplified format
    const models: AIModel[] = rawModels.map((m: any) => {
      // Check if any provider supports tools
      const supportsTools = Array.isArray(m.providers) 
        ? m.providers.some((p: any) => p.supports_tools === true)
        : false;
        
      // Check if the architecture supports image inputs (VLM)
      const supportsImage = m.architecture?.input_modalities?.includes('image') || false;

      // Extract a cleaner name (e.g., "Qwen3.5-35B-A3B" from "Qwen/Qwen3.5-35B-A3B")
      const name = m.id.split('/').pop() || m.id;
      
      return {
        id: m.id,
        name: name,
        provider: m.owned_by || 'Unknown',
        supports_image: supportsImage,
        supports_tools: supportsTools,
      };
    });

    // Sort models: prioritize certain popular/powerful ones, then alphabetically
    const priorityModels = [
      'meta-llama/Llama-3.3-70B-Instruct',
      'Qwen/Qwen2.5-VL-7B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
    ];

    models.sort((a, b) => {
      const aIndex = priorityModels.indexOf(a.id);
      const bIndex = priorityModels.indexOf(b.id);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ models });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'خطأ في جلب قائمة النماذج', details: error.message },
      { status: 500 }
    );
  }
}
