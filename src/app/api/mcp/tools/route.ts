import { NextResponse } from 'next/server';
import { getOpenAiToolsForMcp } from '@/lib/server/mcp/tools';

export async function POST(req: Request) {
  try {
    const { server } = await req.json();
    if (!server) {
      return NextResponse.json({ error: 'إعدادات السيرفر مطلوبة' }, { status: 400 });
    }
    
    const { tools } = await getOpenAiToolsForMcp([server]);
    
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error('[API/MCP/Tools] Error loading tools:', error);
    return NextResponse.json({ error: 'فشل جلب الأدوات', details: error.message }, { status: 500 });
  }
}
