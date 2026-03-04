import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

const Home = lazy(() => import('./pages/home/home'));
const Login = lazy(() => import('./pages/Login'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const DashboardProjects = lazy(() => import('./pages/DashboardProjects'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const SpeechDetail = lazy(() => import('./pages/SpeechDetail'));
const Plans = lazy(() => import('./pages/Plans'));
const Settings = lazy(() => import('./pages/Settings'));

const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sf-bg)' }}>
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: 'var(--sf-cta)' }} />
  </div>
);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        path="/"
        element={(
          <Suspense fallback={<Fallback />}>
            <Home />
          </Suspense>
        )}
      />
      <Route path="/login" element={<Suspense fallback={<Fallback />}><Login /></Suspense>} />
      <Route path="/verify-email" element={<Suspense fallback={<Fallback />}><VerifyEmail /></Suspense>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} errorElement={<ErrorBoundary />}>
        <Route index element={<Suspense fallback={<Fallback />}><DashboardProjects /></Suspense>} />
        <Route path="project/:projectId" element={<Suspense fallback={<Fallback />}><ProjectPage /></Suspense>} />
        <Route path="speech/:id" element={<Suspense fallback={<Fallback />}><SpeechDetail /></Suspense>} />
        <Route path="plans" element={<Suspense fallback={<Fallback />}><Plans /></Suspense>} />
        <Route path="plans/success" element={<Suspense fallback={<Fallback />}><Plans /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<Fallback />}><Settings /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </>
  )
);
