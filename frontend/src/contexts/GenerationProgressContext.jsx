import { createContext, useContext, useState, useCallback } from 'react';

const GenerationProgressContext = createContext(null);

export function GenerationProgressProvider({ children }) {
  const [state, setState] = useState({
    isGenerating: false,
    progress: 0,
    label: '',
  });

  const setGenerationProgress = useCallback((progress, isGenerating, label = '') => {
    setState({
      progress: Math.min(100, Math.max(0, progress)),
      isGenerating: Boolean(isGenerating),
      label: label || '',
    });
  }, []);

  return (
    <GenerationProgressContext.Provider value={{ ...state, setGenerationProgress }}>
      {children}
    </GenerationProgressContext.Provider>
  );
}

export function useGenerationProgress() {
  const ctx = useContext(GenerationProgressContext);
  if (!ctx) throw new Error('useGenerationProgress must be used within GenerationProgressProvider');
  return ctx;
}
