import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

/*----------
 * دالة للتحقق من بيانات المستخدم (الجلسة) الحالية.
 * تُستخدم هذه الدالة بشكل مستمر لمعرفة ما إذا كان المستخدم مسجل الدخول أم لا.
 * تقوم بجلب البيانات الكاملة من قاعدة البيانات (بما في ذلك الأفتار والإعدادات).
 *
 * @returns {NextResponse} تُرجع بيانات المستخدم الكاملة إذا كان التوكن صالحاً.
----------*/
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const dbUser = await User.findById(session.userId).select('-password');
    
    if (!dbUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // تحديث آخر ظهور
    dbUser.lastSeen = new Date();
    dbUser.isOnline = true;
    await dbUser.save();

    return NextResponse.json({
      user: {
        userId: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatar || '',
        isOnline: dbUser.isOnline,
        lastSeen: dbUser.lastSeen,
        settings: dbUser.settings || {},
        createdAt: dbUser.createdAt,
      },
    }, { status: 200 });
  } catch {
    // إذا فشل جلب البيانات من DB، ارجع البيانات الأساسية من التوكن
    return NextResponse.json({
      user: {
        userId: session.userId,
        name: session.name,
        email: session.email,
        avatar: session.avatar || '',
      },
    }, { status: 200 });
  }
}
