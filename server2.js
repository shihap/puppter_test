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
const PORT = process.env.PORT || 3002; // يمكن تغيير البورت عبر متغير البيئة
const INSTANCE_ID = process.env.INSTANCE_ID || 'default2'; // معرف النسخة

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

  await page.goto('https://aistudio.google.com/generate-speech', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  try {
    await page.waitForSelector('ms-toggle-button', { timeout: 5000 });
    await page.click('ms-toggle-button');
    console.log('✅ Toggle button clicked successfully');
  } catch (error) {
    console.log('⚠️ Error clicking toggle button:', error.message);
  }

  console.log(`✅ Instance ${INSTANCE_ID}: google AI studio is ready`);

}


async function sendMessageToGoogleAI(message) {
  try {
    await page.waitForSelector('textarea[arialabel="Enter a prompt"]', { timeout: 30000 });
    await page.$eval('textarea[arialabel="Enter a prompt"]', el => el.value = '');
    await page.type('textarea[arialabel="Enter a prompt"]', message, { delay: 50 });
    await page.waitForSelector('run-button', { timeout: 5000 });
    await page.click('run-button');

   // انتظار ظهور الصوت
   await page.waitForSelector('audio[src^="data:audio"]', { timeout: 30000 });
    
   // استخراج مصدر الصوت
   const audioSrc = await page.$eval('audio', el => el.src);
   
   return audioSrc;

 } catch (error) {
   console.error('⚠️ Error:', error);
   throw new Error("Failed to get audio response");
 }
}

app.post('/send-message', async (req, res) => {
  try {
    const audioDataUrl = await sendMessageToGoogleAI(req.body.message);
    const base64Data = audioDataUrl.split(',')[1];
    
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'attachment; filename="audio.wav"'
    });
    
    res.send(Buffer.from(base64Data, 'base64'));
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

(async () => {
  await initPuppeteer();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Instance ${INSTANCE_ID} running on http://0.0.0.0:${PORT}`);
  });
})();