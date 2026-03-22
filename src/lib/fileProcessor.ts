/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  📎 معالج الملفات والصور (File & Image Processor)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  يوفر معالجة ذكية للملفات المرفقة في المحادثة:
 *  - قراءة الملفات النصية (.txt, .md, ملفات الكود)
 *  - تحليل الصور عبر نماذج VLM
 *  - دمج محتوى الملفات في البروبت
 *
 *  الأنواع المدعومة:
 *  📄 نصية: .txt, .md, .json, .csv, .xml, .yaml, .yml
 *  💻 كود: .js, .ts, .tsx, .jsx, .py, .java, .cpp, .c, .html, .css, .sql, .go, .rs, .rb, .php, .swift, .kt
 *  🖼️ صور: .jpg, .jpeg, .png, .gif, .webp, .bmp
 * ═══════════════════════════════════════════════════════════════════════
----------*/

// ── أنواع الملفات المدعومة ──

export const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'json', 'csv', 'xml', 'yaml', 'yml',
  'toml', 'ini', 'cfg', 'conf', 'env', 'log', 'sh', 'bat', 'ps1',
];

export const CODE_EXTENSIONS = [
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
  'html', 'css', 'scss', 'sass', 'less',
  'sql', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'kts',
  'vue', 'svelte', 'dart', 'r', 'lua', 'pl', 'scala',
  'dockerfile', 'makefile', 'cmake',
];

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

export const ALL_SUPPORTED_EXTENSIONS = [...TEXT_EXTENSIONS, ...CODE_EXTENSIONS, ...IMAGE_EXTENSIONS];

// ── MIME types ──
export const TEXT_MIME_TYPES = [
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
  'text/xml', 'text/yaml', 'text/x-python', 'text/x-java',
  'application/json', 'application/xml', 'application/yaml',
  'application/javascript', 'application/typescript',
];

export const IMAGE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
];

// ── أنواع TypeScript ──
export interface AttachedFile {
  id: string;
  name: string;
  type: 'text' | 'code' | 'image';
  mime: string;
  extension: string;
  size: number;
  content: string; // base64 for images, raw text for text/code
  preview?: string; // أول 200 حرف للنص، أو data URL للصور
}

export interface ProcessedAttachment {
  textContent: string; // محتوى نصي مدمج في البروبت
  imageUrls: { url: string; detail: string }[]; // URLs للصور (base64 data URLs)
  filesSummary: string; // ملخص الملفات المرفقة
}

/*----------
 * 🔍 تحديد نوع الملف من الامتداد
----------*/
export function getFileType(filename: string): 'text' | 'code' | 'image' | 'unsupported' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  return 'unsupported';
}

/*----------
 * 📝 تحديد لغة البرمجة من الامتداد
----------*/
export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    html: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    sql: 'sql', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
    swift: 'swift', kt: 'kotlin', kts: 'kotlin',
    vue: 'vue', svelte: 'svelte', dart: 'dart', r: 'r', lua: 'lua',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', markdown: 'markdown',
    sh: 'bash', bat: 'batch', ps1: 'powershell',
    dockerfile: 'dockerfile', makefile: 'makefile',
  };
  return map[ext.toLowerCase()] || 'text';
}

/*----------
 * 📖 قراءة ملف كنص (يعمل في المتصفح)
----------*/
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`فشل قراءة الملف: ${file.name}`));
    reader.readAsText(file);
  });
}

