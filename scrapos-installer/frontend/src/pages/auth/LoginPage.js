import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1722695694560-f452b0919d3a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHw0fHxpbmR1c3RyaWFsJTIwc2NyYXAlMjBtZXRhbCUyMHlhcmQlMjByZWN5Y2xpbmclMjBwbGFudCUyMHN0ZWVsJTIwc2hpcHBpbmclMjBwb3J0fGVufDB8fHx8MTc2OTAxNTc1Nnww&ixlib=rb-4.1.0&q=85"
          alt="Scrap Metal Yard"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h1 className="text-5xl font-manrope font-bold mb-2">ScrapOS</h1>
          <p className="text-xl text-slate-300 max-w-md">
            Commercial Grade Scrap Metal ERP for UAE Trading Companies
          </p>
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/20">
            <img src="/techsight-logo.png" alt="TechSight Innovation" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-sm text-slate-300">Developed by</p>
              <p className="font-semibold">TechSight Innovation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12">
            <h1 className="text-4xl font-manrope font-bold text-slate-900 dark:text-white">ScrapOS</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Scrap Metal ERP</p>
            <div className="flex items-center gap-2 mt-3">
              <img src="/techsight-logo.png" alt="TechSight" className="w-6 h-6 object-contain" />
              <span className="text-sm text-slate-500">by TechSight Innovation</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Enter your credentials to access the ERP system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="form-label">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@scrapos.ae"
                className="form-input"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="form-label">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-accent h-11 text-base font-semibold"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-500 hover:text-orange-600 font-medium">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Demo: Register a new account with role "admin" to access all features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
