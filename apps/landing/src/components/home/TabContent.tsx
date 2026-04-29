export default function TabContent({ id }: { id: string }) {
  switch (id) {
    case 'card-sort':
      return (
        <div className="showcase-mockup-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--black)' }}>Navigation Card Sort</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>6 cards &middot; 3 categories</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>Products</div>
              <div className="showcase-card-item highlighted">Pricing</div>
              <div className="showcase-card-item highlighted">API Docs</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>Support</div>
              <div className="showcase-card-item">Help Center</div>
              <div className="showcase-card-item">Contact Us</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>Resources</div>
              <div className="showcase-card-item">Blog</div>
              <div className="showcase-card-item">Templates</div>
            </div>
          </div>
          <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gray-500)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}></span>
            Similarity score: 89% &middot; 24 responses
          </div>
        </div>
      )
    case 'tree-test':
      return (
        <div className="showcase-mockup-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--black)' }}>Find the pricing page</div>
            <div style={{ fontSize: '12px', background: 'rgba(34,197,94,.1)', color: 'var(--green)', padding: '3px 10px', borderRadius: '20px', fontWeight: 500 }}>92% success</div>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>92%</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Success Rate</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--black)' }}>4.2s</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Avg. Time</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>1.3</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Directness</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="showcase-tree-row"><span style={{ color: 'var(--gray-400)' }}>Home</span> <span style={{ color: 'var(--gray-300)' }}>&rarr;</span> <span style={{ color: 'var(--gray-400)' }}>Products</span> <span style={{ color: 'var(--gray-300)' }}>&rarr;</span> <span style={{ color: 'var(--green)', fontWeight: 600 }}>Pricing</span><span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--green)' }}>Direct</span></div>
            <div className="showcase-tree-row"><span style={{ color: 'var(--gray-400)' }}>Home</span> <span style={{ color: 'var(--gray-300)' }}>&rarr;</span> <span style={{ color: 'var(--gray-400)' }}>About</span> <span style={{ color: 'var(--gray-300)' }}>&rarr;</span> <span style={{ color: 'var(--gray-400)' }}>Products</span> <span style={{ color: 'var(--gray-300)' }}>&rarr;</span> <span style={{ color: 'var(--green)', fontWeight: 600 }}>Pricing</span><span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--orange)' }}>Indirect</span></div>
          </div>
        </div>
      )
    case 'survey':
      return (
        <div className="showcase-mockup-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--black)' }}>Post-Task Survey</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>3 questions &middot; Branching</div>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--black)', marginBottom: '10px' }}>How easy was it to find the pricing page?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid var(--accent)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div></div>
                Very easy
              </div>
              <div style={{ background: 'white', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--gray-200)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--gray-300)' }}></div>
                Somewhat easy
              </div>
              <div style={{ background: 'white', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--gray-200)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--gray-300)' }}></div>
                Difficult
              </div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            Branching: &ldquo;Difficult&rdquo; &rarr; Follow-up questions
          </div>
        </div>
      )
    case 'prototype':
      return (
        <div className="showcase-mockup-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--black)' }}>Checkout Flow v3</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Figma Prototype</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 500 }}>34/40 completed</div>
          </div>
          <div style={{ height: '8px', background: 'var(--gray-100)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ width: '85%', height: '100%', background: 'var(--green)', borderRadius: '4px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, background: 'var(--gray-50)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)' }}>85%</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Task Success</div>
            </div>
            <div style={{ flex: 1, background: 'var(--gray-50)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--black)' }}>2m 15s</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Avg. Time</div>
            </div>
            <div style={{ flex: 1, background: 'var(--gray-50)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--orange)' }}>3</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Misclicks</div>
            </div>
          </div>
        </div>
      )
    case 'first-click':
      return (
        <div className="showcase-mockup-inner" style={{ padding: 0 }}>
          <div style={{ position: 'relative' }}>
            <div className="hm-page" style={{ borderRadius: '16px' }}>
              <div className="hm-page-nav">
                <div className="hm-page-logo"></div>
                <div className="hm-page-links">
                  <div className="hm-page-link"></div>
                  <div className="hm-page-link"></div>
                  <div className="hm-page-link"></div>
                </div>
              </div>
              <div className="hm-page-body">
                <div className="hm-page-h"></div>
                <div className="hm-page-p"></div>
                <div className="hm-page-p" style={{ width: '55%' }}></div>
                <div className="hm-page-btns">
                  <div className="hm-page-btn"></div>
                  <div className="hm-page-btn"></div>
                </div>
              </div>
            </div>
            <div className="heat-overlay">
              <div className="heat-dot hd1"></div>
              <div className="heat-dot hd2"></div>
              <div className="heat-dot hd3"></div>
              <div className="heat-dot hd4"></div>
              <div className="heat-dot hd5"></div>
            </div>
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>72% clicked correct area</span>
            <span style={{ color: 'var(--gray-400)' }}>Avg. time: 1.8s</span>
          </div>
        </div>
      )
    case 'live-website':
      return (
        <div className="showcase-mockup-inner" style={{ padding: 0 }}>
          <div style={{ position: 'relative' }}>
            <div className="hm-page" style={{ borderRadius: '16px' }}>
              <div className="hm-page-nav">
                <div className="hm-page-logo"></div>
                <div className="hm-page-links">
                  <div className="hm-page-link"></div>
                  <div className="hm-page-link"></div>
                  <div className="hm-page-link"></div>
                </div>
              </div>
              <div className="hm-page-body">
                <div className="hm-page-h"></div>
                <div className="hm-page-p"></div>
                <div className="hm-page-p" style={{ width: '55%' }}></div>
                <div className="hm-page-btns">
                  <div className="hm-page-btn"></div>
                  <div className="hm-page-btn"></div>
                </div>
              </div>
              <div style={{ padding: '16px 28px 28px' }}>
                <div className="hm-page-p" style={{ width: '92%' }}></div>
                <div className="hm-page-p" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div className="heat-overlay">
              <div className="heat-dot hd1"></div>
              <div className="heat-dot hd2"></div>
              <div className="heat-dot hd3"></div>
              <div className="heat-dot hd4"></div>
              <div className="heat-dot hd5"></div>
            </div>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--gray-100)', fontSize: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></div>
            <span style={{ color: 'var(--gray-500)' }}>Recording &middot; 2:34</span>
            <div style={{ flex: 1, height: '3px', background: 'var(--gray-100)', borderRadius: '2px', marginLeft: '8px' }}><div style={{ width: '65%', height: '100%', background: 'var(--accent)', borderRadius: '2px' }}></div></div>
          </div>
        </div>
      )
    default:
      return null
  }
}
