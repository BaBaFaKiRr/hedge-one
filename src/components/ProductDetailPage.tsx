import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2, LogIn } from 'lucide-react';
import { marketingTheme as theme } from './marketingTheme';
import { getMarketingProduct, type ProductId } from './marketingProducts';

interface ProductDetailPageProps {
  productId: ProductId;
  onBack: () => void;
  onLogin: () => void;
}

export function ProductDetailPage({ productId, onBack, onLogin }: ProductDetailPageProps) {
  const product = getMarketingProduct(productId);
  const isLejer = productId === 'lejer';
  const isAlgo = productId === 'algo-trader';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [productId]);

  const handleLogin = () => {
    if (product.loginType === 'external' && product.loginUrl) {
      window.location.href = product.loginUrl;
      return;
    }
    onLogin();
  };

  const sharedFooter = (
    <footer
      style={{
        borderTop: `1px solid ${theme.border}`,
        background: '#ffffff',
        marginTop: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '1.1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: theme.textMuted,
        }}
      >
        <span>© {new Date().getFullYear()} HedgeOne Consultants LLP</span>
        <span>
          {product.name}
          {isAlgo && (
            <>
              {' '}| Charts powered by{' '}
              <a
                href="https://www.tradingview.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: theme.primaryLight, textDecoration: 'none' }}
                className="hover:underline"
              >
                TradingView
              </a>
            </>
          )}
        </span>
      </div>
    </footer>
  );

  if (isLejer) {
    return (
      <div style={{ minHeight: '100vh', background: '#eef5ff', color: theme.text, overflowX: 'hidden' }}>
        <section
          style={{
            position: 'relative',
            padding: '1.1rem 1.25rem 2.5rem',
            borderBottom: `1px solid ${theme.border}`,
            background: `linear-gradient(135deg, #d6e9ff 0%, #e8f2ff 35%, #f6f8ff 68%, #fffaf3 100%)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.32,
              pointerEvents: 'none',
              backgroundImage: `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
              backgroundSize: '56px 56px',
            }}
          />

          <div style={{ position: 'relative', maxWidth: '1280px', margin: '0 auto' }}>
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src={product.logo} alt={product.logoAlt} style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>LEJER ERP</span>
              </div>
            </header>

            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '1.2rem auto 0' }}>
              <p
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  border: `1px solid ${theme.border}`,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.textMuted,
                  background: 'rgba(255,255,255,0.7)',
                }}
              >
                Secure, scalable, compliant
              </p>
              <h1 style={{ marginTop: '1rem', fontSize: 'clamp(2rem, 5vw, 3.65rem)', fontWeight: 700, lineHeight: 1.12 }}>
                Transition Your Business into the age of AI
              </h1>
              <p style={{ marginTop: '0.85rem', color: theme.textMuted, fontSize: '1.03rem', lineHeight: 1.6 }}>
                Run finance, inventory, procurement, and approvals in one AI-assisted workspace.
              </p>

              <div style={{ marginTop: '1.35rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleLogin}
                  style={{ background: product.heroGradient, color: '#fff', border: 'none', borderRadius: '0.55rem', padding: '0.72rem 1.15rem', fontWeight: 600 }}
                >
                  <LogIn style={{ width: '1rem', height: '1rem', marginRight: '0.45rem' }} />
                  {product.loginLabel}
                </Button>
                <Button
                  variant="ghost"
                  style={{ background: 'rgba(255,255,255,0.8)', border: `1px solid ${theme.border}`, borderRadius: '0.55rem' }}
                >
                  Request a demo
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '1.8rem', position: 'relative' }}>
              <div
                style={{
                  maxWidth: '860px',
                  margin: '0 auto',
                  borderRadius: '0.95rem',
                  overflow: 'hidden',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 18px 48px rgba(30, 64, 175, 0.12)',
                  background: '#ffffff',
                }}
              >
                <img src={product.heroImage} alt="LEJER dashboard" style={{ width: '100%', display: 'block', opacity: 0.95 }} />
              </div>

              <div style={{ position: 'absolute', left: '0.5%', top: '10%', width: '140px', display: 'grid', gap: '0.6rem' }}>
                {['Receivables', 'Purchases', 'Production'].map((item) => (
                  <div key={item} style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(6px)', border: `1px solid ${theme.border}`, borderRadius: '0.7rem', padding: '0.55rem', fontSize: '0.72rem', color: theme.textMuted }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', right: '0.5%', top: '10%', width: '140px', display: 'grid', gap: '0.6rem' }}>
                {['Sales tracker', 'Inventory', 'Approvals'].map((item) => (
                  <div key={item} style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(6px)', border: `1px solid ${theme.border}`, borderRadius: '0.7rem', padding: '0.55rem', fontSize: '0.72rem', color: theme.textMuted }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: '1180px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
            {product.quickPoints.map((line) => (
              <div key={line} style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '0.8rem', padding: '0.9rem 1rem', color: theme.textMuted, fontSize: '0.9rem' }}>
                {line}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '0.95rem', padding: '1rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '0.8rem' }}>What you can run on LEJER</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.75rem' }}>
              {product.features.map((feature) => (
                <div key={feature} style={{ display: 'flex', gap: '0.45rem', fontSize: '0.9rem', color: theme.textMuted }}>
                  <CheckCircle2 style={{ width: '0.95rem', height: '0.95rem', color: product.accent, marginTop: '0.15rem', flexShrink: 0 }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        {sharedFooter}
      </div>
    );
  }

  if (isAlgo) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f6ff', color: theme.text, overflowX: 'hidden' }}>
        <section
          style={{
            position: 'relative',
            padding: '1.1rem 1.25rem 2.3rem',
            borderBottom: `1px solid ${theme.border}`,
            background: 'linear-gradient(135deg, #e9eeff 0%, #f4f6ff 45%, #f8faff 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.25,
              pointerEvents: 'none',
              backgroundImage:
                `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
              backgroundSize: '56px 56px',
            }}
          />
          <div style={{ position: 'relative', maxWidth: '1280px', margin: '0 auto' }}>
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src={product.logo} alt={product.logoAlt} style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>HedgeOne Algo-trader</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.3rem', color: theme.textMuted, fontSize: '0.85rem' }}>
                <span>Strategies</span>
                <span>Brokers</span>
                <span>Portfolio</span>
                <button
                  type="button"
                  onClick={onBack}
                  style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Back
                </button>
              </div>
            </header>

            <div style={{ textAlign: 'center', maxWidth: '760px', margin: '1.2rem auto 0' }}>
              <p
                style={{
                  display: 'inline-block',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  border: `1px solid ${theme.border}`,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.textMuted,
                  background: 'rgba(255,255,255,0.75)',
                }}
              >
                Live execution, clear visibility
              </p>
              <h1 style={{ marginTop: '1rem', fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 700, lineHeight: 1.12 }}>
                Trade smarter with a strategy-first execution console
              </h1>
              <p style={{ marginTop: '0.85rem', color: theme.textMuted, fontSize: '1.03rem', lineHeight: 1.6 }}>
                Deploy, track, and manage your strategy lifecycle from one workspace.
              </p>

              <div style={{ marginTop: '1.35rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleLogin}
                  style={{ background: product.heroGradient, color: '#fff', border: 'none', borderRadius: '0.55rem', padding: '0.72rem 1.15rem', fontWeight: 600 }}
                >
                  <LogIn style={{ width: '1rem', height: '1rem', marginRight: '0.45rem' }} />
                  {product.loginLabel}
                </Button>
                <Button
                  variant="ghost"
                  style={{ background: 'rgba(255,255,255,0.85)', border: `1px solid ${theme.border}`, borderRadius: '0.55rem' }}
                >
                  View strategy catalog
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '1.8rem', position: 'relative' }}>
              <div
                style={{
                  maxWidth: '920px',
                  margin: '0 auto',
                  borderRadius: '0.95rem',
                  overflow: 'hidden',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 18px 48px rgba(79, 70, 229, 0.16)',
                  background: '#ffffff',
                }}
              >
                <img src={product.heroImage} alt="Algo-trader dashboard" style={{ width: '100%', display: 'block', opacity: 0.9 }} />
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: '1180px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
            {product.quickPoints.map((line) => (
              <div key={line} style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '0.8rem', padding: '0.9rem 1rem', color: theme.textMuted, fontSize: '0.9rem' }}>
                {line}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '0.95rem', padding: '1rem' }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '0.8rem' }}>What you can run on Algo-trader</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.75rem' }}>
              {product.features.map((feature) => (
                <div key={feature} style={{ display: 'flex', gap: '0.45rem', fontSize: '0.9rem', color: theme.textMuted }}>
                  <CheckCircle2 style={{ width: '0.95rem', height: '0.95rem', color: product.accent, marginTop: '0.15rem', flexShrink: 0 }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        {sharedFooter}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1rem 1.25rem 3rem' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src={product.logo}
              alt={product.logoAlt}
              style={{ width: '2rem', height: '2rem', objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{product.name}</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              padding: 0,
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <ArrowLeft style={{ width: '0.95rem', height: '0.95rem' }} />
            Back
          </button>
        </header>

        <section
          style={{
            borderRadius: '1.25rem',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
            background: isLejer
              ? 'linear-gradient(160deg, #e5f1ff 0%, #f6f7ff 45%, #fbf7ff 100%)'
              : 'linear-gradient(160deg, #eef1ff 0%, #f7f7ff 50%, #f8fbff 100%)',
            boxShadow: theme.cardShadow,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '1.5rem',
              padding: 'clamp(1.25rem, 3vw, 2.25rem)',
              alignItems: 'center',
            }}
          >
            <div>
              <p
                style={{
                  marginBottom: '0.65rem',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: product.accent,
                }}
              >
                {product.heroEyebrow}
              </p>
              <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '0.7rem' }}>
                {product.name}
              </h1>
              <p style={{ fontSize: '1.05rem', color: theme.textMuted, marginBottom: '1rem' }}>{product.tagline}</p>
              <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: '1.35rem' }}>{product.longDescription}</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleLogin}
                  style={{
                    background: product.heroGradient,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.55rem',
                    padding: '0.75rem 1.1rem',
                    fontWeight: 600,
                  }}
                >
                  <LogIn style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  {product.loginLabel}
                </Button>
                <Button
                  onClick={onBack}
                  variant="ghost"
                  style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '0.55rem' }}
                >
                  Explore products
                  <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} />
                </Button>
              </div>
            </div>

            <div
              style={{
                borderRadius: '1rem',
                overflow: 'hidden',
                border: `1px solid ${theme.border}`,
                background: '#ffffff',
              }}
            >
              <img
                src={product.heroImage}
                alt={`${product.name} dashboard`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isLejer ? 0.9 : 0.86 }}
              />
            </div>
          </div>
        </section>

        <section style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '0.85rem',
            }}
          >
            {product.quickPoints.map((line) => (
              <div
                key={line}
                style={{
                  borderRadius: '0.85rem',
                  padding: '0.9rem 1rem',
                  border: `1px solid ${theme.border}`,
                  background: '#fff',
                  boxShadow: theme.cardShadow,
                  fontSize: '0.92rem',
                  color: theme.textMuted,
                }}
              >
                {line}
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: '1rem',
              border: `1px solid ${theme.border}`,
              background: '#fff',
              padding: '1rem',
              boxShadow: theme.cardShadow,
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.85rem' }}>Key capabilities</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '0.75rem',
              }}
            >
              {product.features.map((feature) => (
                <div
                  key={feature}
                  style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start', fontSize: '0.9rem', color: theme.textMuted }}
                >
                  <CheckCircle2 style={{ width: '0.95rem', height: '0.95rem', color: product.accent, marginTop: '0.15rem', flexShrink: 0 }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        {sharedFooter}
      </div>
    </div>
  );
}
