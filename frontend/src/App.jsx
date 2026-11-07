import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './pages/Home';
import VerifyClaim from './pages/VerifyClaim';
import Subscriptions from './pages/Subscriptions';
import Login from './pages/Login';
import Register from './pages/Register';
import TrapScan from './pages/TrapScan'; 

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const linkClass = (path) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <Link to="/" className="text-xl font-bold text-gray-900">Trace</Link>
      <div className="flex space-x-2 items-center">
        {user ? (
          <>
            <Link to="/" className={linkClass('/')}>Home</Link>
            <Link to="/verify" className={linkClass('/verify')}>Verify Claim</Link>
            <Link to="/subscriptions" className={linkClass('/subscriptions')}>Subscriptions</Link>
            <Link to="/traps" className={linkClass('/traps')}>Trap Scan</Link>
            <span className="text-sm text-gray-500 ml-4">Hi, {user.name}</span>
            <button onClick={logout} className="text-sm text-red-500 hover:underline ml-2">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className={linkClass('/login')}>Login</Link>
            <Link to="/register" className={linkClass('/register')}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyClaim />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/traps" element={<TrapScan />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}