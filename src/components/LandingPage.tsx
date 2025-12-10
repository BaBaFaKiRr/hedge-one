import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from './AuthContext';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
// @ts-ignore - Vite handles image imports
import appLogo from './app_logo.png';

interface LandingPageProps {
  onBackToMarketing?: () => void;
}

export function LandingPage({ onBackToMarketing }: LandingPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signup, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Check if user already exists and switch to login mode
      if (error instanceof Error && (error as any).code === 'user_exists') {
        const shouldSwitch = confirm(
          'An account with this email already exists. Would you like to switch to login?'
        );
        if (shouldSwitch) {
          setIsLogin(true);
          return;
        }
      }
      
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

  const neonGreen = '#00FF5A';
  const darkGreen = '#00CC47';
  const grey = '#A9A9A9';
  const darkBg = '#0a0a0a';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: `linear-gradient(to bottom right, #000000, ${darkBg}, #000000)`
        }} />
        {/* Particle Network */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '3px',
                height: '3px',
                backgroundColor: neonGreen,
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `pulse ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        {/* Gradient Orbs */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${neonGreen}15, transparent 70%)`,
          top: '-250px',
          right: '-250px',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: `radial-gradient(circle, ${neonGreen}10, transparent 70%)`,
          bottom: '-200px',
          left: '-200px',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
      </div>

      <div style={{ 
        width: '100%', 
        maxWidth: '28rem', 
        position: 'relative', 
        zIndex: 10 
      }}>
        {/* Logo/Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <img 
              src={appLogo} 
              alt="HedgeOne Logo" 
              onClick={onBackToMarketing}
              style={{ 
                height: '4rem', 
                width: 'auto',
                cursor: onBackToMarketing ? 'pointer' : 'default',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                filter: `drop-shadow(0 0 20px ${neonGreen}40)`
              }}
              className={onBackToMarketing ? "hover:scale-110 hover:drop-shadow-[0_0_30px_rgba(0,255,90,0.6)]" : ""}
            />
          </div>
          <h1 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: `linear-gradient(to right, #ffffff, ${neonGreen})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            HedgeOne
          </h1>
          <p style={{ color: grey, fontSize: '1rem' }}>
            {isLogin ? 'Welcome back to your trading dashboard' : 'Create your account to get started'}
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          padding: '2rem',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: `1px solid ${neonGreen}33`,
          borderRadius: '1rem',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px ${neonGreen}20`
        }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: `${neonGreen}15`,
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              {isLogin ? (
                <LogIn style={{ width: '1.25rem', height: '1.25rem', color: neonGreen }} />
              ) : (
                <UserPlus style={{ width: '1.25rem', height: '1.25rem', color: neonGreen }} />
              )}
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#ffffff',
                margin: 0
              }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
            </div>
            <p style={{ 
              color: grey, 
              fontSize: '0.875rem',
              margin: 0
            }}>
              {isLogin
                ? 'Sign in to access your algorithmic trading strategies'
                : 'Sign up to start managing your trading strategies'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!isLogin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Label 
                  htmlFor="name" 
                  style={{ 
                    color: '#ffffff', 
                    fontSize: '0.875rem', 
                    fontWeight: '500' 
                  }}
                >
                  Name
                </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease'
                  }}
                  className="focus:border-[#00FF5A] focus:outline-none focus:ring-2 focus:ring-[#00FF5A] focus:ring-opacity-20"
                  />
                </div>
              )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label 
                htmlFor="email" 
                style={{ 
                  color: '#ffffff', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}
              >
                Email
              </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${neonGreen}33`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                className="focus:border-[#00FF5A] focus:outline-none focus:ring-2 focus:ring-[#00FF5A] focus:ring-opacity-20"
                />
              </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Label 
                htmlFor="password" 
                style={{ 
                  color: '#ffffff', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}
              >
                Password
              </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${neonGreen}33`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                className="focus:border-[#00FF5A] focus:outline-none focus:ring-2 focus:ring-[#00FF5A] focus:ring-opacity-20"
                />
              </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                width: '100%',
                backgroundColor: neonGreen,
                color: '#000000',
                border: 'none',
                padding: '0.875rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                marginTop: '0.5rem',
                transition: 'all 0.3s ease',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
              className="hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,255,90,0.5)]"
            >
              {isLoading ? (
                'Please wait...'
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                  <ArrowRight style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }} />
                </>
              )}
              </Button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: grey,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  padding: '0.5rem'
                }}
                className="hover:text-[#00FF5A]"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              margin: '1.5rem 0',
              gap: '1rem'
            }}>
              <div style={{ 
                flex: 1, 
                height: '1px', 
                background: `linear-gradient(to right, transparent, ${neonGreen}33, transparent)` 
              }} />
              <span style={{ color: grey, fontSize: '0.875rem' }}>OR</span>
              <div style={{ 
                flex: 1, 
                height: '1px', 
                background: `linear-gradient(to right, transparent, ${neonGreen}33, transparent)` 
              }} />
            </div>

            {/* Google Sign In Button */}
            <Button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              style={{ 
                width: '100%',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: `1px solid ${neonGreen}33`,
                padding: '0.875rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                transition: 'all 0.3s ease',
                cursor: (isGoogleLoading || isLoading) ? 'not-allowed' : 'pointer',
                opacity: (isGoogleLoading || isLoading) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
              className="hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              {isGoogleLoading ? (
                'Connecting...'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.163-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.037-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.963 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.006-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.963 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
        </div>

        {/* Footer Note */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem',
          color: grey,
          fontSize: '0.75rem'
        }}>
          <p>Secure authentication powered by HedgeOne</p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        input::placeholder {
          color: ${grey}80;
        }
        input:focus {
          border-color: ${neonGreen} !important;
          box-shadow: 0 0 0 2px ${neonGreen}33 !important;
        }
      `}</style>
    </div>
  );
}
