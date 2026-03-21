'use client';

import { MapResponse } from '@/types';
import { Map, ExternalLink, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MapViewerProps {
  data: MapResponse;
}

/*----------
 * مكون عرض خريطة الموقع (MapViewer).
 * يُظهر الروابط المكتشفة من عملية فحص الخرائط أو زحف المواقع، بحيث يسهل تصفحها والضغط عليها.
 *
 * @param {MapResponse} data - البيانات المرجعية للروابط.
 * @returns {JSX.Element} بطاقة تعرض قائمة طويلة من الروابط مع شريط إحصائيات.
----------*/
export default function MapViewer({ data }: MapViewerProps) {
  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-16 space-y-6" dir="rtl">
      {/* Stats bar----------*/}
      <div className="flex justify-between items-end text-sm text-gray-500 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span>تم اكتشاف {data.results?.length || 0} رابط</span>
          <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full" dir="ltr">
            {data.base_url}
          </span>
        </div>
        <span dir="ltr">⏱ {data.response_time?.toFixed(2)}s</span>
      </div>

      {/* Map Header Card----------*/}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-amber-500/20 rounded-xl">
            <Map className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">خريطة الموقع</h2>
          <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
            {data.results?.length || 0} رابط
          </span>
        </div>

        {/* URL List----------*/}
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
          {data.results?.map((url, index) => (
            <motion.a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 hover:border-amber-500/30 group transition-all"
              dir="ltr"
            >
              <Link2 className="h-3.5 w-3.5 text-amber-500/50 group-hover:text-amber-400 shrink-0 transition-colors" />
              <span className="text-gray-300 group-hover:text-white text-sm truncate flex-1 transition-colors">
                {url}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-amber-400 shrink-0 transition-colors" />
            </motion.a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
