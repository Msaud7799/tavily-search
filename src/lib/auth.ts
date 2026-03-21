import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-key-for-jwt-tavily-app-999';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
}

/*----------
 * تقوم هذه الدالة بإنشاء توقيع (Token) جديد للمستخدم باستخدام JWT.
 * @param payload - البيانات التي نود تشفيرها ووضعها داخل التوكن (مثل رقم المستخدم، البريد، والاسم).
 * @returns تعيد التوكن كـ نص (String) صالح لمدة 7 أيام.
----------*/
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days expiration
    .sign(encodedSecret);
}

/*----------
 * تقوم هذه الدالة بالتحقق من صحة التوكن (Token) المرسل واستخراج البيانات منه.
 * @param token - نص التوكن المراد التحقق منه.
 * @returns تعيد بيانات المستخدم (TokenPayload) إذا كان التوكن صحيحاً، أو null في حال كان غير صالح.
----------*/
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

/*----------
 * تستخدم هذه الدالة لجلب الجلسة (Session) الحالية للمستخدم من خلال قراءة التوكن من ملفات تعريف الارتباط (Cookies).
 * @returns تعيد بيانات المستخدم إذا كان مسجلاً للدخول، وإلا تعيد null.
----------*/
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  return await verifyToken(token);
}

/*----------
 * تقوم هذه الدالة بتخزين توكن المصادقة في ملفات تعريف الارتباط (Cookies) الخاصة بالمتصفح.
 * تستخدم عند تسجيل الدخول لإنشاء جلسة جديدة.
 * @param token - التوكن المراد تخزينه.
----------*/
export async function setSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/*----------
 * تقوم هذه الدالة بحذف الجلسة الحالية من خلال إزالة التوكن من ملفات تعريف الارتباط.
 * تستخدم عند رغبة المستخدم في تسجيل الخروج لتنظيف المتصفح.
----------*/
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}
