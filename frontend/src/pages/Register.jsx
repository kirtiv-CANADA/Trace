import { API_BASE } from '../api';

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

//const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-4">Create an account</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 shadow-sm">
        {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
        
        <label className="block text-sm font-medium mb-1">Name</label>
        <input 
          type="text" required 
          value={name} onChange={e => setName(e.target.value)}
          className="w-full border p-2 rounded mb-4" 
        />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input 
          type="email" required 
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-4" 
        />
        
        <label className="block text-sm font-medium mb-1">Password</label>
        <input 
          type="password" required 
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-4" 
        />
        
        <button 
          type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-sm text-center mt-4 text-gray-600">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}