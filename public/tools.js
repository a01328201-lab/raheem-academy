(function () {
  'use strict';

  const sections = {
    general: {
      title: '👋 المساعد العام',
      subtitle: 'اختر موضوعًا للبدء.',
      tools: [
        ['💬 سؤال عام', 'ساعدني في موضوع عام واشرح لي خطوة بخطوة.'],
        ['🧠 شرح مفهوم', 'اشرح لي مفهومًا صعبًا بطريقة بسيطة مع أمثلة.'],
        ['✍️ كتابة نص', 'ساعدني في كتابة نص واضح ومرتب حسب طلبي.'],
        ['🔍 حل مشكلة', 'ساعدني في تشخيص مشكلة، واسألني عن التفاصيل الناقصة.']
      ]
    },
    apk: {
      title: '📱 أدوات APK',
      subtitle: 'استكشف بنية التطبيقات والتعديل عليها بصورة قانونية.',
      tools: [
        ['📦 بنية APK', 'اشرح لي مكونات ملف APK ووظيفة كل جزء.'],
        ['🛠️ أدوات الفحص', 'ما أدوات فحص APK على أندرويد وTermux؟ اشرح الاستخدام الآمن.'],
        ['🎨 تعديل الموارد', 'اشرح تعديل الأيقونات والنصوص والموارد في تطبيق أملكه.'],
        ['🐞 حل خطأ تثبيت', 'ساعدني في تشخيص خطأ تثبيت APK. اذكر المعلومات التي تحتاجها.'],
        ['🔏 التوقيع', 'اشرح توقيع APK بعد التعديل وكيف أتحقق من سلامته.'],
        ['📚 تعلم الأساسيات', 'ضع لي مسار تعلم للمبتدئ في تحليل وبناء APK.']
      ]
    },
    termux: {
      title: '💻 أدوات Termux',
      subtitle: 'أوامر وإعدادات وبرمجة على أندرويد.',
      tools: [
        ['📥 تثبيت الحزم', 'اشرح إدارة الحزم وتثبيت الأدوات في Termux.'],
        ['📁 الملفات والمجلدات', 'علمني أوامر الملفات والمجلدات في Termux بأمثلة.'],
        ['🟢 Node.js و npm', 'ساعدني في إعداد Node.js وnpm والتحقق من التثبيت.'],
        ['🐍 Python', 'اشرح تثبيت Python وإدارة الحزم في Termux.'],
        ['🌐 خادم محلي', 'علمني تشغيل خادم محلي تجريبي في Termux.'],
        ['🧯 إصلاح الأخطاء', 'ساعدني في فهم رسالة خطأ في Termux وسأرسلها لك.']
      ]
    },
    root: {
      title: '🔓 أدوات الروت',
      subtitle: 'افهم الصلاحيات والمخاطر قبل إجراء أي تغيير.',
      tools: [
        ['🔎 فحص حالة الروت', 'كيف أتحقق من حالة الروت وصلاحياته بأمان؟'],
        ['🧩 Magisk', 'اشرح واجهة Magisk وإدارة الوحدات ومخاطرها.'],
        ['📦 الوحدات', 'كيف أفحص توافق وحدة Magisk قبل تثبيتها؟'],
        ['💾 النسخ الاحتياطي', 'ساعدني في وضع خطة نسخ احتياطي قبل تعديل النظام.'],
        ['⚠️ حل مشكلة', 'ساعدني في تشخيص مشكلة روت دون تنفيذ تغييرات مدمرة.']
      ]
    },
    recovery: {
      title: '💚 التعافي من العادات الإباحية',
      subtitle: 'خطوات عملية بلا لوم أو إحراج، والتقدم يكون بالتدريج.',
      tools: [
        ['🧠 فهم المحفزات', 'ساعدني أفهم المحفزات والعادات التي تدفعني لمشاهدة الإباحية أو ممارسة العادة السرية، بأسئلة محترمة ومن غير تفاصيل محرجة.'],
        ['⏳ التعامل مع الرغبة', 'علمني خطة قصيرة وآمنة أطبقها عندما تأتي رغبة ملحّة: تغيير المكان، إبعاد الهاتف، نشاط بديل، وتأجيل الاستجابة.'],
        ['📵 حجب المحتوى', 'ساعدني أضع إعدادات آمنة لتقليل الوصول للمواقع الإباحية وتفعيل البحث الآمن والقيود المناسبة على هاتفي.'],
        ['🌙 خطة وقت الليل', 'ضع لي روتينًا واقعيًا قبل النوم يقلل التصفح المنفرد والسهر، مع خطوات إذا رجعت الرغبة.'],
        ['🔄 تغيير الروتين', 'ساعدني أستبدل العادة بروتين يومي صحي يناسب الدراسة والعبادة والنوم، من غير مبالغة أو وعود سريعة.'],
        ['🗓️ خطة 7 أيام', 'أنشئ لي خطة تعافٍ مرنة لمدة سبعة أيام بأهداف صغيرة يومية ومراجعة مسائية بسيطة، من غير عدّ قاسٍ أو جلد للذات.'],
        ['💪 بعد التعثر', 'إذا تعثرت، ساعدني أراجع السبب وأتعلم منه وأبدأ من جديد دون يأس أو إهانة لنفسي.'],
        ['🕌 دعم إيماني', 'اقترح وسائل إيمانية عملية ومتوازنة تساعدني، مثل الصلاة والذكر وغض البصر وصحبة صالحة وملء وقت الفراغ، من غير تخويف أو أحكام قاسية.'],
        ['😌 الملل والتوتر', 'ساعدني أتعامل مع الملل أو الضغط أو الوحدة ببدائل صحية ومناسبة لعمري.'],
        ['🤝 طلب المساعدة', 'اشرح لي متى يكون من المفيد التحدث مع شخص بالغ موثوق أو مختص، وكيف أبدأ الحديث بسرية واحترام.']
      ]
    },
    programming: {
      title: '📜 برمجة JavaScript',
      subtitle: 'تعلم المفاهيم وطبّق بأمثلة عملية.',
      tools: [
        ['📝 المتغيرات', 'اشرح var وlet وconst بأمثلة.'],
        ['🔧 الدوال', 'اشرح الدوال في JavaScript مع أمثلة.'],
        ['📦 Arrays وObjects', 'اشرح Arrays وObjects مع تمارين.'],
        ['⏳ Async/Await', 'اشرح Async/Await وPromises بأمثلة.'],
        ['🌐 DOM', 'اشرح DOM وكيفية التعامل مع عناصر الصفحة.'],
        ['🔌 Fetch API', 'اشرح Fetch API وطلبات HTTP مع مثال آمن.'],
        ['🐞 تصحيح الأخطاء', 'ساعدني في تصحيح كود JavaScript سأرسله لك.'],
        ['🧪 مشروع صغير', 'اقترح مشروع JavaScript صغيرًا ووجّهني خطوة بخطوة.']
      ]
    },
    videos: {
      title: '🎬 أدوات الفيديو',
      subtitle: 'للتعامل مع الفيديوهات التي تملكها أو يُسمح لك بتنزيلها.',
      tools: [
        ['✂️ تحرير الفيديو', 'اقترح أدوات مجانية لتحرير الفيديو على أندرويد.'],
        ['🎙️ الصوت والترجمة', 'اشرح إضافة ترجمة وتحسين الصوت في فيديو أملكه.'],
        ['📐 المقاسات', 'ساعدني في اختيار أبعاد الفيديو المناسبة لمنصة النشر.'],
        ['📁 ضغط الفيديو', 'اشرح طرق ضغط فيديو مع الحفاظ على جودة مناسبة.'],
        ['⬇️ تنزيل مسموح', 'اشرح طرق تنزيل الفيديو عندما يسمح صاحب المحتوى والمنصة بذلك.']
      ]
    },
    games: {
      title: '🎮 أدوات الألعاب',
      subtitle: 'إعدادات وأداء وتدريب.',
      tools: [
        ['⚙️ تحسين الأداء', 'ساعدني في تحسين أداء اللعبة وتقليل التقطيع.'],
        ['🌡️ الحرارة', 'كيف أتعامل مع ارتفاع حرارة الهاتف أثناء اللعب؟'],
        ['🎯 الحساسية', 'ساعدني في ضبط إعدادات الحساسية تدريجيًا حسب اللعبة والجهاز.'],
        ['📶 الاتصال', 'ساعدني في تشخيص ارتفاع الـPing ومشكلات الاتصال.'],
        ['🕹️ التدريب', 'ضع لي خطة تدريب قصيرة لتحسين مهاراتي في اللعبة.']
      ]
    },
    'website-help': {
      title: '🤍 مساعد رحيم',
      subtitle: 'مساعدة في استخدام الموقع والحساب.',
      tools: [
        ['👤 الحساب', 'اشرح لي كيفية استخدام حسابي في موقع رحيم.'],
        ['💎 الاشتراك', 'اشرح لي طريقة معرفة حالة اشتراكي وخيارات الاشتراك.'],
        ['🧯 مشكلة بالموقع', 'ساعدني في تشخيص مشكلة في موقع رحيم.'],
        ['💬 المحادثة', 'اشرح لي كيفية استخدام المحادثة وإرسال الأسئلة.']
      ]
    }
  };

  let currentSection = 'general';
  let overlay, panel;

  function closeDrawerIfOpen() {
    const drawer = document.getElementById('drawer');
    if (drawer && drawer.classList.contains('open') &&
        typeof window.toggleDrawer === 'function') {
      window.toggleDrawer();
    }
  }

  function sendPrompt(prompt, section) {
    closeToolsSection();
    if (typeof window.quickSend === 'function') {
      window.quickSend(prompt, section);
    } else {
      const field = document.getElementById('input');
      if (field) field.value = prompt;
    }
  }

  function askAI() {
    const section = currentSection;
    closeToolsSection();
    window.activeSection = section;
    const field = document.getElementById('input');
    const area = document.querySelector('.input-area');
    if (area && area.classList.contains('raheem-composer-hidden') &&
        typeof window.raheemToggleComposer === 'function') {
      window.raheemToggleComposer();
    }
    if (field) field.focus();
    if (typeof window.showToast === 'function') {
      window.showToast('اكتب سؤالك في خانة المحادثة');
    }
  }

  function openToolsSection(section) {
    currentSection = sections[section] ? section : 'general';
    closeDrawerIfOpen();

    if (!overlay || !panel) return;
    const data = sections[currentSection];
    panel.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'rt-head';

    const title = document.createElement('div');
    title.className = 'rt-title';
    title.textContent = data.title;

    const close = document.createElement('button');
    close.className = 'rt-close';
    close.type = 'button';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'إغلاق');
    close.addEventListener('click', closeToolsSection);

    head.append(title, close);
    panel.appendChild(head);

    const subtitle = document.createElement('div');
    subtitle.className = 'rt-sub';
    subtitle.textContent = data.subtitle;
    panel.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.className = 'rt-grid';

    data.tools.forEach(function (item) {
      const button = document.createElement('button');
      button.className = 'rt-tool';
      button.type = 'button';
      button.textContent = item[0];
      button.addEventListener('click', function () {
        sendPrompt(item[1], currentSection);
      });
      grid.appendChild(button);
    });
    panel.appendChild(grid);

    const ai = document.createElement('button');
    ai.className = 'rt-ai';
    ai.type = 'button';
    ai.textContent = '🤖 اسأل المساعد الذكي بنفسي';
    ai.addEventListener('click', askAI);
    panel.appendChild(ai);

    const note = document.createElement('div');
    note.className = 'rt-note';
    note.textContent = 'اختَر أداة لإرسال طلبها للمساعد، أو افتح خانة الكتابة لسؤالك بنفسك.';
    panel.appendChild(note);

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeToolsSection() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function init() {
    overlay = document.getElementById('raheemToolsOverlay');
    panel = document.getElementById('raheemToolsPanel');
    if (!overlay || !panel) return;

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeToolsSection();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeToolsSection();
    });

    window.openToolsSection = openToolsSection;
    window.closeToolsSection = closeToolsSection;

    // ربط أزرار الأقسام فقط، من غير تعديل وظائف المحادثة.
    const mappings = [
      ["quickSend('ازيك', 'general')", 'general'],
      ["quickSend('إزاي أعدل تطبيق APK؟', 'apk')", 'apk'],
      ["quickSend('إزاي أثبت Node.js على Termux؟', 'termux')", 'termux'],
      ["quickSend('إزاي أعمل روت؟', 'root')", 'root'],
      ["quickSend('نصائح للتعافي', 'recovery')", 'recovery'],
      ["enterJsMode()", 'programming'],
      ["quickSend('كيف أحمل فيديو من يوتيوب؟', 'general')", 'videos'],
      ["quickSend('إزاي أحسن مهاراتي في الألعاب؟', 'games')", 'games'],
      ["quickSend('اشرح لي استخدام موقع رحيم والأسعار وطريقة تفعيل الاشتراك.', 'website-help')", 'website-help']
    ];

    document.querySelectorAll('#drawer .drawer-item, .quick-actions .quick-btn').forEach(function (button) {
      const old = button.getAttribute('onclick') || '';
      const match = mappings.find(function (entry) {
        return old.includes(entry[0]);
      });
      if (!match) return;
      button.removeAttribute('onclick');
      button.addEventListener('click', function () {
        openToolsSection(match[1]);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
