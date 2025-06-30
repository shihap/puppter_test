import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [inputText, setInputText] = useState('');
  const recognitionRef = useRef(null);
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
    };

    recognition.onend = () => {
      console.log('🛑 الميكروفون توقف');
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

    recognition.onresult = async (event) => {
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

      if (interimTranscript.length > 0) {
        setTranscript(interimTranscript);
      } else if (finalTranscript.length > 0) {
        setTranscript(finalTranscript);
        await sendToBackend(finalTranscript);
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
    setIsListening((prev) => !prev);
  };

  // دالة إرسال النص للـ backend واستقبال الرد النصي والصوتي
  const sendToBackend = async (text) => {
    try {
      // ارسال النص للـ backend
      const response = await fetch('http://192.168.20.238:8080/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      // نفترض الرد JSON فيه:
      // { text: "النص المعروض", audioBase64: "base64string" }
      const data = await response.json();

      setDisplayedText(data.text || '');

      if (data.audioBase64) {
        // تحويل base64 إلى Blob
        const audioBlob = base64ToBlob(data.audioBase64, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('خطأ في التواصل مع الخادم:', error);
    }
  };

  // دالة لتحويل base64 إلى Blob
  const base64ToBlob = (base64, mime) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  };

  // ارسال النص من الإدخال اليدوي
  const handleManualSend = () => {
    if (inputText.trim()) {
      setTranscript(inputText);
      sendToBackend(inputText);
      setInputText('');
    }
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

      <div style={{ marginTop: '2rem' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="اكتب رسالة"
          style={{ padding: '10px', width: '70%', fontSize: '16px', borderRadius: '8px' }}
        />
        <button
          onClick={handleManualSend}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          إرسال
        </button>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '18px' }}>
        <strong>النص المسموع / المكتوب:</strong>
        <p style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '10px' }}>
          {transcript || '...'}
        </p>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '18px' }}>
        <strong>النص المعروض من السيرفر:</strong>
        <p style={{ background: '#e0e0e0', padding: '1rem', borderRadius: '10px' }}>
          {displayedText || '...'}
        </p>
      </div>
    </div>
  );
};

export default App;
