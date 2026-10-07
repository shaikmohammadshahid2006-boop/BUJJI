import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Cpu, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jarvis-dark flex items-center justify-center p-4 relative overflow-hidden hud-grid-pattern">
      {/* Radial aura glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Holographic Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 mb-4 shadow-[0_0_25px_rgba(0,229,255,0.5)] border border-cyan-400/40">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white font-mono tracking-wider">
            BUJJI
          </h1>
          <p className="text-sm font-mono text-cyan-400/80 mt-1 uppercase tracking-widest">
            Security Authorization Protocol
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2 uppercase tracking-wider">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stark@avengers.org"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Passphrase Key
                </label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wider font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>INITIALIZE SESSION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 font-mono">
              New commander unit?{' '}
              <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4">
                Register Clearance
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted with Supabase JWT & Row Level Security</span>
        </div>
      </div>
    </div>
  );
};
