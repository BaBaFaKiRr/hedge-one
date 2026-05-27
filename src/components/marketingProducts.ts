// @ts-ignore - Vite handles image imports
import hedgeOneLogo from './app_logo.png';
// @ts-ignore - Vite handles image imports
import lejerLogo from './Leger 2D logo bg-removed.png';
// @ts-ignore - Vite handles image imports
import algoTraderDash from './Algotrader_Dash.png';
// @ts-ignore - Vite handles image imports
import lejerDash from './LEJER_Dashboard.png';
import { marketingTheme as theme } from './marketingTheme';

export type ProductId = 'algo-trader' | 'lejer';

export interface ProductHighlight {
  title: string;
  description: string;
}

export interface MarketingProduct {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  logo: string;
  logoAlt: string;
  accent: string;
  heroGradient: string;
  heroImage: string;
  heroEyebrow: string;
  features: string[];
  quickPoints: string[];
  highlights: ProductHighlight[];
  loginType: 'console' | 'external';
  loginUrl?: string;
  loginLabel: string;
}

export const marketingProducts: MarketingProduct[] = [
  {
    id: 'algo-trader',
    name: 'HedgeOne Algo-trader',
    tagline: 'Algorithmic trading, curated and hosted',
    description:
      'Deploy curated strategies, connect brokers, and monitor live execution in one clean console.',
    longDescription:
      'Built for fast execution with practical controls, clear visibility, and daily trading operations in one place.',
    logo: hedgeOneLogo,
    logoAlt: 'HedgeOne Algo-trader',
    accent: theme.primary,
    heroGradient: theme.gradient,
    heroImage: algoTraderDash,
    heroEyebrow: 'Quant workflow, simplified',
    features: [
      'Strategy curation & hosting',
      'Broker integrations',
      'Live execution monitoring',
      'Risk-aware deployment',
      'Portfolio & positions overview',
      'Tradebook and execution history',
    ],
    quickPoints: [
      'Deploy strategies in minutes.',
      'Track trades and positions live.',
      'Manage brokers from one workspace.',
    ],
    highlights: [
      {
        title: 'Unified trading console',
        description: 'Manage strategies, keys, and live execution from one dashboard designed for active traders.',
      },
      {
        title: 'Broker-ready integrations',
        description: 'Connect supported brokers and route orders through a consistent, monitored pipeline.',
      },
      {
        title: 'Hosted algorithm infrastructure',
        description: 'Run curated algos on managed infrastructure so you focus on strategy selection—not servers.',
      },
      {
        title: 'Operational visibility',
        description: 'Track positions, portfolio exposure, and trade history with clear, actionable views.',
      },
    ],
    loginType: 'console',
    loginLabel: 'Log in to Console',
  },
  {
    id: 'lejer',
    name: 'LEJER Business Manager',
    tagline: 'AI-powered operations for modern teams',
    description:
      'Run ERP, inventory, and CRM together with AI-assisted workflows built for operational teams.',
    longDescription:
      'Designed for fast-moving companies that need one source of truth across finance, stock, and customer operations.',
    logo: lejerLogo,
    logoAlt: 'LEJER',
    accent: '#7c3aed',
    heroGradient: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 45%, #2563eb 100%)',
    heroImage: lejerDash,
    heroEyebrow: 'ERP for modern operations',
    features: [
      'ERP workflows',
      'Inventory management',
      'CRM & customer pipeline',
      'AI-assisted insights',
      'Role-based access & teams',
      'Reports and operational dashboards',
    ],
    quickPoints: [
      'Track receivables, payables, and approvals.',
      'Control inventory with live updates.',
      'Get AI help directly inside operations.',
    ],
    highlights: [
      {
        title: 'All-in-one operations hub',
        description: 'Finance, inventory, and customer data live in one platform instead of disconnected tools.',
      },
      {
        title: 'Inventory you can trust',
        description: 'Track stock levels, movements, and alerts so purchasing and fulfillment stay aligned.',
      },
      {
        title: 'CRM built into the flow',
        description: 'Manage leads, accounts, and follow-ups alongside orders and fulfillment—not in a silo.',
      },
      {
        title: 'AI-assisted decisions',
        description: 'Surface patterns and recommendations to help teams act faster on day-to-day operations.',
      },
    ],
    loginType: 'external',
    loginUrl: 'https://lejer.hedgeone.co.in',
    loginLabel: 'Log in to LEJER',
  },
];

export function getMarketingProduct(id: ProductId): MarketingProduct {
  const product = marketingProducts.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}
