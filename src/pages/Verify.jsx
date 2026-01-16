import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const Verify = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[Verify] Verifying OTP for:", email, "OTP:", otp);
    try {
      const res = await api.post('/auth/verify', { email, otp });
      console.log("[Verify] Success!", res.data);
      navigate('/');
    } catch (err) {
      console.error("[Verify] Error:", err);
      setError(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl border border-slate-100">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">Verify Account</h2>
        <p className="text-slate-500 text-center mb-8 text-sm px-4">We've sent a 6-digit code to <span className="text-slate-900 font-bold">{email}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="text" 
            placeholder="000000"
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-3xl font-mono font-bold tracking-[1em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-200"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]">
            Verify Code
          </button>
        </form>
        {error && <p className="text-red-500 mt-6 text-center text-sm font-semibold">{error}</p>}
        
        <p className="mt-8 text-center text-slate-500 text-sm">
          Didn't receive the code? <button className="text-slate-900 font-bold hover:underline">Resend</button>
        </p>
      </div>
    </div>
  );
};

export default Verify;
