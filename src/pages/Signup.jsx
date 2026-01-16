import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/chat');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[Signup] Registering user:", email);
    try {
      const res = await api.post('/auth/signup', { email, password });
      console.log("[Signup] Success! Response:", res.data);
      setMsg('OTP sent to your email!');
      setTimeout(() => navigate('/verify', { state: { email } }), 2000);
    } catch (err) {
      console.error("[Signup] Error:", err);
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Create Account</h2>
          <p className="text-slate-500 text-sm">Join Yatri Car Rental today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-400"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-400"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]">
            Get Started
          </button>
        </form>

        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider mb-1">Use this to login with chats</p>
          <code className="text-xs text-emerald-700 break-all">test@gmail.com, Test@123</code>
        </div>

        {error && <p className="text-red-500 mt-4 text-center text-sm font-semibold">{error}</p>}
        {msg && <p className="text-emerald-600 mt-4 text-center text-sm font-bold">{msg}</p>}

        <p className="mt-8 text-center text-slate-600 text-sm">
          Already have an account? <Link to="/login" className="text-slate-900 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
