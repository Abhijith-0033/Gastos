import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/api';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Spinner from '../../components/ui/Spinner';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.display_name}!`);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/developer/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In — Gastos App Store</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md card p-6 sm:p-8"
        >
          <div className="text-center mb-8">
            <div className="w-6 h-6 bg-black rounded mx-auto mb-3" />
            <h1 className="text-xl font-bold text-neutral-900">
              Sign In to Gastos Store
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Access your developer portal or admin console
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-xs"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10 text-xs"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-9 mt-2 font-medium"
            >
              {isLoading ? <Spinner size="sm" /> : <LogIn className="w-4 h-4" />}
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-neutral-400 mt-6">
            Don't have a developer account yet?{' '}
            <Link to="/register" className="text-black font-medium hover:underline">
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
