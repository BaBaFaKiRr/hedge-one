import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { 
  Zap, 
  Code, 
  TrendingUp,
  BarChart3, 
  Shield, 
  Clock, 
  Activity, 
  Globe,
  ArrowRight,
  CheckCircle2,
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
  const [scrollY, setScrollY] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => {
    return createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        minHeight: '100vh', 
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
          {/* Particle Network */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
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
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
              fontWeight: 'bold', 
              lineHeight: '1.2',
              marginBottom: '2rem'
            }}>
              <span style={{ display: 'block' }}>Next-Gen Algorithmic</span>
              <span style={{ 
                display: 'block',
                background: `linear-gradient(to right, #ffffff, ${neonGreen}, #ffffff)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Trading. Tailored for You.
              </span>
            </h1>
            <p style={{ 
              fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', 
              color: grey, 
              maxWidth: '42rem', 
              margin: '0 auto 2rem',
              lineHeight: '1.6'
            }}>
              We curate high-performance algorithmic trading strategies and build custom algotrading software 
              across Stocks, Commodities, FnO, and Cryptocurrencies.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', paddingTop: '1rem' }}>
              <Button
                onClick={scrollToContact}
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
                Book a Strategy Call
                <ArrowRight style={{ marginLeft: '0.5rem', width: '1.25rem', height: '1.25rem' }} />
              </Button>
              <Button
                onClick={onGetStarted}
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
                Explore Our Systems
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{ 
          position: 'absolute', 
          bottom: '2.5rem', 
          left: '50%', 
          transform: 'translateX(-50%)',
          animation: 'bounce 2s infinite'
        }}>
          <div style={{ 
            width: '1.5rem', 
            height: '2.5rem', 
            border: `2px solid ${neonGreen}`, 
            borderRadius: '9999px', 
            display: 'flex', 
            justifyContent: 'center',
            paddingTop: '0.5rem'
          }}>
            <div style={{ 
              width: '4px', 
              height: '0.75rem', 
              backgroundColor: neonGreen, 
              borderRadius: '9999px',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div style={{ 
        height: '1px', 
        background: `linear-gradient(to right, transparent, ${neonGreen}, transparent)`,
        opacity: 0.5
      }} />

      {/* About Us Section */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', position: 'relative' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(2rem, 5vw, 3rem)', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                About <span style={{ color: neonGreen }}>HedgeOne</span>
              </h2>
              <p style={{ fontSize: '1.125rem', color: grey, lineHeight: '1.75', marginBottom: '1rem' }}>
                HedgeOne specializes in curating high-performance algorithmic trading strategies 
                and developing custom algotrading software solutions. We combine quantitative research, 
                advanced technology, and deep market expertise to deliver trading systems that perform.
              </p>
              <p style={{ fontSize: '1.125rem', color: grey, lineHeight: '1.75', marginBottom: '1.5rem' }}>
                Our team operates across multiple asset classes—Stocks, Commodities, Futures & Options, 
                and Cryptocurrencies—ensuring comprehensive coverage and diversified strategies for our clients.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', paddingTop: '1rem' }}>
                {[
                  { value: '100+', label: 'Strategies' },
                  { value: '24/7', label: 'Monitoring' },
                  { value: '99.9%', label: 'Uptime' }
                ].map((stat, i) => (
                  <div key={i} style={{ 
                    padding: 'clamp(0.75rem, 2vw, 1rem)', 
                    backgroundColor: '#000000', 
                    border: `1px solid ${neonGreen}33`,
                    borderRadius: '0.75rem',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.875rem)', fontWeight: 'bold', color: neonGreen }}>{stat.value}</div>
                    <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: grey, marginTop: '0.25rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'relative', 
                background: `linear-gradient(to bottom right, ${neonGreen}1a, transparent)`,
                borderRadius: '1rem',
                padding: 'clamp(1rem, 3vw, 2rem)',
                border: `1px solid ${neonGreen}33`,
                backdropFilter: 'blur(4px)'
              }}>
                <div className="asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'clamp(0.5rem, 2vw, 1rem)' }}>
                  {['Stocks', 'Commodities', 'FnO', 'Crypto'].map((asset, i) => (
                    <div
                      key={asset}
                      style={{
                        padding: 'clamp(0.75rem, 2vw, 1.5rem)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: `1px solid ${neonGreen}33`,
                        borderRadius: '0.75rem',
                        transition: 'all 0.3s ease',
                        minWidth: 0
                      }}
                      className="hover:border-[#00FF5A] hover:shadow-[0_0_20px_rgba(0,255,90,0.3)]"
                    >
                      <div style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontWeight: 'bold', color: neonGreen, marginBottom: '0.5rem' }}>{asset}</div>
                      <div style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: grey }}>Multi-Asset Trading</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', background: `linear-gradient(to bottom, #000000, ${darkBg})` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 4rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Our <span style={{ color: neonGreen }}>Services</span>
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', color: grey, maxWidth: '42rem', margin: '0 auto', padding: '0 1rem' }}>
              Comprehensive algorithmic trading solutions tailored to your needs
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem' }}>
            {[
              {
                icon: TrendingUp,
                title: 'Algo Strategy Curation',
                description: 'Hand-picked, high-performance trading strategies vetted by our quantitative team.',
                gradient: `linear-gradient(to bottom right, ${neonGreen}, ${darkGreen})`,
              },
              {
                icon: Code,
                title: 'Custom Software Development',
                description: 'Bespoke algorithmic trading systems built to your specifications and requirements.',
                gradient: 'linear-gradient(to bottom right, #3b82f6, #06b6d4)',
              },
              {
                icon: BarChart3,
                title: 'Quant Research & Backtesting',
                description: 'Rigorous testing and optimization using historical data and advanced analytics.',
                gradient: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
              },
              {
                icon: Globe,
                title: 'Multi-Asset Trading',
                description: 'Seamless trading across Stocks, FnO, Commodities, and Cryptocurrencies.',
                gradient: `linear-gradient(to bottom right, ${neonGreen}, #10b981)`,
              },
            ].map((service, i) => (
              <div
                key={service.title}
                style={{
                  position: 'relative',
                  padding: '1.5rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
                  background: service.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  transition: 'transform 0.3s ease'
                }}
                className="group-hover:scale-110"
                >
                  <service.icon style={{ width: '1.5rem', height: '1.5rem', color: '#000000' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffffff' }}>{service.title}</h3>
                <p style={{ color: grey, fontSize: '0.875rem', lineHeight: '1.75' }}>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Why Us Section */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 4rem)' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>
              Why <span style={{ color: neonGreen }}>Choose Us</span>
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', color: grey, maxWidth: '42rem', margin: '0 auto', padding: '0 1rem' }}>
              Cutting-edge technology meets proven expertise
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1.5rem' }}>
            {[
              { icon: Zap, title: 'Ultra-Low Latency Systems', desc: 'Microsecond execution speeds' },
              { icon: TrendingUp, title: 'Strategy Optimization', desc: 'Continuous performance tuning' },
              { icon: Shield, title: 'High-Availability Architecture', desc: '99.9% uptime guarantee' },
              { icon: Activity, title: 'Real-Time Risk Engine', desc: 'Advanced risk management' },
              { icon: Clock, title: '24/7 Monitoring', desc: 'Round-the-clock surveillance' },
              { icon: Globe, title: 'Multi-Exchange Connectivity', desc: 'Seamless integration' },
              { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep market insights' },
              { icon: CheckCircle2, title: 'Proven Track Record', desc: 'Trusted by traders worldwide' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${neonGreen}33`,
                  borderRadius: '0.75rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s ease'
                }}
                className="hover:border-[#00FF5A] hover:shadow-[0_0_20px_rgba(0,255,90,0.3)]"
              >
                <div style={{ 
                  width: '3rem', 
                  height: '3rem', 
                  borderRadius: '0.75rem', 
                  background: `linear-gradient(to bottom right, ${neonGreen}33, ${neonGreen}0d)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  transition: 'all 0.3s ease'
                }}
                className="group-hover:bg-gradient-to-br group-hover:from-[#00FF5A] group-hover:to-[#00CC47]"
                >
                  <feature.icon style={{ width: '1.5rem', height: '1.5rem', color: neonGreen }} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffffff' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.875rem', color: grey }}>{feature.desc}</p>
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
                  contact@hedgeone.com
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
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
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
