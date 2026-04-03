import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex flex-col">
      {/* NAV */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-base font-bold text-slate-900 tracking-tight">
            <span className="text-blue-600">●</span> AgenticRev
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* HERO */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 mb-8">
            🤖 AI Visibility Platform
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
            You&apos;re invisible<br className="hidden sm:block" />
            to AI assistants
          </h1>
          <p className="text-xl sm:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed">
            AgenticRev helps Realtors and Small Businesses monitor and optimize how they appear
            across ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews, and Copilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
            >
              Start for free →
            </Link>
            <Link
              href="/signup?plan=pro"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-300 text-slate-700 text-base font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              See pricing plans
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">No credit card required · 14-day free trial</p>
        </section>

        {/* PROBLEM STATEMENT */}
        <section className="bg-slate-50 border-y border-slate-200 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
              Here&apos;s why AI visibility matters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: '🔍',
                  title: 'AI search is replacing Google',
                  desc: 'ChatGPT, Perplexity, and Claude are becoming the primary way people discover businesses and properties.',
                },
                {
                  icon: '⚠️',
                  title: "You're missing visibility",
                  desc: "Most businesses don't appear in AI responses. Even when they do, the information is often incomplete or inaccurate.",
                },
                {
                  icon: '📈',
                  title: 'Your competitors are ahead',
                  desc: 'Businesses tracking their AI visibility gain a measurable advantage in the emerging AI-powered economy.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white p-8 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 PILLARS */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Four pillars of AI visibility
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Complete monitoring and optimization across all AI platforms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: '🧠',
                title: 'AI Visibility Scanner',
                desc: 'Monitor mentions across ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews, and Copilot. Track sentiment, position, and competitive context.',
              },
              {
                icon: '📊',
                title: 'SEMrush SEO Intelligence',
                desc: 'Authority scores, AI Overview keywords, organic traffic data, and rank tracking. Understand your traditional SEO foundation for AI search.',
              },
              {
                icon: '🔗',
                title: 'Perplexity Sonar Citations',
                desc: "Deep citation tracking with domain analysis. See exactly where and how you're cited in Perplexity responses.",
              },
              {
                icon: '🌐',
                title: 'Brand Visibility Index (Otterly)',
                desc: '6-platform coverage, Brand Visibility Index (BVI) quadrant analysis, and Normalized Sonar Score (NSS) tracking.',
              },
            ].map((pillar) => (
              <div key={pillar.title} className="bg-white p-8 border border-slate-200 rounded-xl hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{pillar.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{pillar.title}</h3>
                <p className="text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-8 md:p-12">
            <div className="flex gap-4">
              <div className="text-3xl flex-shrink-0">🔧</div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">GEO/AEO Audit</h3>
                <p className="text-slate-700 mb-4">
                  Crawlability, content quality, structured data, and schema markup scores with personalized recommendations
                  to improve your AI search ranking.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-slate-900 text-white rounded-xl p-8 md:p-12 flex gap-4">
            <div className="text-3xl flex-shrink-0">🤖</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Concierge (Enterprise)</h3>
              <p className="text-slate-300">
                Dedicated AI agent with full access to your business data, historical metrics, and competitor insights.
                Ask questions, get recommendations, and drive strategy with real-time intelligence.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 border-y border-slate-200 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-16">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  n: '1',
                  title: 'Connect',
                  desc: 'Sign up in seconds. Add your business profile, verify ownership, and authorize data access.',
                },
                {
                  n: '2',
                  title: 'Scan',
                  desc: 'We query 6 AI platforms for mentions using your branded keywords. Real-time data collection starts.',
                },
                {
                  n: '3',
                  title: 'Optimize',
                  desc: 'Get audits, citation reports, and GEO/AEO recommendations. Track progress with visibility dashboards.',
                },
              ].map((step) => (
                <div key={step.n} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mb-6 shadow-lg">
                    {step.n}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Plans for every business size
            </h2>
            <p className="text-lg text-slate-600">Start free. Scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                name: 'Free',
                price: '$0',
                desc: 'Everything you need to get started',
                features: [
                  'Up to 1 business',
                  'Monthly AI scans',
                  'Visibility dashboard',
                  'Basic reports',
                  'Email support',
                ],
                cta: 'Get started',
                featured: false,
              },
              {
                name: 'Pro',
                price: '$149',
                desc: 'For serious local businesses',
                features: [
                  'Unlimited businesses',
                  'Weekly AI scans',
                  'SEMrush integration',
                  'Citation tracking',
                  'Priority support',
                  'GEO/AEO audit reports',
                ],
                cta: 'Start Pro trial',
                featured: true,
              },
              {
                name: 'Business',
                price: '$399',
                desc: 'Multi-location teams',
                features: [
                  'Everything in Pro',
                  'Real-time scans',
                  'Team access (3 seats)',
                  'Custom reports',
                  'Competitor tracking',
                  'API access',
                ],
                cta: 'Start Business trial',
                featured: false,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                desc: 'For large organizations',
                features: [
                  'Everything in Business',
                  'Unlimited team seats',
                  'AI Concierge agent',
                  'Custom integrations',
                  'Dedicated support',
                  'SLA guarantee',
                ],
                cta: 'Contact sales',
                featured: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border-2 p-8 ${
                  plan.featured
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/10 shadow-xl'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } transition-all`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-600 mb-6">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-slate-600">/month</span>}
                </div>
                <button
                  className={`w-full py-2.5 rounded-lg font-semibold mb-8 transition-colors ${
                    plan.featured
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-300 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS PLACEHOLDER */}
        <section className="bg-slate-50 border-y border-slate-200 py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Trusted by forward-thinking businesses
            </h2>
            <p className="text-lg text-slate-600 mb-16">
              (Testimonials and logos coming soon)
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Ready to be found by AI?
          </h2>
          <p className="text-lg text-slate-600 mb-12">
            Join Realtors and Small Businesses gaining visibility in AI search engines.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
          >
            Start your free trial →
          </Link>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Features</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Pricing</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">About</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Blog</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Documentation</Link></li>
                <li><Link href="#" className="hover:text-slate-900">API</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Privacy</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Terms</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <span>© {new Date().getFullYear()} AgenticRev. All rights reserved.</span>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-slate-900">Twitter</Link>
              <Link href="#" className="hover:text-slate-900">LinkedIn</Link>
              <Link href="#" className="hover:text-slate-900">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
