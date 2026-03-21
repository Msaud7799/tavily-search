import mongoose, { Document, Model, Schema } from 'mongoose';

/*----------
 * واجهة سجل البحث (ISearchHistory): تصف بنية كل عملية بحث محفوظة في قاعدة البيانات.
 * تحتفظ بالاستعلام، نوع العملية (بحث/استخراج/زحف...)، والبيانات الكاملة للنتيجة،
 * بحيث يقدر المستخدم يرجع لها في أي وقت حتى بعد تسجيل الخروج.
----------*/
export interface ISearchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  query: string;
  action: 'search' | 'extract' | 'crawl' | 'map' | 'research';
  data: any;
  aiAnswer?: string;
  createdAt: Date;
}

const SearchHistorySchema: Schema<ISearchHistory> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ['search', 'extract', 'crawl', 'map', 'research'],
      default: 'search',
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    aiAnswer: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const SearchHistory: Model<ISearchHistory> = mongoose.models.SearchHistory || mongoose.model<ISearchHistory>('SearchHistory', SearchHistorySchema);

export default SearchHistory;
