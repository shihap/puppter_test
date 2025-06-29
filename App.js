import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [inputText, setInputText] = useState('');
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
        await handleTextProcessing(finalTranscript);
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

  const handleTextProcessing = async (text) => {
    try {
      const shortPrompt = text + ' . الرد المختصر .';

      const response1 = await fetch('http://192.168.20.238:3001/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: shortPrompt }),
      });

      const data1 = await response1.json();
      const cleanShortResponse = data1.response
        .replace(/\n/g, ' ')
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');

      await Promise.all([
        (async () => {
          const response2 = await fetch('http://192.168.20.238:3002/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: cleanShortResponse }),
          });
          const audioBlob = await response2.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
        })(),

        (async () => {
          const fullPrompt = text + ' . الرد الكامل .';
          const fullResponseRes = await fetch('http://192.168.20.238:3001/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: fullPrompt }),
          });
          const fullData = await fullResponseRes.json();
          setFullResponse(fullData.response);
        })()
      ]);
    } catch (error) {
      console.error('⚠️ خطأ أثناء تنفيذ السلسلة:', error);
    }
  };

  const speakArabic = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices[0];
    if (arabicVoice) utterance.voice = arabicVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleManualSend = () => {
    if (inputText.trim()) {
      setTranscript(inputText);
      handleTextProcessing(inputText);
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

      {fullResponse && (
        <div style={{ marginTop: '2rem', fontSize: '16px' }}>
          <strong>الرد الكامل:</strong>
          <p style={{ background: '#e0e0e0', padding: '1rem', borderRadius: '10px' }}>
            {fullResponse}
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
