import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Phase 15B — Agent speech via Web Speech Synthesis.
 * Queue-based (one utterance at a time), per-agent stable pitch so
 * teammates sound distinct, global mute, hard length cap, no backlog.
 */
export function useAgentSpeech() {
  const [muted, setMutedState] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mutedRef = useRef(false);
  const queueRef = useRef<{ text: string; pitch: number }[]>([]);
  const busyRef = useRef(false);
  // Self-reference for pump's onend handler — react-hooks/immutability forbids
  // a useCallback touching its own binding, so the recursion goes through a ref.
  const pumpRef = useRef<() => void>(() => {});

  // Warm the voice list (loads async in most browsers).
  useEffect(() => {
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.onvoiceschanged = warm;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  /** Mute is an EVENT-TIME state change (not an effect): flipping it must take
   *  effect synchronously for in-flight speak() calls, and the queue flush +
   *  setSpeaking belong beside it (react-hooks/set-state-in-effect). */
  const setMuted = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(mutedRef.current) : next;
    mutedRef.current = value;
    if (value) {
      window.speechSynthesis.cancel();
      queueRef.current = []; busyRef.current = false; setSpeaking(false);
    }
    setMutedState(value);
  }, []);

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang === 'en-US' && /natural|neural|premium/i.test(v.name))
        ?? voices.find(v => v.lang.startsWith('en')) ?? null;
  };

  const pump = useCallback(() => {
    if (busyRef.current || mutedRef.current) return;
    const next = queueRef.current.shift();
    if (!next) { setSpeaking(false); return; }
    busyRef.current = true; setSpeaking(true);
    const u = new SpeechSynthesisUtterance(next.text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.pitch = next.pitch; u.rate = 1.02; u.volume = 0.95;
    u.onend = u.onerror = () => { busyRef.current = false; pumpRef.current(); };
    window.speechSynthesis.speak(u);
  }, []);

  // Sync the stable pump into its recursion ref (single run — pump is []-memoized).
  useEffect(() => { pumpRef.current = pump; }, [pump]);

  const speak = useCallback((text: string, agentId?: string) => {
    if (mutedRef.current || !text.trim()) return;
    // Stable per-agent pitch: hash(agentId) → 0.85–1.20.
    let h = 0; const key = agentId ?? 'system';
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const pitch = 0.85 + (Math.abs(h) % 8) * 0.05;
    queueRef.current.push({ text: text.slice(0, 220), pitch });
    if (queueRef.current.length > 4) queueRef.current.splice(0, queueRef.current.length - 4);
    pump();
  }, [pump]);

  return { speak, muted, setMuted, speaking };
}
