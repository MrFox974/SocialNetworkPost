import { RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';
import { router } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { GenerationProgressProvider } from './contexts/GenerationProgressContext';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <GenerationProgressProvider>
        <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sf-bg)' }}>
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-accent)' }} />
          </div>
        }
      >
          <RouterProvider router={router} />
        </Suspense>
        </GenerationProgressProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
