import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileChartColumn,
  LineChart,
  MousePointer2,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Unplug,
} from 'lucide-react';

import { ROIWiseLogo } from '@/components/brand/roi-wise-logo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'ROI Wise — Revenue Intelligence para Jornadas Conversacionais',
  description:
    'A ROI Wise conecta dados de conversas, CRM, bots e atendimento para atribuir receita, identificar perdas e comprovar ROI.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://roiwise.com.br',
  },
  openGraph: {
    title: 'ROI Wise — Revenue Intelligence para Jornadas Conversacionais',
    description:
      'A ROI Wise conecta dados de conversas, CRM, bots e atendimento para atribuir receita, identificar perdas e comprovar ROI.',
    url: 'https://roiwise.com.br',
    siteName: 'ROI Wise',
    type: 'website',
  },
};

const navItems = [
  { label: 'Problema', href: '#problema' },
  { label: 'Benefícios', href: '#beneficios' },
  { label: 'Integrações', href: '#integracoes' },
  { label: 'ROI', href: '#roi' },
];

const stats = [
  { value: '7.8×', label: 'ROI médio comprovado' },
  { value: 'R$ 482K', label: 'Receita recuperada / mês' },
  { value: '1.248', label: 'Leads recuperáveis / mês' },
  { value: '18.7K', label: 'Conversas analisadas' },
];

const problems = [
  {
    title: 'Conversas sem rastreamento',
    desc: 'WhatsApp, bots e atendimento humano geram receita que nunca aparece no CRM.',
  },
  {
    title: 'Atribuição imprecisa',
    desc: 'Você não sabe qual canal ou conversa gerou ou perdeu cada oportunidade.',
  },
  {
    title: 'Decisões sem evidência',
    desc: 'Sem visibilidade real, executivos tomam decisões baseadas em estimativas.',
  },
];

const benefits = [
  {
    icon: Search,
    title: 'Identifique receita perdida',
    desc: 'Veja exatamente onde e quanto está sendo perdido em cada canal.',
  },
  {
    icon: Target,
    title: 'Recupere leads abandonados',
    desc: 'Priorize oportunidades com maior potencial de recuperação.',
  },
  {
    icon: Network,
    title: 'Atribua conversas ao ROI',
    desc: 'Conecte cada conversa a um resultado financeiro real.',
  },
  {
    icon: CircleDollarSign,
    title: 'Meça ROI real',
    desc: 'Comprove o retorno de cada canal, campanha e ação.',
  },
  {
    icon: Radar,
    title: 'Priorize oportunidades',
    desc: 'Saiba onde agir primeiro para maximizar receita.',
  },
  {
    icon: FileChartColumn,
    title: 'Relatórios executivos',
    desc: 'Dashboards e PDFs prontos para apresentar ao C-suite.',
  },
];

const integrations = [
  'WhatsApp',
  'HubSpot',
  'Salesforce',
  'RD Station',
  'Botmaker',
  'Meta Ads',
  'Google Analytics',
  'Webhooks',
];

const signalRows = [
  {
    label: 'Conversas sem resposta',
    value: 'R$ 126K',
    tone: 'loss',
  },
  {
    label: 'Leads com intenção alta',
    value: '342',
    tone: 'opportunity',
  },
  {
    label: 'Receita atribuída',
    value: 'R$ 482K',
    tone: 'growth',
  },
];

