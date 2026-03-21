import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { signToken, setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/*----------
 * دالة إعادة التوجيه بعد تسجيل الدخول من جوجل (Callback).
 * تستقبل رمز التحقق (Code) من جوجل، وتتصل بخوادمهم لتبديله ببيانات المستخدم (Access Token)،
 * ثم تقوم بإيجاد المستخدم أو إنشائه في قاعدة البيانات (MongoDB)، وأخيراً إنشاء جلسة.
 * تحفظ كذلك صورة الأفتار من حساب جوجل وتحدث آخر ظهور.
 *
 * @param {Request} request - الطلب القادم من جوجل ويحتوي على الكود كمعامل في الرابط (Query Params).
 * @returns {NextResponse} توجيه إلى الصفحة الرئيسية في حالة النجاح، أو صفحة الدخول مع رسالة خطأ.
----------*/
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const baseURL = url.origin;

  if (!code) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthCodeMissing`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseURL}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthServerError`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
       return NextResponse.redirect(`${baseURL}/login?error=OAuthTokenError`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const googleUser = await userRes.json();

    if (!googleUser.email) {
       return NextResponse.redirect(`${baseURL}/login?error=OAuthEmailMissing`);
    }

    await connectToDatabase();
    
    let user = await User.findOne({ email: googleUser.email.toLowerCase() });
    
    if (!user) {
      // إنشاء مستخدم جديد مع حفظ صورة الأفتار من جوجل
      const randomPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        password: hashedPassword,
        avatar: googleUser.picture || '',
        isOnline: true,
        lastSeen: new Date(),
      });
    } else {
      // تحديث الأفتار وآخر ظهور للمستخدم الموجود
      user.avatar = googleUser.picture || user.avatar || '';
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar || '',
    };
    
    const token = await signToken(tokenPayload);
    await setSession(token);

    return NextResponse.redirect(`${baseURL}/`);
  } catch (error) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthServerError`);
  }
}
