# 🧠 Tavily AI Search & Chat

> منصة بحث ذكية ومحادثة متقدمة مبنية بـ LangGraph + Next.js + MongoDB

---

## 🏗️ هيكلية المشروع

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                    # AI endpoint عام
│   │   ├── analyze-image/         # تحليل الصور عبر VLM
│   │   ├── chat/                  # محادثة ذكية
│   │   ├── process-file/          # معالجة الملفات المرفقة
│   │   ├── smart-search/          # بحث ذكي بـ LangGraph
│   │   ├── tavily/                # بحث مباشر Tavily
│   │   ├── auth/                  # مصادقة (login, signup, google)
│   │   ├── chats/                 # CRUD محادثات
│   │   ├── history/               # سجل البحث
│   │   ├── models/                # قائمة النماذج
│   │   └── settings/              # إعدادات المستخدم
│   ├── page.tsx                   # الصفحة الرئيسية
│   └── layout.tsx                 # التخطيط العام
├── components/
│   ├── ChatWindow.tsx             # واجهة المحادثة
│   ├── SearchBox.tsx              # مربع البحث
│   ├── Sidebar.tsx                # القائمة الجانبية
│   ├── SettingsPanel.tsx          # لوحة الإعدادات
│   ├── MarkdownRender.tsx         # عرض Markdown مع syntax highlighting
│   ├── ThinkingBlock.tsx          # عرض كتل التفكير
│   └── ChatActions.tsx            # اختصارات المحادثة
├── hooks/
│   └── useTypingEffect.ts         # تأثير الكتابة التدريجية
├── lib/
│   ├── searchGraph.ts             # 🧠 جراف البحث الذكي (LangGraph)
│   ├── chatGraph.ts               # 💬 جراف المحادثة الذكي (LangGraph)
│   ├── graphUtils.ts              # أدوات مشتركة للجرافات
│   ├── flowTypes.ts               # أنواع التدفق والحالة
│   ├── langchainService.ts        # خدمة LangChain الموحدة
│   ├── fileProcessor.ts           # معالج الملفات والصور
│   ├── omniResolver.ts            # اختيار النموذج الذكي (Omni)
│   ├── mongodb.ts                 # اتصال MongoDB
│   └── auth.ts                    # مصادقة JWT
├── models/                        # Mongoose models
│   ├── User.ts
│   ├── Chat.ts
│   └── SearchHistory.ts
├── context/
│   ├── AppModeContext.tsx          # سياق الوضع (بحث/محادثة)
│   ├── AuthContext.tsx             # سياق المصادقة
│   └── ThemeContext.tsx            # سياق المظهر
└── types.ts                       # تعريفات الأنواع
```

---

## 🧠 جراف البحث الذكي (Search Graph)

```mermaid
flowchart TD
    START((▶ بداية)) --> A["🔍 تحليل السؤال<br/><small>analyzeQuery</small>"]
    
    A --> D1{هل يحتاج<br/>خيارات؟}
    
    D1 -- "✅ نعم" --> B["📋 سؤال المستخدم<br/><small>askUserOptions</small>"]
    D1 -- "❌ لا" --> C["📝 تخطيط البحث<br/><small>planSearch</small>"]
    
    B --> END1((⏸ انتظار رد المستخدم))
    
    C --> E["🌐 تنفيذ البحث<br/><small>executeSearch (Tavily)</small>"]
    E --> F["🔬 فلترة النتائج<br/><small>filterResults</small>"]
    
    F --> D2{نتائج كافية؟}
    D2 -- "❌ إعادة" --> C
    
    D2 -- "🧠 تفكير ON" --> G["🧠 التفكير العميق<br/><small>thinkAndReason</small>"]
    D2 -- "⚡ تفكير OFF" --> H["✨ توليد الإجابة<br/><small>generateAnswer</small>"]
    
    G --> H
    H --> END2((✅ نهاية))

    style START fill:#10b981,stroke:#059669,color:#fff
    style END1 fill:#f59e0b,stroke:#d97706,color:#fff
    style END2 fill:#10b981,stroke:#059669,color:#fff
    style A fill:#3b82f6,stroke:#2563eb,color:#fff
    style B fill:#f59e0b,stroke:#d97706,color:#fff
    style C fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style E fill:#06b6d4,stroke:#0891b2,color:#fff
    style F fill:#ec4899,stroke:#db2777,color:#fff
    style G fill:#f97316,stroke:#ea580c,color:#fff
    style H fill:#10b981,stroke:#059669,color:#fff
    style D1 fill:#1e293b,stroke:#475569,color:#fff
    style D2 fill:#1e293b,stroke:#475569,color:#fff