export default function HomePage() {
  return (
    <main className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <LandingHeader />
      <LandingHero />
      <LandingStats />
      <ProblemSection />
      <BenefitsSection />
      <IntegrationsSection />
      <LandingCTA />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="border-border bg-background/88 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="ROI Wise home" className="shrink-0">
          <ROIWiseLogo markSize={34} showTagline />
        </Link>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Principal"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="border-border bg-card text-foreground hover:border-primary/50 hover:bg-card-2 inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-28 pb-14 sm:px-6 sm:pt-32 lg:px-8">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-65"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-16 -z-10 h-[520px] bg-[radial-gradient(ellipse_70%_55%_at_50%_20%,rgba(11,191,173,0.11),transparent_72%)]"
      />

      <div className="mx-auto max-w-5xl text-center">
        <div className="border-primary/20 bg-primary/10 text-primary inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
          Revenue Intelligence Platform · roiwise.com.br
        </div>

        <h1 className="text-foreground mx-auto mt-7 max-w-4xl text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
          Descubra onde sua receita está{' '}
          <span className="text-primary">escapando</span> — e recupere
          oportunidades com inteligência.
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-base leading-7 text-pretty sm:text-lg">
          A ROI Wise conecta dados de conversas, CRM, bots e atendimento para
          atribuir receita, identificar perdas e comprovar ROI em jornadas
          conversacionais.
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <a
            href="#cta"
            className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold transition-colors"
          >
            Ver potencial de recuperação
            <ArrowRight className="size-4" />
          </a>
          <a
            href="#beneficios"
            className="border-border bg-card text-foreground hover:border-primary/45 hover:bg-card-2 inline-flex h-12 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors"
          >
            Conhecer a plataforma
          </a>
        </div>

        <RevenuePreview />
      </div>
    </section>
  );
}

