import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SearchHistory from "@/models/SearchHistory";
import { NextResponse } from "next/server";

/*----------
 * إنشاء مدخل جديد في سجل البحث الخاص بالمستخدم.
 * تحفظ الاستعلام ونوع العملية والبيانات الكاملة للنتيجة في MongoDB.
 * هذا يسمح للمستخدم بالرجوع لأي نتيجة بحث سابقة حتى بعد تسجيل الخروج.
 *
 * @param {Request} request - الطلب القادم ويحتوي على query, action, data, aiAnswer.
 * @returns {NextResponse} الرد بحالة نجاح حفظ السجل أو رسالة بالخطأ.
----------*/
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { query, action, data, aiAnswer } = await request.json();
    if (!query) {
      return NextResponse.json(
        { message: "Query is required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const history = await SearchHistory.create({
      userId: session.userId,
      query,
      action: action || "search",
      data: data || null,
      aiAnswer: aiAnswer || "",
    });

    return NextResponse.json({ history }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

/*----------
 * جلب سجل البحث الخاص بالمستخدم مع البيانات الكاملة.
 * تقوم بقراءة قواعد البيانات وجلب آخر 50 عملية بحث قام بها المستخدم الحالي.
 *
 * @returns {NextResponse} مصفوفة من السجلات القديمة مع بياناتها الكاملة.
----------*/
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const history = await SearchHistory.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ history }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await SearchHistory.deleteMany({ userId: session.userId });

    return NextResponse.json({ message: "Cleared" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
