import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialResult, setPartialResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Always show mic button, handle errors on press
  const isSupported = true;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  async function startRecording() {
    setError(null);
    setTranscript('');
    setPartialResult('');

    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Voice input requires HTTPS or a supported browser (Chrome, Edge)');
        return;
      }
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += t;
            } else {
              interimTranscript += t;
            }
          }
          if (finalTranscript) {
            setTranscript(finalTranscript);
            setPartialResult('');
          } else {
            setPartialResult(interimTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error !== 'aborted') {
            setError(event.error || 'Speech recognition failed');
          }
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e: any) {
        setError(e.message || 'Failed to start recording');
      }
    } else {
      // Native: dynamic import
      try {
        const Voice = (await import('@react-native-voice/voice')).default;
        Voice.onSpeechStart = () => setIsRecording(true);
        Voice.onSpeechEnd = () => setIsRecording(false);
        Voice.onSpeechResults = (e: any) => {
          setTranscript(e.value?.[0] || '');
          setPartialResult('');
        };
        Voice.onSpeechPartialResults = (e: any) => {
          setPartialResult(e.value?.[0] || '');
        };
        Voice.onSpeechError = (e: any) => {
          setError(e.error?.message || 'Speech recognition failed');
          setIsRecording(false);
        };
        await Voice.start('en-US');
      } catch (e: any) {
        setError(e.message || 'Failed to start recording');
      }
    }
  }

  async function stopRecording() {
    if (Platform.OS === 'web' && recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      try {
        const Voice = (await import('@react-native-voice/voice')).default;
        await Voice.stop();
      } catch (e: any) {
        setError(e.message || 'Failed to stop recording');
      }
    }
    setIsRecording(false);
  }

  async function cancelRecording() {
    if (Platform.OS === 'web' && recognitionRef.current) {
      recognitionRef.current.abort();
    } else {
      try {
        const Voice = (await import('@react-native-voice/voice')).default;
        await Voice.cancel();
      } catch (e: any) {
        setError(e.message || 'Failed to cancel');
      }
    }
    setTranscript('');
    setPartialResult('');
    setIsRecording(false);
  }

  return {
    isRecording,
    transcript,
    partialResult,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
