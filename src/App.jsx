import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Home from './pages/Home';
import Analyzer from './pages/Analyzer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Report from './pages/Report';
import ForgotPassword from './pages/ForgotPassword';
import Leaderboard from './pages/Leaderboard';
import About from './pages/About';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';
import TrendingClaims from './pages/TrendingClaims';
import Community from './pages/Community';
import Settings from './pages/Settings';
import EducationalContent from './pages/EducationalContent';
import PublisherDashboard from './pages/PublisherDashboard';
import AdminModerationPanel from './pages/AdminModerationPanel';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Navbar />
                <main style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/analyze" element={<Analyzer />} />
                        <Route path="/analyze/:id" element={<Analyzer />} />
                        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                        <Route path="/moderation" element={<AdminRoute><AdminModerationPanel /></AdminRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/publisher" element={<ProtectedRoute><PublisherDashboard /></ProtectedRoute>} />
                        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                        <Route path="/report" element={<Report />} />
                        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/trending" element={<TrendingClaims />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/learn" element={<EducationalContent />} />
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>
                <Footer />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
