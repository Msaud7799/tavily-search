/**
 * حل مراجع الملفات العائدة من أدوات MCP (مثل الصور والمستندات)
 */
export function extractFileRefsFromToolResult(result: unknown) {
  const fileRefs: string[] = [];
  
  if (Array.isArray(result)) {
    for (const item of result) {
      if (typeof item === 'object' && item !== null && 'type' in item) {
        if (item.type === 'resource' && item.resource) {
          // استخراج مسار المورد أو الـ base64
          if (item.resource.uri) {
            fileRefs.push(item.resource.uri);
          }
        }
      }
    }
  }

  return fileRefs;
}

export function formatRefsForChat(refs: string[]) {
  if (refs.length === 0) return "";
  return `[ملفات تم استرجاعها من الأداة: ${refs.join(', ')}]`;
}
