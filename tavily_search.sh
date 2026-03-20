#!/bin/bash

# مسار ملف حفظ مفتاح الـ API
CONFIG_FILE="$HOME/.tavily_config"

# التحقق من وجود مفتاح API محفوظ مسبقاً
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo -e "\e[33mمرحباً! يبدو أن هذه هي المرة الأولى التي تشغل فيها السكربت.\e[0m"
    read -p "الرجاء إدخال مفتاح Tavily API الخاص بك: " TAVILY_API_KEY
    
    if [ -z "$TAVILY_API_KEY" ]; then
        echo -e "\e[31mعذراً، لا يمكن ترك مفتاح الـ API فارغاً. جرب مرة أخرى.\e[0m"
        exit 1
    fi
    
    # حفظ المفتاح في ملف مخفي
    echo "TAVILY_API_KEY=\"$TAVILY_API_KEY\"" > "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE" # حماية الملف بحيث يقرأه المستخدم فقط
    echo -e "\e[32mتم حفظ مفتاح الـ API بنجاح في $CONFIG_FILE\e[0m\n"
fi

# طلب كلمة أو كلمات البحث من المستخدم
read -p "أدخل كلمة أو كلمات البحث: " QUERY

if [ -z "$QUERY" ]; then
    echo -e "\e[31mعذراً، يجب إدخال كلمات للبحث.\e[0m"
    exit 1
fi

echo -e "\e[36mجاري البحث عن: \"$QUERY\"...\e[0m\n"

# التحقق من وجود أداة jq لتنسيق مخرجات الـ JSON
if ! command -v jq &> /dev/null; then
    echo -e "\e[31mتنبيه: أداة 'jq' غير مثبتة. يرجى تثبيتها لعرض النتائج بشكل منسق (مثال: sudo apt install jq)\e[0m"
    # عرض النتائج بشكلها الخام إذا لم يكن jq متاحاً
    curl -s -X POST https://api.tavily.com/search \
        -H "Content-Type: application/json" \
        -d "{
            \"api_key\": \"$TAVILY_API_KEY\",
            \"query\": \"$QUERY\",
            \"max_results\": 10
        }"
    echo ""
    exit 1
fi

# تنظيف المدخلات لتجنب كسر كود الـ JSON
ESCAPED_QUERY=$(echo "$QUERY" | jq -R -s -c '.' | sed 's/^"//' | sed 's/"$//')

# إجراء البحث باستخدام curl و Tavily API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.tavily.com/search \
    -H "Content-Type: application/json" \
    -d "{
        \"api_key\": \"$TAVILY_API_KEY\",
        \"query\": \"$ESCAPED_QUERY\",
        \"max_results\": 10
    }")

# فصل كود الاستجابة عن محتوى الرد
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    # التحقق مما إذا كانت هناك نتائج
    RESULT_COUNT=$(echo "$BODY" | jq '.results | length')
    
    if [ "$RESULT_COUNT" -eq 0 ]; then
        echo -e "\e[33mلم يتم العثور على أي نتائج لبحثك.\e[0m"
    else
        echo -e "\e[32mتم العثور على نتائج!\e[0m\n"
        # تنسيق وعرض النتائج بصيغة مقروءة باستخدام jq
        echo "$BODY" | jq -r '.results | to_entries | .[] | "\(.key + 1). \u001b[1;34m\(.value.title)\u001b[0m\n   \u001b[4;36m\(.value.url)\u001b[0m\n   \(.value.content[0:200])...\n---------------------------------------------------"'
    fi
else
    echo -e "\e[31mحدث خطأ أثناء البحث. رمز الخطأ: $HTTP_CODE\e[0m"
    echo "التفاصيل: $(echo "$BODY" | jq -r '.detail // .error // "خطأ غير معروف"')"
    
    # إذا كان المفتاح غير صالح مثلاً، تخيير المستخدم بحذف الملف القديم
    echo ""
    read -p "هل ترغب في إعادة ضبط (حذف) مفتاح الـ API المحفوظ لإدخاله من جديد في المرة القادمة؟ (y/n): " DEL_KEY
    if [[ "$DEL_KEY" == "y" || "$DEL_KEY" == "Y" ]]; then
        rm -f "$CONFIG_FILE"
        echo -e "\e[32mتم حذف المفتاح المحفوظ. سيُطلب منك المفتاح في المرة القادمة.\e[0m"
    fi
fi
