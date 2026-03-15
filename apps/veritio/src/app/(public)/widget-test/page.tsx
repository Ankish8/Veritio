/**
 * Widget Test Landing Page
 * Simple page to test the panel widget
 */

'use client'

import Script from 'next/script'

export default function WidgetTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-gray-900">Veritio</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Build Better Products with
            <span className="text-indigo-600"> User Research</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Collect insights from real users with card sorting, tree testing, and surveys.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700">
              Start Free Trial
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-gray-200 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['User Research', 'Panel Management', 'Analytics'].map((title, i) => (
              <div key={i} className="p-6 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600">Lorem ipsum dolor sit amet consectetur.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-gray-900 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8">Join thousands of product teams.</p>
          <button className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl">
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          Widget Test Page - Your widget should appear based on trigger settings
        </div>
      </footer>

      {/* Veritio Panel Widget - Embed Code */}
      <Script id="veritio-widget" strategy="afterInteractive">
        {`
          (function(w,d,s,o,f,js,fjs){
            w['VeritioWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
            js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
            js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
          }(window,document,'script','veritio','http://localhost:4000/widget/fOCppttwxu4j/loader.js'));
          veritio('init');
        `}
      </Script>
    </div>
  )
}
