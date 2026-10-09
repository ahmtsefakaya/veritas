import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import NewTopicPage from './pages/NewTopicPage';
import TopicDetailPage from './pages/TopicDetailPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/new-topic"
            element={
              <ProtectedRoute>
                <NewTopicPage />
              </ProtectedRoute>
            }
          />
          <Route path="/topics/:id" element={<TopicDetailPage />} />
          <Route path="/users/:username" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
