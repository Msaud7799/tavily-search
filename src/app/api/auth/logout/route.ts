import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

/*----------
 * دالة مخصصة لإنهاء جلسة المستخدم الحالية وتسجيل الخروج.
 * تقوم بمسح توكن المصادقة من المتصفح لحماية بيانات المستخدم.
 *
 * @returns {NextResponse} استجابة بنجاح عملية تسجيل الخروج.
----------*/
export async function POST() {
  await clearSession();
  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
