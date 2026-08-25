import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, authApi } from '../../utils/api';
import { Eye, EyeOff, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Spinner from '../../components/ui/Spinner';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    display_name: '',
    role: 'developer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'

  const updateField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const checkUsername = async (value) => {
    if (value.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await authApi.checkUsername(value);
      setUsernameStatus(res.data.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    }
  };

  const handleUsernameChange = (e) => {
    updateField('username')(e);
    clearTimeout(window._userTimer);
    window._userTimer = setTimeout(() => checkUsername(e.target.value.trim()), 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'taken') {
      toast.error('Username is already in use.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await register(form);
      toast.success(`Welcome to Gastos Store, ${user.display_name}!`);
      navigate('/developer/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Developer Account — Gastos App Store</title>
      </Helmet>

      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md card p-6 sm:p-8"
        >
          <div className="text-center mb-8">
            <div className="w-6 h-6 bg-black rounded mx-auto mb-3" />
            <h1 className="text-xl font-bold text-neutral-900">
              Join as a Developer
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Publish Android applications directly to the Gastos store
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Display / Studio Name *
              </label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={updateField('display_name')}
                className="input text-xs"
                placeholder="e.g. Gastos Studios"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Username * <span className="text-neutral-400 font-normal">(for public developer URL)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={handleUsernameChange}
                  className="input pr-10 text-xs font-mono"
                  placeholder="gastos_developer"
                  pattern="[a-zA-Z0-9_]{3,30}"
                />
                <div className="absolute right-3">
                  {usernameStatus === 'checking' && <Spinner size="sm" />}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                  {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-danger" />}
                </div>
              </div>
              {usernameStatus === 'available' && (
                <p className="text-xs text-success mt-1">
                  Username is available!
                </p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-danger mt-1">Username is already taken.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={updateField('email')}
                className="input text-xs"
                placeholder="developer@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Password * <span className="text-neutral-400 font-normal">(min 8 characters)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={updateField('password')}
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
              disabled={isLoading || usernameStatus === 'taken'}
              className="btn-primary w-full h-9 mt-2 font-medium"
            >
              {isLoading ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />}
              <span>{isLoading ? 'Creating Account...' : 'Create Developer Account'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-neutral-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
