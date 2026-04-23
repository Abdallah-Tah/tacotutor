import { create } from 'zustand';
// SessionState removed, using interface directly below

interface LiveSessionState {
  sessionId: string | null;
  childId: string | null;
  lessonId: string | null;
  currentAyah: string | null;
  position: number;
  score: number;
  mistakes: any[];
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  transcript: string;
  tutorText: string;
  highlightedWordIndex: number | null;
  wordCorrectness: boolean[];

  startSession: (sessionId: string, childId: string, lessonId?: string) => void;
  endSession: () => void;
  setState: (state: Partial<Omit<LiveSessionState, 'startSession' | 'endSession' | 'setState'>>) => void;
  setTranscript: (text: string | ((prev: string) => string)) => void;
  setTutorText: (text: string | ((prev: string) => string)) => void;
  setHighlightedWord: (index: number | null, correct?: boolean) => void;
  setWordCorrectness: (correctness: boolean[]) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
}

export const useSessionStore = create<LiveSessionState>((set) => ({
  sessionId: null,
  childId: null,
  lessonId: null,
  currentAyah: null,
  position: 0,
  score: 0,
  mistakes: [],
  isActive: false,
  isSpeaking: false,
  isListening: false,
  transcript: '',
  tutorText: '',
  highlightedWordIndex: null,
  wordCorrectness: [],

  startSession: (sessionId, childId, lessonId) =>
    set({
      sessionId,
      childId,
      lessonId: lessonId || null,
      isActive: true,
      position: 0,
      score: 0,
      mistakes: [],
      transcript: '',
      tutorText: '',
      highlightedWordIndex: null,
      wordCorrectness: [],
    }),

  endSession: () =>
    set({
      sessionId: null,
      childId: null,
      lessonId: null,
      currentAyah: null,
      isActive: false,
      isSpeaking: false,
      isListening: false,
      transcript: '',
      tutorText: '',
    }),

  setState: (state) => set((prev) => ({ ...prev, ...state })),
  setTranscript: (transcript) =>
    set((state) => ({
      transcript: typeof transcript === 'function' ? transcript(state.transcript) : transcript,
    })),
  setTutorText: (tutorText) =>
    set((state) => ({
      tutorText: typeof tutorText === 'function' ? tutorText(state.tutorText) : tutorText,
    })),
  setHighlightedWord: (highlightedWordIndex, correct) =>
    set((state) => {
      if (correct !== undefined && highlightedWordIndex !== null) {
        const newCorrectness = [...state.wordCorrectness];
        newCorrectness[highlightedWordIndex] = correct;
        return { highlightedWordIndex, wordCorrectness: newCorrectness };
      }
      return { highlightedWordIndex };
    }),
  setWordCorrectness: (wordCorrectness) => set({ wordCorrectness }),
  setListening: (isListening) => set({ isListening }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
}));
