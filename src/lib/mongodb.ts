import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_DB_API;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGO_DB_API environment variable inside .env.local'
  );
}

/*----------
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
----------*/
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/*----------
 * دالة مبنية للاتصال بقاعدة بيانات MongoDB. 
 * تقوم هذه الدالة بحفظ اتصال قاعدة البيانات في الذاكرة (cache) لكي لا نفتح اتصالاً جديداً 
 * مع كل طلب (Request)، خاصة في بيئة التطوير. 
 * @returns تعيد كائن الاتصال بقاعدة البيانات.
----------*/
async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