function RevenuePreview() {
  return (
    <div
      className="border-border bg-card/90 mx-auto mt-14 w-full max-w-5xl overflow-hidden rounded-xl border text-left shadow-[0_24px_80px_-48px_rgba(11,191,173,0.75)]"
      aria-label="Prévia visual do painel ROI Wise"
    >
      <div className="border-border bg-card-2/55 flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-primary font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
            Revenue Recovery Console
          </div>
          <div className="text-foreground mt-1 text-sm font-semibold">
            Visão executiva de receita conversacional
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="bg-chart-2 inline-flex size-2 rounded-full" />
          Dados conectados
          <span className="border-border bg-background text-primary ml-2 rounded-full border px-2 py-1 font-mono text-[10px]">
            LIVE
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-border p-4 sm:p-6 lg:border-r">
          <div className="grid gap-3 sm:grid-cols-3">
            <PreviewMetric
              label="ROI atribuído"
              value="7.8×"
              icon={TrendingUp}
              tone="growth"
            />
            <PreviewMetric
              label="Receita perdida"
              value="R$ 91K"
              icon={Unplug}
              tone="loss"
            />
            <PreviewMetric
              label="Oportunidades"
              value="1.248"
              icon={MousePointer2}
              tone="opportunity"
            />
          </div>

          <div className="border-border bg-background/55 mt-5 rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-foreground text-sm font-semibold">
                  Recuperação por canal
                </div>
                <div className="text-muted-foreground text-xs">
                  Receita mapeada por origem e conversa
                </div>
              </div>
              <LineChart className="text-primary size-5" />
            </div>
            <div className="flex h-40 items-end gap-2">
              {[42, 58, 46, 72, 64, 84, 76, 92, 88, 100, 94, 112].map(
                (height, index) => (
                  <div
                    key={index}
                    className="bg-primary/15 flex flex-1 items-end rounded-t"
                    style={{ height: `${height}px` }}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t',
                        index > 8 ? 'bg-chart-2' : 'bg-primary'
                      )}
                      style={{ height: `${Math.max(18, height - 18)}px` }}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="text-primary size-4" />
            Sinais priorizados
          </div>
          {signalRows.map((row) => (
            <div
              key={row.label}
              className="border-border bg-background/45 flex items-center justify-between gap-3 rounded-lg border px-3 py-3"
            >
              <div className="min-w-0">
                <div className="text-foreground truncate text-sm font-medium">
                  {row.label}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Ação recomendada
                </div>
              </div>
              <div
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  row.tone === 'loss' && 'text-chart-5',
                  row.tone === 'opportunity' && 'text-chart-4',
                  row.tone === 'growth' && 'text-chart-2'
                )}
              >
                {row.value}
              </div>
            </div>
          ))}
          <div className="border-primary/20 bg-primary/10 rounded-lg border p-4">
            <div className="text-foreground text-sm font-semibold">
              Próxima melhor ação
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Priorizar 342 leads com intenção alta antes de campanhas de
              aquisição.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingStats() {
  return (
    <section
      id="roi"
      className="border-border bg-card border-y px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((metric) => (
            <div
              key={metric.label}
              className="border-border bg-background/45 rounded-lg border p-5 text-center"
            >
              <div className="text-primary font-mono text-2xl font-bold tracking-tight tabular-nums">
                {metric.value}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4 text-center text-xs">
          Métricas apresentadas como exemplos visuais de potencial de análise e
          recuperação.
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section
      id="problema"
      className="bg-card scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8"
    >
      <SectionIntro
        eyebrow="O Problema"
        title="Sua receita está escapando. Você não está vendo onde."
      />
      <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
        {problems.map((problem) => (
          <article
            key={problem.title}
            className="border-border bg-card-2 rounded-lg border p-6"
          >
            <div className="bg-chart-5 mb-5 size-2 rounded-full" />
            <h3 className="text-foreground text-base font-semibold">
              {problem.title}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {problem.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section
      id="beneficios"
      className="bg-background scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8"
    >
      <SectionIntro
        eyebrow="Principais Benefícios"
        title="Clareza total sobre cada real da sua jornada comercial."
      />
      <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="border-border bg-card hover:border-primary/35 rounded-lg border p-6 transition-colors"
          >
            <benefit.icon className="text-primary mb-5 size-5" />
            <h3 className="text-foreground text-base font-semibold">
              {benefit.title}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {benefit.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationsSection() {
  return (
    <section
      id="integracoes"
      className="border-border bg-card scroll-mt-20 border-y px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl text-center">
        <div className="border-primary/20 bg-primary/10 mx-auto mb-5 flex size-11 items-center justify-center rounded-lg border">
          <Bot className="text-primary size-5" />
        </div>
        <SectionIntro
          eyebrow="Integrações"
          title="Conecta com tudo que você já usa."
        />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {integrations.map((integration) => (
            <span
              key={integration}
              className="border-border bg-card-2 text-muted-foreground rounded-lg border px-4 py-2 text-sm font-medium"
            >
              {integration}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTA() {
  return (
    <section
      id="cta"
      className="bg-card-2 scroll-mt-20 px-4 py-20 text-center sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="border-primary/20 bg-primary/10 mx-auto mb-5 flex size-12 items-center justify-center rounded-lg border">
          <BarChart3 className="text-primary size-6" />
        </div>
        <h2 className="text-foreground text-3xl font-bold tracking-normal text-balance sm:text-4xl">
          Comece a recuperar receita hoje.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7">
          Descubra o potencial de recuperação de receita da sua empresa em uma
          sessão gratuita.
        </p>
        <a
          href="#roi"
          className="bg-primary text-primary-foreground hover:bg-primary-hover mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg px-7 text-sm font-bold transition-colors"
        >
          Ver meu potencial de recuperação
          <ArrowRight className="size-4" />
        </a>
        <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-sm">
          <CheckCircle2 className="text-chart-2 size-4" />
          Sessão de diagnóstico com foco em impacto financeiro.
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-primary font-mono text-xs font-semibold tracking-[0.18em] uppercase">
        {eyebrow}
      </div>
      <h2 className="text-foreground mt-3 text-3xl leading-tight font-bold text-balance sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone: 'growth' | 'loss' | 'opportunity';
}) {
  return (
    <div className="border-border bg-background/55 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">{label}</span>
        <Icon
          className={cn(
            'size-4',
            tone === 'growth' && 'text-chart-2',
            tone === 'loss' && 'text-chart-5',
            tone === 'opportunity' && 'text-chart-4'
          )}
        />
      </div>
      <div
        className={cn(
          'mt-3 font-mono text-xl font-bold tabular-nums',
          tone === 'growth' && 'text-chart-2',
          tone === 'loss' && 'text-chart-5',
          tone === 'opportunity' && 'text-chart-4'
        )}
      >
        {value}
      </div>
    </div>
  );
}
