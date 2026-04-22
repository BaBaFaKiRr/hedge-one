import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { 
  CheckCircle2,
  Rocket,
  Cpu,
  Shield,
  TrendingUp,
  Activity,
  Workflow,
  Layers,
  LineChart,
  Bell,
  Server,
  Gauge,
  ArrowRight,
  MessageCircle,
  Mail,
  Send
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
// @ts-ignore - Vite handles image imports
import appLogo from './app_logo.png';

interface MarketingLandingPageProps {
  onGetStarted: () => void;
}

export function MarketingLandingPage({ onGetStarted }: MarketingLandingPageProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => {
    return createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }, []);

  const sendTelegramAlert = async (name: string, email: string, phone: string, message: string) => {
    // Get credentials from environment variables
    const botToken = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID;
    
    // Validate that credentials are set
    if (!botToken || !chatId) {
      console.error('Telegram credentials are not configured. Please set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in your environment variables.');
      return; // Silently fail - don't block form submission
    }
    
    const telegramMessage = `🔔 New Inquiry Received\n\n` +
      `👤 Name: ${name}\n` +
      `📧 Email: ${email}\n` +
      `📱 Phone: ${phone || 'Not provided'}\n` +
      `💬 Message: ${message}\n\n` +
      `⏰ Time: ${new Date().toLocaleString()}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
            parse_mode: 'HTML',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Telegram API error:', errorData);
        // Don't throw - we still want to save to Supabase even if Telegram fails
      }
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
      // Don't throw - we still want to save to Supabase even if Telegram fails
    }
  };

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert phone to number if provided, otherwise null
      const phoneNumber = formData.phone.trim() ? parseInt(formData.phone.replace(/\D/g, ''), 10) : null;

      // Save to Supabase
      const { error: supabaseError } = await supabase
        .from('inquiry')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: phoneNumber,
            message: formData.message,
          },
        ]);

      if (supabaseError) {
        throw supabaseError;
      }

      // Send Telegram alert
      await sendTelegramAlert(formData.name, formData.email, formData.phone, formData.message);

      // Success
      toast.success('Thank you for your message! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      console.error('Failed to submit inquiry:', error);
      toast.error(error?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const neonGreen = '#00FF5A';
  const darkGreen = '#00CC47';
  const grey = '#A9A9A9';
  const darkBg = '#0a0a0a';
  const cardBg = 'rgba(7, 7, 7, 0.75)';

  const steps = [
    {
      title: 'Connect Your Broker',
      description:
        'Securely plug in Zerodha and other supported broker accounts so HedgeOne can execute with your permissions.',
      icon: Shield,
    },
    {
      title: 'Pick or Build Strategy',
      description:
        'Launch a proven in-house strategy or request a custom ruleset tuned to your risk profile and market preferences.',
      icon: Workflow,
    },
    {
      title: 'Deploy and Monitor',
      description:
        'Go live instantly with live positions, TradingView charts, logs, and broker-aware execution guardrails.',
      icon: Rocket,
    },
  ];

  const useCases = [
    'Index breakout automation',
    'Stock intraday signal execution',
    'Live portfolio supervision',
    'PnL and risk tracking',
    'Manual + automated hybrid trading',
    'Daily tradebook analytics',
  ];

  const coreFeatures = [
    { title: 'Strategy Engine', desc: 'Rule-driven execution with configurable entries, exits, and position sizing.', icon: Cpu },
    { title: 'Real-time Monitoring', desc: 'Observe live positions, quotes, chart overlays, and execution states.', icon: Activity },
    { title: 'Risk Controls', desc: 'Use hard stop conditions, quantity controls, and strategy-level safeguards.', icon: Shield },
    { title: 'TradingView Context', desc: 'Read market context with integrated charts where positions and entries align.', icon: LineChart },
    { title: 'Broker Reliability', desc: 'Broker-aware workflows with error handling and session management support.', icon: Server },
    { title: 'Signal-to-Execution Pipeline', desc: 'Move from idea to deployed strategy without rebuilding infrastructure.', icon: Layers },
  ];

  const planCards = [
    {
      name: 'Starter',
      subtitle: 'For disciplined solo traders',
      points: ['1 live account', '2 active strategies', 'Dashboard + tradebook + positions', 'Email + Telegram support'],
      cta: 'Start with Starter',
    },
    {
      name: 'Pro',
      subtitle: 'For active intraday operators',
      points: ['Up to 3 accounts', 'Custom strategy onboarding', 'Priority infra monitoring', 'Advanced analytics and logs'],
      cta: 'Choose Pro',
      highlighted: true,
    },
    {
      name: 'Desk',
      subtitle: 'For small prop teams',
      points: ['Multi-user collaboration', 'Dedicated deployment setup', 'Tailored risk controls', 'Hands-on integration support'],
      cta: 'Talk to Us',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', overflowX: 'hidden' }}>
      {/* Navigation */}
      <nav style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        zIndex: 50, 
        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${neonGreen}33`
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src={appLogo} 
              alt="HedgeOne Logo" 
              style={{ 
                height: '2.5rem', 
                width: 'auto',
                filter: `drop-shadow(0 0 10px ${neonGreen}40)`
              }}
            />
            <span style={{ 
              fontSize: 'clamp(1rem, 4vw, 1.25rem)', 
              fontWeight: 'bold',
              background: `linear-gradient(to right, #ffffff, ${neonGreen})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              HedgeOne
            </span>
          </div>
          <Button
            onClick={onGetStarted}
            style={{ 
              backgroundColor: neonGreen, 
              color: '#000000',
              border: 'none',
              fontSize: 'clamp(0.875rem, 3vw, 1rem)',
              padding: '0.5rem 1rem'
            }}
            className="hover:opacity-90 transition-all"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        minHeight: '88vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingTop: '5rem',
        overflow: 'hidden'
      }}>
        {/* Animated Background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: `linear-gradient(to bottom right, #000000, ${darkBg}, #000000)`
          }} />
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 20% 20%, ${neonGreen}11, transparent 35%), radial-gradient(circle at 80% 30%, #22d3ee1a, transparent 35%), radial-gradient(circle at 50% 80%, #7c3aed22, transparent 35%)` }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${neonGreen}55`, borderRadius: '999px', padding: '0.4rem 0.9rem', marginBottom: '1.25rem', background: `${neonGreen}14` }}>
              <Bell style={{ width: '0.9rem', height: '0.9rem', color: neonGreen }} />
              <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>Now live - manage your algo desk from one console</span>
            </div>
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
              fontWeight: 'bold', 
              lineHeight: '1.2',
              marginBottom: '2rem'
            }}>
              <span style={{ display: 'block' }}>Your Trading Assistant,</span>
              <span style={{ 
                display: 'block',
                background: `linear-gradient(to right, #ffffff, ${neonGreen}, #ffffff)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                running your strategy stack.
              </span>
            </h1>
            <p style={{ 
              fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', 
              color: grey, 
              maxWidth: '42rem', 
              margin: '0 auto 2rem',
              lineHeight: '1.6'
            }}>
              HedgeOne helps you deploy, monitor, and improve algorithmic strategies without building infra from scratch. Plug in a broker, activate your strategy, and track execution live.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', paddingTop: '1rem' }}>
              <Button
                onClick={onGetStarted}
                size="lg"
                style={{ 
                  backgroundColor: neonGreen, 
                  color: '#000000',
                  fontSize: '1.125rem',
                  padding: '1.5rem 2rem',
                  borderRadius: '0.75rem',
                  border: 'none'
                }}
                className="hover:opacity-90 hover:scale-105 transition-all"
              >
                Launch Dashboard
                <ArrowRight style={{ marginLeft: '0.5rem', width: '1.25rem', height: '1.25rem' }} />
              </Button>
              <Button
                onClick={scrollToContact}
                size="lg"
                variant="outline"
                style={{ 
                  border: `2px solid ${neonGreen}`, 
                  color: neonGreen,
                  backgroundColor: 'transparent',
                  fontSize: '1.125rem',
                  padding: '1.5rem 2rem',
                  borderRadius: '0.75rem'
                }}
                className="hover:bg-opacity-10 transition-all"
              >
                Talk to Strategy Team
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div style={{ 
        height: '1px', 
        background: `linear-gradient(to right, transparent, ${neonGreen}, transparent)`,
        opacity: 0.5
      }} />

      {/* How It Works */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', position: 'relative' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 4rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Three steps. <span style={{ color: neonGreen }}>That&apos;s it.</span>
            </h2>
            <p style={{ color: grey, fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto' }}>
              HedgeOne is designed so execution teams can go live quickly while still retaining strong controls.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
            {steps.map((step, index) => (
              <div key={step.title} style={{ background: cardBg, border: `1px solid ${neonGreen}2e`, borderRadius: '1rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '2.4rem', height: '2.4rem', borderRadius: '0.7rem', background: `${neonGreen}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <step.icon style={{ width: '1.1rem', height: '1.1rem', color: neonGreen }} />
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>0{index + 1}</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>{step.title}</h3>
                <p style={{ color: grey, fontSize: '0.9rem', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases + Features */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', background: `linear-gradient(to bottom, #000000, ${darkBg})` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: cardBg, border: `1px solid ${neonGreen}30`, borderRadius: '1rem', padding: '1.4rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.8rem' }}>Put your algo stack to work</h3>
              <p style={{ color: grey, marginBottom: '1rem' }}>
                Run deployment-grade workflows without managing servers, websockets, or broker session complexity.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                {useCases.map((item) => (
                  <span key={item} style={{ border: `1px solid ${neonGreen}45`, color: '#d1fae5', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ background: cardBg, border: `1px solid #334155`, borderRadius: '1rem', padding: '1.4rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.8rem' }}>Why teams choose HedgeOne</h3>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {['Transparent strategy lifecycle', 'Live execution visibility', 'Broker-level resilience', 'Fast iteration on custom ideas'].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <CheckCircle2 style={{ width: '0.95rem', height: '0.95rem', color: neonGreen }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Core <span style={{ color: neonGreen }}>Capabilities</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem' }}>
            {coreFeatures.map((feature) => (
              <div
                key={feature.title}
                style={{
                  position: 'relative',
                  padding: '1.5rem',
                  backgroundColor: cardBg,
                  border: `1px solid ${neonGreen}33`,
                  borderRadius: '0.75rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s ease'
                }}
                className="hover:border-[#00FF5A] hover:shadow-[0_0_30px_rgba(0,255,90,0.4)] hover:-translate-y-2"
              >
                <div style={{ 
                  width: '3rem', 
                  height: '3rem', 
                  borderRadius: '0.75rem', 
                  background: `linear-gradient(to bottom right, ${neonGreen}, ${darkGreen})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  transition: 'transform 0.3s ease'
                }}
                className="group-hover:scale-110"
                >
                  <feature.icon style={{ width: '1.5rem', height: '1.5rem', color: '#000000' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffffff' }}>{feature.title}</h3>
                <p style={{ color: grey, fontSize: '0.875rem', lineHeight: '1.7' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 4rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Choose your <span style={{ color: neonGreen }}>deployment path</span>
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', color: grey, maxWidth: '42rem', margin: '0 auto', padding: '0 1rem' }}>
              Start with a managed setup and scale as your strategy throughput and capital grow.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem' }}>
            {planCards.map((plan) => (
              <div
                key={plan.name}
                style={{
                  padding: '1.5rem',
                  backgroundColor: plan.highlighted ? `${neonGreen}14` : cardBg,
                  border: plan.highlighted ? `1px solid ${neonGreen}` : `1px solid ${neonGreen}33`,
                  borderRadius: '0.75rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s ease'
                }}
                className="hover:border-[#00FF5A] hover:shadow-[0_0_20px_rgba(0,255,90,0.3)]"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffffff' }}>{plan.name}</h3>
                  {plan.highlighted && <span style={{ color: '#052e16', background: neonGreen, padding: '0.18rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>POPULAR</span>}
                </div>
                <p style={{ color: '#cbd5e1', marginBottom: '0.9rem', fontSize: '0.9rem' }}>{plan.subtitle}</p>
                <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                  {plan.points.map((point) => (
                    <div key={point} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem', color: neonGreen }} />
                      {point}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={plan.name === 'Desk' ? scrollToContact : onGetStarted}
                  style={{ width: '100%', background: plan.highlighted ? neonGreen : '#111827', color: plan.highlighted ? '#000' : '#fff', border: plan.highlighted ? 'none' : '1px solid #334155' }}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact-section" style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', background: `linear-gradient(to bottom, #000000, ${darkBg})` }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Ready to <span style={{ color: neonGreen }}>Get Started?</span>
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', color: grey, maxWidth: '42rem', margin: '0 auto', padding: '0 1rem' }}>
              Let's discuss how HedgeOne can transform your trading operations
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(1.5rem, 4vw, 2rem)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                border: `1px solid ${neonGreen}33`,
                borderRadius: '0.75rem',
                backdropFilter: 'blur(4px)'
              }}>
              <Mail style={{ width: '2rem', height: '2rem', color: neonGreen, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffffff' }}>Email Us</h3>
                <a href="mailto:contact@hedgeone.com" style={{ color: neonGreen, textDecoration: 'none' }} className="hover:underline">
                  contact@hedgeone.co.in
                </a>
              </div>
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                border: `1px solid ${neonGreen}33`,
                borderRadius: '0.75rem',
                backdropFilter: 'blur(4px)'
              }}>
                <MessageCircle style={{ width: '2rem', height: '2rem', color: neonGreen, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffffff' }}>Get in Touch</h3>
                <p style={{ color: grey, fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Reach out via WhatsApp or Telegram for instant support
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button
                    variant="outline"
                    style={{ 
                      border: `1px solid ${neonGreen}`, 
                      color: neonGreen,
                      backgroundColor: 'transparent'
                    }}
                    className="hover:bg-opacity-10"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    style={{ 
                      border: `1px solid ${neonGreen}`, 
                      color: neonGreen,
                      backgroundColor: 'transparent'
                    }}
                    className="hover:bg-opacity-10"
                  >
                    Telegram
                  </Button>
                </div>
              </div>
            </div>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              border: `1px solid ${neonGreen}33`,
              borderRadius: '0.75rem',
              backdropFilter: 'blur(4px)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#ffffff' }}>Send a Message</h3>
              <form 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                onSubmit={handleSubmit}
              >
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                  className="focus:border-[#00FF5A] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                  className="focus:border-[#00FF5A] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                  className="focus:border-[#00FF5A] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <textarea
                  placeholder="Message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                  className="focus:border-[#00FF5A] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ 
                    width: '100%',
                    backgroundColor: neonGreen, 
                    color: '#000000',
                    border: 'none'
                  }}
                  className="hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,255,90,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                  {!isSubmitting && <Send style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }} />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 1.5rem', borderTop: `1px solid ${neonGreen}33` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img 
                src={appLogo} 
                alt="HedgeOne Logo" 
                style={{ 
                  height: '2.5rem', 
                  width: 'auto',
                  filter: `drop-shadow(0 0 10px ${neonGreen}40)`
                }}
              />
              <span style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold',
                background: `linear-gradient(to right, #ffffff, ${neonGreen})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                HedgeOne
              </span>
            </div>
            <div style={{ color: grey, fontSize: '0.875rem', textAlign: 'center' }}>
              <p>© {new Date().getFullYear()} HedgeOne. All rights reserved.</p>
              <p style={{ marginTop: '0.25rem' }}>Next-Gen Algorithmic Trading Solutions</p>
                <p style={{ marginTop: '0.25rem' }}>
                  Charts powered by{' '}
                  <a
                    href="https://www.tradingview.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#7dd3fc', textDecoration: 'underline' }}
                  >
                    TradingView
                  </a>
                </p>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          /* Mobile-specific styles */
          .mobile-stack {
            display: flex;
            flex-direction: column;
          }
          .mobile-half {
            width: 100%;
          }
          /* Make asset grid single column on mobile */
          .asset-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          /* Ensure tables don't overflow on mobile */
          table {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          /* Make form inputs more touch-friendly */
          input, textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
