import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم Web Speech API');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-EG';

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('🎙️ الميكروفون بدأ');
      isRecognizingRef.current = true;
    };

    recognition.onend = () => {
      console.log('🛑 الميكروفون توقف');
      isRecognizingRef.current = false;
      if (shouldRestartRef.current) {
        console.log('محاولة إعادة تشغيل الميكروفون...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.error('فشل إعادة التشغيل:', err);
          }
        }, 100);
      }
    };

recognition.onresult = (event) => {
  let interimTranscript = '';
  let finalTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) {
      finalTranscript += result[0].transcript + ' ';
    } else {
      interimTranscript += result[0].transcript + ' ';
    }
  }

  interimTranscript = interimTranscript.trim();
  finalTranscript = finalTranscript.trim();

  // عرض النص الحي أولاً (لو فيه كلمات مؤقتة)
  if (interimTranscript.length > 0) {
    setTranscript(interimTranscript);
  } 
  // لو مفيش نص مؤقت، نعرض النص النهائي
  else if (finalTranscript.length > 0) {
    setTranscript(finalTranscript);
  }

  // لما يظهر نص نهائي جديد، نرد عليه مرة واحدة فقط
  if (finalTranscript.length > 0) {
    speakArabic("وعليكم السلام");
  }
};



    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, []);

  useEffect(() => {
    shouldRestartRef.current = isListening;

    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('فشل بدء الاستماع:', err);
      }
    } else {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = () => {
    setIsListening(prev => !prev);
  };

  const speakArabic = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA'; // تقدر تغيرها لـ ar-EG لو حابب مصري

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices[0];
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    window.speechSynthesis.cancel(); // لإلغاء أي صوت سابق عالق
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🎤 استماع للأقوال</h1>
      <p>{isListening ? 'الميكروفون شغال 🔴' : 'الميكروفون متوقف ⚪'}</p>
      <button
        onClick={toggleListening}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: isListening ? '#ff4d4f' : '#52c41a',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        {isListening ? 'إيقاف الاستماع' : 'ابدأ الاستماع'}
      </button>
      <div style={{ marginTop: '2rem', fontSize: '18px' }}>
        <strong>النص المسموع:</strong>
        <p style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '10px' }}>
          {transcript || '...'}
        </p>
      </div>
    </div>
  );
};

export default App;
