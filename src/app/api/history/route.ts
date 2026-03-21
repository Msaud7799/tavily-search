import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import SearchHistory from '@/models/SearchHistory';
import { getSession } from '@/lib/auth';

/*----------
 * إنشاء مدخل جديد في سجل البحث الخاص بالمستخدم.
 * تتطلب أن يكون المستخدم مسجلاً للدخول لتحفظ كلمة أو جملة البحث التي أدخلها.
 *
 * @param {Request} request - الطلب القادم ويحتوي على نص البحث (query).
 * @returns {NextResponse} الرد بحالة نجاح حفظ السجل أو رسالة بالخطأ في حال عدم وجود صلاحية.
----------*/
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query) {
      return NextResponse.json({ message: 'Query is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const history = await SearchHistory.create({
      userId: session.userId,
      query,
    });

    return NextResponse.json({ history }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/*----------
 * جلب سجل البحث الخاص بالمستخدم.
 * تقوم بقراءة قواعد البيانات وجلب آخر 50 عملية بحث قام بها المستخدم الحالي.
 *
 * @returns {NextResponse} مصفوفة من السجلات القديمة مع التواريخ والأوقات لعمليات البحث الخاصة به.
----------*/
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const history = await SearchHistory.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(50); // Get last 50 searches

    return NextResponse.json({ history }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
