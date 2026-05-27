import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Mail,
  Phone,
  Send,
  Globe,
  Smartphone,
  Cloud,
  Code2,
  Sparkles,
  Users,
  Package,
  BarChart3,
  HeadphonesIcon,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
// @ts-ignore - Vite handles image imports
import appLogo from './app_logo.png';
import { marketingTheme as theme, marketingInputStyle as inputStyle } from './marketingTheme';
import { marketingProducts, type ProductId } from './marketingProducts';

interface MarketingLandingPageProps {
  onNavigateToProduct: (productId: ProductId) => void;
}

export function MarketingLandingPage({ onNavigateToProduct }: MarketingLandingPageProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => {
    return createClient(`https://${projectId}.supabase.co`, publicAnonKey);
  }, []);

  const sendTelegramAlert = async (name: string, email: string, phone: string, message: string) => {
    const botToken = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram credentials are not configured.');
      return;
    }

    const telegramMessage =
      `🔔 New Inquiry Received\n\n` +
      `👤 Name: ${name}\n` +
      `📧 Email: ${email}\n` +
      `📱 Phone: ${phone || 'Not provided'}\n` +
      `💬 Message: ${message}\n\n` +
      `⏰ Time: ${new Date().toLocaleString()}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: telegramMessage, parse_mode: 'HTML' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Telegram API error:', errorData);
      }
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const phoneNumber = formData.phone.trim()
        ? parseInt(formData.phone.replace(/\D/g, ''), 10)
        : null;

      const { error: supabaseError } = await supabase.from('inquiry').insert([
        {
          name: formData.name,
          email: formData.email,
          phone: phoneNumber,
          message: formData.message,
        },
      ]);

      if (supabaseError) throw supabaseError;

      await sendTelegramAlert(formData.name, formData.email, formData.phone, formData.message);

      toast.success('Thank you for your message! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      console.error('Failed to submit inquiry:', error);
      toast.error(error?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const services = [
    {
      title: 'Web Applications',
      description: 'Responsive, scalable web apps tailored to your workflows and brand.',
      icon: Globe,
    },
    {
      title: 'Mobile Applications',
      description: 'Native and cross-platform mobile experiences for iOS and Android.',
      icon: Smartphone,
    },
    {
      title: 'Cloud Applications',
      description: 'Secure, cloud-native systems built for reliability and growth.',
      icon: Cloud,
    },
    {
      title: 'Custom Software',
      description: 'Bespoke solutions designed around your business processes and goals.',
      icon: Code2,
    },
  ];

  const strengths = [
    { label: 'End-to-end delivery', icon: Package },
    { label: 'Business-first consulting', icon: Users },
    { label: 'Modern tech stack', icon: Sparkles },
    { label: 'Ongoing support', icon: HeadphonesIcon },
  ];

  const navLinkStyle: React.CSSProperties = {
    color: theme.textMuted,
    fontSize: '0.9rem',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg, color: theme.text, overflowX: 'hidden' }}>
      {/* Navigation */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          backgroundColor: theme.navBg,
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.9rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={appLogo} alt="HedgeOne Logo" style={{ height: '2.25rem', width: 'auto' }} />
            <span style={{ fontSize: 'clamp(1rem, 4vw, 1.2rem)', fontWeight: 700, color: theme.text }}>
              HedgeOne
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => scrollTo('products')} style={navLinkStyle}>
              Products
            </button>
            <button type="button" onClick={() => scrollTo('services')} style={navLinkStyle}>
              Services
            </button>
            <button type="button" onClick={() => scrollTo('contact-section')} style={navLinkStyle}>
              Contact
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          position: 'relative',
          minHeight: '92vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '5.5rem',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.12), transparent),
                radial-gradient(ellipse 60% 40% at 100% 50%, rgba(245, 158, 11, 0.1), transparent),
                radial-gradient(ellipse 50% 30% at 0% 80%, rgba(20, 184, 166, 0.08), transparent)`,
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

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: `1px solid ${theme.borderAccent}`,
              borderRadius: '999px',
              padding: '0.35rem 0.9rem',
              marginBottom: '1.5rem',
              background: 'rgba(99, 102, 241, 0.08)',
            }}
          >
            <Sparkles style={{ width: '0.85rem', height: '0.85rem', color: theme.primaryLight }} />
            <span style={{ color: theme.textMuted, fontSize: '0.8rem', letterSpacing: '0.02em' }}>
              Hedgeone Consultants LLP
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: '1.25rem',
              maxWidth: '52rem',
              color: theme.text,
            }}
          >
            <span style={{ display: 'block' }}>Software solutions &amp; consultancy</span>
            <span style={{ display: 'block', color: theme.primary }}>built for your business</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: theme.textMuted,
              maxWidth: '40rem',
              lineHeight: 1.7,
              marginBottom: '2rem',
            }}
          >
            We develop software products and deliver consultancy for businesses and individuals — from
            algorithmic trading platforms to AI-powered business management, plus custom web, mobile, and
            cloud applications tailored to your needs.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Button
              onClick={() => scrollTo('products')}
              size="lg"
              style={{
                background: theme.gradient,
                color: '#fff',
                border: 'none',
                fontSize: '1rem',
                padding: '0.9rem 1.5rem',
                borderRadius: '0.6rem',
              }}
              className="hover:opacity-90 transition-all"
            >
              Explore Products
              <ArrowRight style={{ marginLeft: '0.5rem', width: '1.1rem', height: '1.1rem' }} />
            </Button>
            <Button
              onClick={() => scrollTo('contact-section')}
              size="lg"
              variant="outline"
              style={{
                border: `1px solid ${theme.border}`,
                color: theme.text,
                backgroundColor: theme.bgElevated,
                fontSize: '1rem',
                padding: '0.9rem 1.5rem',
                borderRadius: '0.6rem',
              }}
              className="hover:bg-slate-50 transition-all"
            >
              Start a Project
            </Button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginTop: '3.5rem',
              maxWidth: '36rem',
            }}
          >
            {strengths.map(({ label, icon: Icon }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  background: theme.bgElevated,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.6rem',
                  boxShadow: theme.cardShadow,
                }}
              >
                <Icon style={{ width: '1rem', height: '1rem', color: theme.primaryLight, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" style={{ padding: 'clamp(4rem, 8vw, 6rem) 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
            <p style={{ color: theme.primaryLight, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Our Products
            </p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
              Platforms we build and operate
            </h2>
            <p style={{ color: theme.textMuted, maxWidth: '36rem', margin: '0 auto', lineHeight: 1.6 }}>
              Purpose-built software for trading desks and growing businesses.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '1.5rem',
            }}
          >
            {marketingProducts.map((product) => (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigateToProduct(product.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigateToProduct(product.id);
                  }
                }}
                style={{
                  padding: '1.75rem',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '1rem',
                  boxShadow: theme.cardShadow,
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="hover:border-indigo-400/50 hover:shadow-md transition-all"
              >
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '0.75rem',
                    background: theme.bgElevated,
                    border: `1px solid ${theme.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                    padding: '0.35rem',
                  }}
                >
                  <img
                    src={product.logo}
                    alt={product.logoAlt}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem' }}>{product.name}</h3>
                <p style={{ color: product.accent, fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  {product.tagline}
                </p>
                <p style={{ color: theme.textMuted, fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.25rem', flex: 1 }}>
                  {product.description}
                </p>

                <div style={{ display: 'grid', gap: '0.45rem', marginBottom: '1.5rem' }}>
                  {product.features.slice(0, 4).map((feature) => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: theme.textMuted }}>
                      <CheckCircle2 style={{ width: '0.9rem', height: '0.9rem', color: product.accent, flexShrink: 0 }} />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToProduct(product.id);
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: product.accent,
                    border: 'none',
                    padding: '0.5rem 0',
                    fontWeight: 600,
                    boxShadow: 'none',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  Know more
                  <ArrowRight style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        id="services"
        style={{
          padding: 'clamp(4rem, 8vw, 6rem) 1.5rem',
          background: `linear-gradient(180deg, ${theme.bgSubtle} 0%, ${theme.bg} 50%, ${theme.bgSubtle} 100%)`,
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2.5rem', alignItems: 'start', marginBottom: '2.5rem' }}>
            <div>
              <p style={{ color: theme.accentTeal, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Consultancy Services
              </p>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: '1rem' }}>
                Software crafted to your specifications
              </h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Our services center on curating web apps, mobile apps, cloud applications, and any software
                as per client needs — from discovery and architecture through delivery and support.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['Discovery & requirements', 'Design & architecture', 'Build & deployment', 'Maintenance & iteration'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '0.4rem',
                        background: theme.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: theme.textMuted, fontSize: '0.9rem' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {services.map((service) => (
                <div
                  key={service.title}
                  style={{
                    padding: '1.25rem',
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.75rem',
                    boxShadow: theme.cardShadow,
                  }}
                  className="hover:border-teal-500/40 hover:shadow-md transition-all"
                >
                  <service.icon style={{ width: '1.5rem', height: '1.5rem', color: theme.accentTeal, marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>{service.title}</h3>
                  <p style={{ color: theme.textMuted, fontSize: '0.85rem', lineHeight: 1.55 }}>{service.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(20, 184, 166, 0.06) 100%)',
              boxShadow: theme.cardShadow,
              border: `1px solid ${theme.borderAccent}`,
              borderRadius: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BarChart3 style={{ width: '1.5rem', height: '1.5rem', color: theme.primaryLight }} />
              <p style={{ color: theme.textMuted, fontSize: '0.95rem', maxWidth: '28rem' }}>
                Whether you need a trading desk, an ERP rollout, or a greenfield product — we partner with you end to end.
              </p>
            </div>
            <Button
              onClick={() => scrollTo('contact-section')}
              style={{
                background: theme.gradientWarm,
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                padding: '0.65rem 1.25rem',
              }}
              className="hover:opacity-90"
            >
              Discuss Your Project
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact-section" style={{ padding: 'clamp(4rem, 8vw, 6rem) 1.5rem' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
              Let&apos;s build something together
            </h2>
            <p style={{ color: theme.textMuted, maxWidth: '32rem', margin: '0 auto', lineHeight: 1.6 }}>
              Tell us about your product idea, consultancy need, or Algo-trader requirements — we&apos;ll respond promptly.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.75rem',
                  boxShadow: theme.cardShadow,
                }}
              >
                <Mail style={{ width: '1.75rem', height: '1.75rem', color: theme.primaryLight, marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Email</h3>
                <a href="mailto:contact@hedgeone.co.in" style={{ color: theme.primaryLight, textDecoration: 'none', fontSize: '0.9rem' }} className="hover:underline">
                  contact@hedgeone.co.in
                </a>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.75rem',
                  boxShadow: theme.cardShadow,
                }}
              >
                <Phone style={{ width: '1.75rem', height: '1.75rem', color: theme.accentTeal, marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Phone</h3>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  <a href="tel:+16232816140" style={{ color: theme.primaryLight, textDecoration: 'none' }} className="hover:underline">
                    +1 623 281-6140
                  </a>
                  <span style={{ margin: '0 0.35rem' }}>|</span>
                  <a href="tel:+918447824472" style={{ color: theme.primaryLight, textDecoration: 'none' }} className="hover:underline">
                    +91 84478 24472
                  </a>
                </p>
              </div>
              <div
                style={{
                  padding: '1.25rem',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.75rem',
                  boxShadow: theme.cardShadow,
                }}
              >
                <MessageCircle style={{ width: '1.75rem', height: '1.75rem', color: theme.accentTeal, marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Quick connect</h3>
                <p style={{ color: theme.textMuted, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Reach us on WhatsApp or Telegram for faster responses.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button variant="outline" style={{ border: `1px solid ${theme.border}`, color: theme.text, background: theme.bgElevated }} className="hover:bg-slate-50">
                    WhatsApp
                  </Button>
                  <Button variant="outline" style={{ border: `1px solid ${theme.border}`, color: theme.text, background: theme.bgElevated }} className="hover:bg-slate-50">
                    Telegram
                  </Button>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                background: theme.bgCard,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.75rem',
                boxShadow: theme.cardShadow,
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Send a message</h3>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  style={inputStyle()}
                  className="focus:outline-none focus:border-indigo-500/60 disabled:opacity-50"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  style={inputStyle()}
                  className="focus:outline-none focus:border-indigo-500/60 disabled:opacity-50"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                  style={inputStyle()}
                  className="focus:outline-none focus:border-indigo-500/60 disabled:opacity-50"
                />
                <textarea
                  placeholder="How can we help?"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={isSubmitting}
                  style={{ ...inputStyle(), resize: 'none', fontFamily: 'inherit' }}
                  className="focus:outline-none focus:border-indigo-500/60 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    background: theme.gradient,
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  className="hover:opacity-90 disabled:opacity-50"
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
      <footer style={{ padding: '2.5rem 1.5rem', borderTop: `1px solid ${theme.border}`, backgroundColor: theme.bgSubtle }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src={appLogo} alt="HedgeOne Logo" style={{ height: '2.25rem', width: 'auto' }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: theme.text }}>HedgeOne</span>
            </div>
            <p style={{ color: theme.textMuted, fontSize: '0.875rem', maxWidth: '28rem', lineHeight: 1.6 }}>
              Hedgeone Consultants LLP — software solutions and consultancy for businesses and individuals.
            </p>
            <p style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
              © {new Date().getFullYear()} Hedgeone Consultants LLP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          input, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}