```

### عقد البحث:

| العقدة | الوظيفة | المدخلات | المخرجات |
|--------|---------|----------|----------|
| `analyzeQuery` | تحليل نية السؤال ونوعه | السؤال الأصلي | intent, keywords, complexity |
| `askUserOptions` | عرض خيارات للمستخدم | التحليل | خيارات قابلة للاختيار |
| `planSearch` | بناء خطة بحث ذكية | التحليل + الخيار | primaryQuery, searchDepth |
| `executeSearch` | تنفيذ البحث عبر Tavily | خطة البحث | نتائج + إجابة أولية |
| `filterResults` | فلترة وترتيب النتائج | النتائج الخام | نتائج مفلترة |
| `thinkAndReason` | تحليل عميق (toggle) | النتائج المفلترة | تفكير واستنتاجات |
| `generateAnswer` | توليد إجابة شاملة | كل ما سبق | إجابة Markdown |

---

## 💬 جراف المحادثة الذكي (Chat Graph)

```mermaid
flowchart TD
    START((▶ بداية)) --> A["🔍 تحليل النية<br/><small>analyzeIntent</small>"]
    
    A --> B["🎯 اختيار النموذج<br/><small>selectModel (Omni)</small>"]
    B --> C["📋 فحص الخيارات<br/><small>checkOptions</small>"]
    
    C --> D1{خيارات<br/>للمستخدم؟}
    
    D1 -- "✅ نعم" --> D["📋 عرض خيارات<br/><small>presentOptions</small>"]
    
    D1 -- "🧠 تفكير ON" --> E["🧠 تفكير عميق<br/><small>deepThink</small>"]
    D1 -- "⚡ تفكير OFF" --> F["✨ توليد الرد<br/><small>generateResponse</small>"]
    
    D --> END1((⏸ انتظار))
    E --> F
    F --> END2((✅ نهاية))

    style START fill:#10b981,stroke:#059669,color:#fff
    style END1 fill:#f59e0b,stroke:#d97706,color:#fff
    style END2 fill:#10b981,stroke:#059669,color:#fff
    style A fill:#3b82f6,stroke:#2563eb,color:#fff
    style B fill:#f97316,stroke:#ea580c,color:#fff
    style C fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style D fill:#f59e0b,stroke:#d97706,color:#fff
    style E fill:#f97316,stroke:#ea580c,color:#fff
    style F fill:#10b981,stroke:#059669,color:#fff
    style D1 fill:#1e293b,stroke:#475569,color:#fff
```

### عقد المحادثة:

| العقدة | الوظيفة | المدخلات | المخرجات |
|--------|---------|----------|----------|
| `analyzeIntent` | فهم نوع الطلب | الرسالة | type, complexity, needsClarification |
| `selectModel` | اختيار النموذج (Omni) | التحليل | النموذج المناسب |
| `checkOptions` | هل يحتاج خيارات؟ | التحليل | قرار التوجيه |
| `presentOptions` | عرض خيارات | الخيارات | طلب خيار من المستخدم |
| `deepThink` | تفكير خطوة بخطوة | الرسالة + السياق | تفكير منظم |
| `generateResponse` | توليد الرد النهائي | كل ما سبق | رد Markdown |

---

## 📎 معالجة الملفات

```mermaid
flowchart LR
    U["👤 المستخدم"] --> |"📄 رفع ملف"| FP["🔧 fileProcessor"]
    
    FP --> D1{نوع الملف؟}
    
    D1 -- "📄 .txt/.md" --> T["نص خام"]
    D1 -- "💻 .js/.py/..." --> C["كود مع لغة"]
    D1 -- "🖼️ .jpg/.png" --> I["صورة base64"]
    
    T --> M["📦 دمج في البروبت<br/><small>&lt;document&gt;</small>"]
    C --> M
    I --> V["🤖 تحليل VLM<br/><small>Qwen-VL / Llama-4</small>"]
    V --> M
    
    M --> AI["🧠 النموذج"]
    
    style U fill:#3b82f6,stroke:#2563eb,color:#fff
    style FP fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style T fill:#10b981,stroke:#059669,color:#fff
    style C fill:#f97316,stroke:#ea580c,color:#fff
    style I fill:#ec4899,stroke:#db2777,color:#fff
    style V fill:#06b6d4,stroke:#0891b2,color:#fff
    style M fill:#f59e0b,stroke:#d97706,color:#fff
    style AI fill:#1e293b,stroke:#475569,color:#fff
    style D1 fill:#1e293b,stroke:#475569,color:#fff
