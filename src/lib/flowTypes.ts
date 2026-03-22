/*----------
 * ═══════════════════════════════════════════════════════════════════════
 *  📊 أنواع تدفق العمليات (Flow Types)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  تعريفات TypeScript للجرافات الذكية:
 *  - أنواع خطوات التدفق (Flow Steps)
 *  - أنواع خيارات المستخدم (User Options)
 *  - أنواع حالة التفكير (Thinking State)
 *  - أنواع نتائج التنفيذ (Execution Results)
 * ═══════════════════════════════════════════════════════════════════════
----------*/

// ── حالة كل خطوة في التدفق ──
export type FlowStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

// ── خطوة واحدة في التدفق ──
export interface FlowStep {
  id: string;
  nodeId: string;
  label: string;
  labelAr: string;
  icon: string; // emoji
  status: FlowStepStatus;
  startTime?: number;
  endTime?: number;
  detail?: string;
  detailAr?: string;
}

// ── خيار يُعرض للمستخدم ──
export interface UserOption {
  id: string;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
}

// ── طلب خيارات من المستخدم ──
export interface UserOptionsRequest {
  question: string;
  questionAr: string;
  options: UserOption[];
  allowMultiple: boolean;
  required: boolean;
}

// ── حالة التفكير ──
export interface ThinkingState {
  isThinking: boolean;
  content: string;
  steps: string[];
}

// ── نتيجة تنفيذ الجراف ──
export interface GraphExecutionResult {
  // نتائج عامة
  answer: string;
  error?: string;

  // خطوات التدفق
  flowSteps: FlowStep[];

  // التفكير
  thinking?: ThinkingState;

  // خيارات للمستخدم (إذا كان الجراف يحتاج مدخلات)
  userOptionsRequest?: UserOptionsRequest;

  // بيانات إضافية حسب نوع الجراف
  metadata?: Record<string, any>;
}

// ── أنواع وظائف الجراف ──
export type GraphType = 'search' | 'chat';

// ── إعدادات تشغيل الجراف ──
export interface GraphRunConfig {
  query: string;
  graphType: GraphType;
  model: string;
  hfToken: string;
  tavilyApiKey?: string;
  enableThinking: boolean;
  aboutMe?: string;
  aiInstructions?: string;
  followMode?: string;
  instructionFileContent?: string;
  selectedUserOption?: string; // إذا المستخدم اختار خيار
  chatHistory?: { role: string; content: string }[];
}
