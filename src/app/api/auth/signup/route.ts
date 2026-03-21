import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken, setSession } from '@/lib/auth';

/*----------
 * دالة إنشاء حساب لمستخدم جديد في النظام.
 * تقوم بحفظ البيانات بعد التأكد من عدم وجود وبريد إلكتروني مكرر ثم تقوم بتشفير كلمة المرور.
 *
 * @param {Request} request - كائن الطلب القادم من العميل يحتوي على البيانات.
 * @returns {NextResponse} الاستجابة بنجاح التسجيل أو إخفاقه.
----------*/
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const token = await signToken(tokenPayload);
    await setSession(token);

    return NextResponse.json(
      { message: 'User created successfully', user: { id: user._id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
