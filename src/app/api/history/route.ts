import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import SearchHistory from '@/models/SearchHistory';
import { getSession } from '@/lib/auth';

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
