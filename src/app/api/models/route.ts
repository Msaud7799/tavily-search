import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface AIModel {
  id: string; // The full HF model name, e.g., "Omni"
  name: string; // Display name
  provider: string; // "meta-llama", "Qwen", etc.
  description_ar?: string;
  usage?: string[];
  supports_image: boolean;
  supports_tools: boolean;
  logoUrl?: string;
}

/*----------
 * دالة استرجاع قائمة النماذج.
 * تقرأ النماذج من ملف models.json (124 نموذج) الذي يحتوي على قائمة النماذج ومعلوماتها ومدى ملاءمتها.
 *
 * @returns {NextResponse} تُرجع استجابة بداخلها قائمة بنماذج AI وخصائص كل نموذج.
----------*/
export async function GET() {
  try {
    // قراءة ملف models.json الأساسي
    const filePath = path.join(process.cwd(), 'models.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawModels = JSON.parse(fileContent);

    const models: AIModel[] = rawModels.map((m: any) => {
      let provider = 'Local';
      let displayName = m.name;
      let logoUrl = '';
      if (m.name === 'Omni') {
        provider = 'System';
        displayName = 'Omni (Auto Route)';
        logoUrl = 'https://huggingface.co/api/avatars/huggingface'; // Omni uses HF logo
      } else if (m.name.includes('/')) {
        const parts = m.name.split('/');
        provider = parts[0];
        displayName = parts.slice(1).join('/');
        logoUrl = `https://huggingface.co/api/avatars/${encodeURIComponent(provider)}`;
      }

      const lowerDesc = (m.description_en || '').toLowerCase();
      const usage = m.usage || [];
      const lowerUsage = usage.join(' ').toLowerCase();

      const supportsImage = 
        lowerDesc.includes('vision') || 
        lowerDesc.includes('image') || 
        lowerDesc.includes('multimodal') || 
        lowerUsage.includes('vision') || 
        lowerUsage.includes('multimodal');

      const supportsTools = 
        lowerDesc.includes('tool') || 
        lowerDesc.includes('agent') || 
        lowerUsage.includes('tool') || 
        lowerUsage.includes('agent');

      return {
        id: m.name,
        name: displayName,
        provider: provider,
        description_ar: m.description_ar,
        usage: m.usage || [],
        supports_image: supportsImage,
        supports_tools: supportsTools,
        logoUrl: logoUrl,
      };
    });

    const priorityModels = [
      'Omni',
      'meta-llama/Llama-3.3-70B-Instruct',
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
