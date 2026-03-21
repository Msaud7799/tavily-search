import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken, setSession } from '@/lib/auth';

/*----------
 * تسجيل دخول مستخدم موجود في قاعدة البيانات.
 * تتحقق من صحة البريد الإلكتروني وكلمة المرور وتقوم بإنشاء توكن جلسة (Session).
 *
 * @param {Request} request - يحتوي على البيانات المرسلة من المتصفح (البريد وكلمة المرور).
 * @returns {NextResponse} استجابة تنجح بتسجيل الدخول أو تعيد رسالة خطأ.
----------*/
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const token = await signToken(tokenPayload);
    await setSession(token);

    return NextResponse.json(
      { message: 'Login successful', user: { id: user._id, name: user.name, email: user.email } },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
