import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    fetch(`https://scrap-metal-production.up.railway.app/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 text-center">
          {status === 'loading' && (
            <div>
              <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Verifying your email...</h2>
            </div>
          )}

          {status === 'success' && (
            <div>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-600 mb-2">Email Verified!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <Link to="/login">
                <Button className="btn-accent">Go to Login</Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Verification Failed</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <Link to="/login">
                <Button className="btn-accent">Back to Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}