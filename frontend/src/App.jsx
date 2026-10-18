import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import VerifyClaim from './pages/VerifyClaim';
import Home from './pages/Home';
import Subscriptions from './pages/Subscriptions';

function Navbar() {
  const location = useLocation();
  const linkClass = (path) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight">
        Trace
      </Link>
      <div className="flex space-x-2">
        <Link to="/" className={linkClass('/')}>Home</Link>
        <Link to="/verify" className={linkClass('/verify')}>Verify Claim</Link>
        <Link to="/subscriptions" className={linkClass('/subscriptions')}>Subscriptions</Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<VerifyClaim />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}