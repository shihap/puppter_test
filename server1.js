const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['POST'],
}));

// Configuration
const PORT = process.env.PORT || 3001; // يمكن تغيير البورت عبر متغير البيئة
const INSTANCE_ID = process.env.INSTANCE_ID || 'default'; // معرف النسخة

// Chrome Path & Profile Setup
const getChromeProfilePath = () => {
  // استخدام مجلد مؤقت لكل نسخة
  return path.join(os.tmpdir(), `puppeteer_profile_${PORT}_${INSTANCE_ID}`);
};

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

// Global variables
let browser, page;

const readFirstMessageFromFile = () => {
  const filePath = path.join(__dirname, 'first_message.txt');
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    console.log('⚠️ No first_message.txt file found');
    return null;
  } catch (error) {
    console.error('Error reading first message file:', error);
    return null;
  }
};

async function initPuppeteer() {
  const chromePath = getChromeExecutablePath();
  const profilePath = getChromeProfilePath();

  if (!chromePath) {
    console.error('❌ Chrome not installed!');
    process.exit(1);
  }

  // إنشاء مجلد الملف الشخصي إذا لم يكن موجوداً
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }

  browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    userDataDir: profilePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: null
  });

  const pages = await browser.pages();
  page = pages[0] || await browser.newPage();

  // Hide Puppeteer fingerprint
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  await page.goto('https://chat.openai.com', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log(`✅ Instance ${INSTANCE_ID}: ChatGPT is ready`);



try {
    const firstMessage = readFirstMessageFromFile();
    if (firstMessage) {
    await page.waitForSelector('textarea', { timeout: 15000 });
    console.log('✔ جاهز للاستخدام - يمكنك البدء بالدردشة');
    
    // كتابة رسالة مثال
    await page.type('textarea', firstMessage);
    
    // الضغط على زر الإرسال
    await page.click('#composer-submit-button');
    
    await page.waitForSelector('div.markdown.prose.dark\\:prose-invert.w-full.break-words.dark', {
      timeout: 30000
    });

    // ثم الانتظار حتى يحتوي العنصر على نص فعلي (ليس فارغاً)
    await page.waitForFunction(() => {
      const element = document.querySelector('div.markdown.prose.dark\\:prose-invert.w-full.break-words.dark');
      return element && element.textContent.trim().length > 0;
    }, { timeout: 30000 });

    // إضافة تأخير إضافي 500 مللي ثانية للتأكد من اكتمال الكتابة
    await new Promise(resolve => setTimeout(resolve, 5000));

    // استخراج المحتوى بعد التأكد من اكتماله
    const response = await page.$eval(
      'div.markdown.prose.dark\\:prose-invert.w-full.break-words.dark',
      (el) => el.textContent
    );

    console.log('📄 رد ChatGPT:');
    console.log(response.trim());
    }

}
catch (error) {
    console.error('⚠️ Error sending first message:', error.message);
  }

}


// Send a message to ChatGPT and get response
async function sendMessageToChatGPT(message) {
    try {
      await page.waitForSelector('textarea', { timeout: 15000 });
      await page.type('textarea', message);
      await page.click('#composer-submit-button');
  
      // Wait for response
      await page.waitForSelector('button[data-testid="stop-button"]', {
        hidden: true,
        timeout: 60000
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
     
      // Extract the latest response
      const responses = await page.$$eval(
        'div.markdown.prose.dark\\:prose-invert.w-full.break-words.dark',
        (elements) => elements.map(el => el.textContent.trim())
      );
    
      console.log('Response: ', responses[responses.length - 1]);
      return responses[responses.length - 1] || "No response from ChatGPT";
    } catch (error) {
      console.error('⚠️ Error:', error.message);
      return "Error: Failed to get response";
    }
  }

// API Endpoint to receive messages
app.post('/send-message', async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
  
    const response = await sendMessageToChatGPT(message);
    res.json({ response });
  });
  
  // Start the server & Puppeteer
  (async () => {
    await initPuppeteer();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })();