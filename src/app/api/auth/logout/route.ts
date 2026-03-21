import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

/*----------
 * دالة مخصصة لإنهاء جلسة المستخدم الحالية وتسجيل الخروج.
 * تقوم بمسح توكن المصادقة من المتصفح لحماية بيانات المستخدم،
 * وتحدث حالة المستخدم في قاعدة البيانات إلى (أوفلاين).
 *
 * @returns {NextResponse} استجابة بنجاح عملية تسجيل الخروج.
----------*/
export async function POST() {
  try {
    const session = await getSession();
    if (session?.userId) {
      await connectToDatabase();
      await User.findByIdAndUpdate(session.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }
  } catch {
    // لا نمنع الخروج حتى لو فشل تحديث DB
  }

  await clearSession();
  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
