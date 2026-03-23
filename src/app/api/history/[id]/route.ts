import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import SearchHistory from '@/models/SearchHistory';
import { getSession } from '@/lib/auth';

/*----------
 * DELETE /api/history/[id] — حذف سجل بحث واحد بالـ ID.
----------*/
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await connectToDatabase();

    const result = await SearchHistory.findOneAndDelete({
      _id: id,
      userId: session.userId,
    });

    if (!result) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
