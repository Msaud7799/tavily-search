'use client';

import { useState, useEffect, useRef } from 'react';

/*----------
 * هوك useTypingEffect:
 * يُحاكي تأثير الكتابة التدريجية (Typewriter Effect) لعرض النصوص بشكل متتالي حرفاً بحرف.
 * مفيد لعرض ردود الذكاء الاصطناعي بشكل أكثر واقعية وتفاعلية.
 *
 * @param {string} fullText - النص الكامل الذي سيتم عرضه تدريجياً.
 * @param {number} speed - سرعة الكتابة بالمللي ثانية (كل كم مللي ثانية يُضاف حرف).
 * @param {boolean} enabled - تفعيل/تعطيل التأثير.
 * @returns {{ displayedText: string, isTyping: boolean }} - النص المعروض حالياً وحالة الكتابة.
----------*/
export function useTypingEffect(
  fullText: string,
  speed: number = 15,
  enabled: boolean = true
): { displayedText: string; isTyping: boolean } {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const prevTextRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    // إذا تغير النص الكامل (رد جديد)
    if (fullText !== prevTextRef.current) {
      // إذا النص الجديد يبدأ بالنص القديم ← إضافة (streaming)
      if (fullText.startsWith(prevTextRef.current) && prevTextRef.current.length > 0) {
        indexRef.current = prevTextRef.current.length;
      } else {
        // نص جديد بالكامل
        indexRef.current = 0;
        setDisplayedText('');
      }
      prevTextRef.current = fullText;
    }

    if (indexRef.current >= fullText.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    const timer = setInterval(() => {
      if (indexRef.current < fullText.length) {
        // إضافة عدة أحرف في المرة الواحدة لتسريع العرض
        const chunkSize = Math.min(3, fullText.length - indexRef.current);
        const nextChunk = fullText.slice(indexRef.current, indexRef.current + chunkSize);
        setDisplayedText((prev) => prev + nextChunk);
        indexRef.current += chunkSize;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [fullText, speed, enabled]);

  return { displayedText, isTyping };
}
