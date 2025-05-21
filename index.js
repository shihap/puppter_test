const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');
const fs = require('fs');

// تحديد مسار الملف الشخصي (User Profile)
const getChromeProfilePath = () => {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  } else {
    return path.join(os.homedir(), '.config', 'google-chrome');
  }
};

// تحديد مسار Chrome
const getChromeExecutablePath = () => {
  const paths = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/chrome'
    ]
  };

  const platformPaths = paths[os.platform()] || paths.linux;
  return platformPaths.find(p => fs.existsSync(p));
};

(async () => {
  const chromePath = getChromeExecutablePath();
  const profilePath = getChromeProfilePath();

  if (!chromePath) {
    console.error('❌ Chrome غير مثبت على جهازك!');
    return;
  }

  if (!fs.existsSync(profilePath)) {
    console.error('❌ لم يتم العثور على ملف التعريف الشخصي لـ Chrome');
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    userDataDir: profilePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
      '--profile-directory=Default'
    ],
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // إخفاء بصمة Puppeteer
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // فتح ChatGPT
  await page.goto('https://chat.openai.com', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('✅ تم فتح ChatGPT في متصفحك الشخصي');

  // التعامل مع نافذة "Thanks for trying ChatGPT"
  try {
    // الانتظار حتى تظهر النافذة
    await page.waitForSelector('div.flex.flex-col.items-center.justify-center', {
      timeout: 10000
    });
    console.log('⚠️ تم اكتشاف نافذة "Thanks for trying ChatGPT"');

    // النقر على "Stay logged out" باستخدام المسار الكامل
    await page.click('div.flex.flex-col.items-center.justify-center a.text-token-text-secondary');
    console.log('✔ تم النقر على "Stay logged out"');

    // الانتظار حتى تختفي النافذة
    await page.waitForSelector('div.flex.flex-col.items-center.justify-center', {
      hidden: true,
      timeout: 5000
    });
    console.log('✔ تم إغلاق النافذة بنجاح');
  } catch (err) {
    console.log('ℹ️ لم تظهر نافذة "Thanks for trying ChatGPT" - متابعة التنفيذ');
  }

  

  for (let i = 0 ; i < 3 ; i++){
      // الانتظار حتى يظهر مربع الدردشة في ChatGPT
      try {

        await page.waitForSelector('textarea', { timeout: 15000 });
        console.log('✔ جاهز للاستخدام - يمكنك البدء بالدردشة');
        
        // كتابة رسالة مثال
        await page.type('textarea', 'give me a song lyrics');
        
        // الضغط على زر الإرسال
        await page.click('#composer-submit-button');
        console.log('✔ تم إرسال الرسالة - جاري انتظار الرد...');
        
        // الانتظار حتى يختفي زر الإيقاف (Stop button)
        await page.waitForSelector('button[data-testid="stop-button"]', {
          hidden: true,
          timeout: 60000
        });
        console.log('✔ اختفاء زر الإيقاف - تم اكتمال الرد');
        
        // إضافة تأخير قصير للتأكد من استقرار الصفحة
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // استخراج آخر رد
        const responses = await page.$$eval(
          'div.markdown.prose.dark\\:prose-invert.w-full.break-words.dark',
          (elements) => elements.map(el => el.textContent.trim())
        );
        
        if (responses.length > 0) {
          console.log('📄 آخر رد ChatGPT:');
          console.log(responses[responses.length - 1]);
        } else {
          console.log('⚠️ لم يتم العثور على أي ردود');
        }
        
      } catch (error) {
        console.error('⚠️ حدث خطأ في استخراج الرد:', error.message);
        await page.screenshot({ path: 'response_error.png' });
        console.log('🖼️ تم حفظ لقطة شاشة للخطأ في ملف response_error.png');
      }
  }


  console.log('🏁 انتهى التشغيل - يمكنك إغلاق المتصفح يدوياً');
})();