/*----------
 * 🖼️ قراءة ملف كـ Data URL (للصور)
----------*/
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`فشل قراءة الصورة: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/*----------
 * 🔧 معالجة ملف مرفق وتحويله لـ AttachedFile
----------*/
export async function processFile(file: File): Promise<AttachedFile | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const fileType = getFileType(file.name);

  if (fileType === 'unsupported') return null;

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

  if (fileType === 'image') {
    const dataUrl = await readFileAsDataURL(file);
    return {
      id,
      name: file.name,
      type: 'image',
      mime: file.type || 'image/jpeg',
      extension: ext,
      size: file.size,
      content: dataUrl,
      preview: dataUrl,
    };
  }

  // text / code
  const textContent = await readFileAsText(file);
  return {
    id,
    name: file.name,
    type: fileType,
    mime: file.type || 'text/plain',
    extension: ext,
    size: file.size,
    content: textContent,
    preview: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''),
  };
}

/*----------
 * 🏗️ تحضير الملفات المرفقة للإرسال مع البروبت
 * - الملفات النصية والكود: تُدمج في البروبت كـ <document>
 * - الصور: تُرسل كـ image_url parts
----------*/
export function prepareAttachments(files: AttachedFile[]): ProcessedAttachment {
  const textFiles = files.filter(f => f.type === 'text' || f.type === 'code');
  const imageFiles = files.filter(f => f.type === 'image');

  // تحويل الملفات النصية لمحتوى مدمج
  let textContent = '';
  if (textFiles.length > 0) {
    const parts = textFiles.map(f => {
      const lang = f.type === 'code' ? getLanguageFromExtension(f.extension) : f.extension;
      return `<document name="${f.name}" type="${lang}">\n${f.content}\n</document>`;
    });
    textContent = parts.join('\n\n');
  }

  // تحويل الصور لـ image_url format
  const imageUrls = imageFiles.map(f => ({
    url: f.content, // data URL
    detail: 'auto',
  }));

  // ملخص
  const summaryParts: string[] = [];
  if (textFiles.length > 0) summaryParts.push(`${textFiles.length} ملف نصي`);
  if (imageFiles.length > 0) summaryParts.push(`${imageFiles.length} صورة`);

  return {
    textContent,
    imageUrls,
    filesSummary: summaryParts.length > 0 ? `📎 مرفقات: ${summaryParts.join('، ')}` : '',
  };
}

/*----------
 * 📤 بناء messages array مع الملفات المرفقة
 * يُستخدم في API route لدمج الملفات مع الرسائل
----------*/
export function buildMessagesWithFiles(
  systemPrompt: string,
  previousMessages: { role: string; content: string }[],
  userMessage: string,
  attachments: ProcessedAttachment,
): any[] {
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  // رسائل سابقة
  for (const m of previousMessages) {
    messages.push({ role: m.role, content: m.content });
  }

  // رسالة المستخدم مع المرفقات
  let messageText = userMessage;
  if (attachments.textContent) {
    messageText = `${attachments.textContent}\n\n${userMessage}`;
  }

  if (attachments.imageUrls.length > 0) {
    // Multimodal message
    const content: any[] = [
      { type: 'text', text: messageText },
      ...attachments.imageUrls.map(img => ({
        type: 'image_url',
        image_url: { url: img.url, detail: img.detail },
      })),
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: messageText });
  }

  return messages;
}

/*----------
 * ✅ التحقق من دعم الملف
----------*/
export function isFileSupported(filename: string): boolean {
  return getFileType(filename) !== 'unsupported';
}

/*----------
 * 📏 حجم الملف المقروء
----------*/
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/*----------
 * 🖼️ أقصى حجم للملفات (5MB للصور، 2MB للنص)
----------*/
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TEXT_SIZE = 2 * 1024 * 1024; // 2MB

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const fileType = getFileType(file.name);
  const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_TEXT_SIZE;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `الملف ${file.name} كبير جداً (${formatFileSize(file.size)}). الحد الأقصى: ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}

/*----------
 * 📋 قائمة الامتدادات المدعومة كنص accept
----------*/
export function getSupportedAcceptString(): string {
  const imageTypes = IMAGE_MIME_TYPES.join(',');
  const textTypes = '.txt,.md,.json,.csv,.xml,.yaml,.yml,.toml,.ini,.env,.log';
  const codeTypes = '.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.hpp,.html,.css,.scss,.sql,.go,.rs,.rb,.php,.swift,.kt,.vue,.svelte,.dart';
  return `${imageTypes},${textTypes},${codeTypes}`;
}
