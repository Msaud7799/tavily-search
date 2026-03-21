import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/*----------
 * دالة للتحقق من بيانات المستخدم (الجلسة) الحالية.
 * تُستخدم هذه الدالة بشكل مستمر لمعرفة ما إذا كان المستخدم مسجل الدخول أم لا.
 *
 * @returns {NextResponse} تُرجع بيانات المستخدم إذا كان التوكن صالحاً، وإلا تعيد استجابة بالخطأ أو null.
----------*/
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session }, { status: 200 });
}
