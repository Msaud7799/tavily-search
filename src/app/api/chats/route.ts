import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/models/Chat';
import { getSession } from '@/lib/auth';

/*----------
 * GET /api/chats — جلب جميع محادثات المستخدم.
 * تعيد قائمة بالمحادثات مرتبة من الأحدث للأقدم (أقصى 50 محادثة).
----------*/
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const chats = await Chat.find({ userId: session.userId })
      .select('title messages model createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    return NextResponse.json({ chats }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
