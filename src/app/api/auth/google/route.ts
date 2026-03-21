import { NextResponse } from 'next/server';

/*----------
 * تسجيل الدخول باستخدام حساب جوجل (البداية).
 * تقوم هذه الدالة بإعادة توجيه المستخدم إلى صفحة تسجيل الدخول الخاصة بجوجل
 * طالبة الصلاحيات الخاصة بالبريد الإلكتروني والملف الشخصي.
 *
 * @param {Request} request - كائن الطلب القادم من العميل لمعرفة مصدر الطلب (origin).
 * @returns {NextResponse} توجيه (Redirect) لصفحة حسابات جوجل.
----------*/
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${origin}/api/auth/callback/google`;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Google Client ID missing' }, { status: 500 });
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
  
  return NextResponse.redirect(url);
}