```

### الأنواع المدعومة:

| النوع | الامتدادات |
|-------|-----------|
| 📄 نصي | `.txt` `.md` `.json` `.csv` `.xml` `.yaml` `.yml` `.toml` `.env` `.log` |
| 💻 كود | `.js` `.ts` `.tsx` `.py` `.java` `.cpp` `.c` `.html` `.css` `.sql` `.go` `.rs` `.rb` `.php` `.swift` `.kt` `.vue` `.svelte` |
| 🖼️ صور | `.jpg` `.jpeg` `.png` `.gif` `.webp` `.bmp` |

---

## 🔄 التدفق الكامل (Full Flow)

```mermaid
flowchart TB
    subgraph Frontend ["🖥️ واجهة المستخدم"]
        UI["ChatWindow / SearchBox"]
        TG["Toggle: تفكير ON/OFF"]
        FA["📎 رفع ملفات"]
    end
    
    subgraph Graphs ["🧠 جرافات LangGraph"]
        SG["Search Graph<br/><small>7 عقد</small>"]
        CG["Chat Graph<br/><small>6 عقد</small>"]
    end
    
    subgraph Services ["⚙️ خدمات"]
        LS["langchainService<br/><small>موحد</small>"]
        FP["fileProcessor<br/><small>ملفات + صور</small>"]
        OR["omniResolver<br/><small>اختيار نموذج</small>"]
    end
    
    subgraph APIs ["🌐 APIs خارجية"]
        HF["HuggingFace<br/><small>نماذج لغة</small>"]
        TV["Tavily<br/><small>بحث ويب</small>"]
    end
    
    subgraph DB ["💾 قاعدة البيانات"]
        MG["MongoDB<br/><small>users, chats, searchhistories</small>"]
    end
    
    UI --> |"بحث"| SG
    UI --> |"محادثة"| CG
    UI --> FA
    TG --> SG
    TG --> CG
    FA --> FP
    FP --> CG
    
    SG --> LS
    CG --> LS
    LS --> OR
    LS --> HF
    SG --> TV
    
    CG --> MG
    SG --> MG
    
    style Frontend fill:#1e293b,stroke:#475569,color:#fff
    style Graphs fill:#1e293b,stroke:#3b82f6,color:#fff
    style Services fill:#1e293b,stroke:#8b5cf6,color:#fff
    style APIs fill:#1e293b,stroke:#10b981,color:#fff
    style DB fill:#1e293b,stroke:#f59e0b,color:#fff
```

---

## ⚙️ إعداد المشروع

### المتطلبات
- Node.js 18+
- pnpm
- MongoDB (Atlas أو Local)

### التثبيت
```bash
git clone https://github.com/Msaud7799/tavily-search.git
cd tavily-search
pnpm install
```

### المتغيرات البيئية (.env.local)
```env
HF_TOKEN=hf_xxxxxxxxxxxxx
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
```

### التشغيل
```bash
pnpm dev     # وضع التطوير
pnpm build   # بناء الإنتاج
pnpm start   # تشغيل الإنتاج
```

---

## 🗃️ MongoDB Schema

```mermaid
erDiagram
    USERS {
        ObjectId _id
        String name
        String email
        String password
        String avatar
        Boolean isOnline
        Date lastSeen
        Object settings
    }
    
    CHATS {
        ObjectId _id
        ObjectId userId
        String title
        String model
        Array messages
        Date createdAt
    }
    
    SEARCHHISTORIES {
        ObjectId _id
        ObjectId userId
        String query
        String action
        Object data
        String aiAnswer
        Date createdAt
    }
    
    USERS ||--o{ CHATS : "has"
    USERS ||--o{ SEARCHHISTORIES : "has"
```

---

## 🛠️ التقنيات

| التقنية | الاستخدام |
|---------|-----------|
| **Next.js 16** | إطار العمل الأساسي |
| **LangGraph** | بناء جرافات التفكير الذكي |
| **Tavily API** | بحث الويب المتقدم |
| **HuggingFace** | نماذج اللغة (Llama 3.3, Qwen, etc.) |
| **MongoDB** | قاعدة البيانات |
| **Framer Motion** | الرسوم المتحركة |
| **react-syntax-highlighter** | تمييز الكود |
| **TypeScript** | أمان الأنواع |

---

## 📄 الرخصة

MIT License