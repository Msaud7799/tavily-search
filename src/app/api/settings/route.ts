import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

/*----------
 * حفظ إعدادات المستخدم في قاعدة البيانات.
 * تُستخدم لتخزين تفضيلات المستخدم (المظهر، النبذة، مفاتيح API) بحيث تبقى محفوظة
 * حتى بعد تسجيل الخروج وتسجيل الدخول من جهاز آخر.
 *
 * @param {Request} request - يحتوي على الإعدادات المراد حفظها.
 * @returns {NextResponse} رسالة نجاح أو خطأ.
----------*/
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, bio, displayName, tavilyKey, hfKey } = body;

    await connectToDatabase();

    const updateData: any = {};
    if (theme !== undefined) updateData['settings.theme'] = theme;
    if (bio !== undefined) updateData['settings.bio'] = bio;
    if (displayName !== undefined) updateData['settings.displayName'] = displayName;
    if (tavilyKey !== undefined) updateData['settings.tavilyKey'] = tavilyKey;
    if (hfKey !== undefined) updateData['settings.hfKey'] = hfKey;

    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: updateData },
      { new: true }
    ).select('settings');

    return NextResponse.json({ settings: user?.settings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/*----------
 * جلب إعدادات المستخدم الحالية من قاعدة البيانات.
 *
 * @returns {NextResponse} الإعدادات المحفوظة.
----------*/
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select('settings');

    return NextResponse.json({ settings: user?.settings || {} }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
