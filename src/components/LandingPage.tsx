import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from './AuthContext';
import { ArrowRight, LogIn } from 'lucide-react';
import { marketingTheme as theme, marketingInputStyle } from './marketingTheme';
// @ts-ignore - Vite handles image imports
import appLogo from './app_logo.png';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Authentication error:', error);
      alert(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert(error instanceof Error ? error.message : 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const inputFieldStyle = marketingInputStyle();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99, 102, 241, 0.1), transparent),
              radial-gradient(ellipse 50% 40% at 100% 80%, rgba(245, 158, 11, 0.08), transparent),
              radial-gradient(ellipse 40% 30% at 0% 60%, rgba(20, 184, 166, 0.06), transparent)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(${theme.border} 1px, transparent 1px),
              linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            opacity: 0.55,
          }}
        />
      </div>

      <div style={{ width: '100%', maxWidth: '28rem', position: 'relative', zIndex: 10 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img
              src={appLogo}
              alt="HedgeOne Logo"
              style={{
                height: '3.5rem',
                width: 'auto',
              }}
            />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '0.35rem',
              color: theme.text,
            }}
          >
            HedgeOne
          </h1>
          <p style={{ color: theme.textMuted, fontSize: '0.95rem' }}>
            Sign in to the Algo-trader console
          </p>
        </div>

        {/* Auth card */}
        <div
          style={{
            padding: '1.75rem',
            backgroundColor: theme.bgCard,
            border: `1px solid ${theme.border}`,
            borderRadius: '1rem',
            boxShadow: theme.cardShadow,
          }}
        >
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.9rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: `1px solid ${theme.borderAccent}`,
                borderRadius: '999px',
                marginBottom: '0.75rem',
              }}
            >
              <LogIn style={{ width: '1rem', height: '1rem', color: theme.primaryLight }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.primary }}>Welcome back</span>
            </div>
            <p style={{ color: theme.textMuted, fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
              Access your algorithmic trading strategies and live execution dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Label htmlFor="email" style={{ color: theme.text, fontSize: '0.875rem', fontWeight: 500 }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputFieldStyle}
                className="focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Label htmlFor="password" style={{ color: theme.text, fontSize: '0.875rem', fontWeight: 500 }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputFieldStyle}
                className="focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: theme.gradient,
                color: '#ffffff',
                border: 'none',
                padding: '0.8rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                marginTop: '0.25rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
              className="hover:opacity-90 transition-all"
            >
              {isLoading ? (
                'Please wait...'
              ) : (
                <>
                  Sign In
                  <ArrowRight style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }} />
                </>
              )}
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: theme.border }} />
            <span style={{ color: theme.textMuted, fontSize: '0.8rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: theme.border }} />
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            variant="outline"
            style={{
              width: '100%',
              backgroundColor: theme.bgElevated,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              padding: '0.8rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              cursor: isGoogleLoading || isLoading ? 'not-allowed' : 'pointer',
              opacity: isGoogleLoading || isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
            className="hover:bg-slate-50 transition-all"
          >
            {isGoogleLoading ? (
              'Connecting...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.163-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.037-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.963 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.006-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.963 7.293C4.672 5.163 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: theme.textMuted, fontSize: '0.75rem' }}>
          Secure authentication powered by HedgeOne
        </p>
      </div>

      <style>{`
        input::placeholder {
          color: ${theme.textMuted};
          opacity: 0.7;
        }
        @media (max-width: 768px) {
          input {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

