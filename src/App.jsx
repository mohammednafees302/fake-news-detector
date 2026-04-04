import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Analyzer from './pages/Analyzer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Report from './pages/Report';
import ForgotPassword from './pages/ForgotPassword';
import Leaderboard from './pages/Leaderboard';
import About from './pages/About';

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
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/report" element={<Report />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/about" element={<About />} />
                    </Routes>
                </main>
                <Footer />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
