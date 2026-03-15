/** Copy parent document stylesheets + CSS custom properties into a PIP window */
export function copyStylesToPipWindow(pipWin: Window) {
  // Copy <link rel="stylesheet"> elements (Tailwind CSS bundle, fonts)
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    pipWin.document.head.appendChild(link.cloneNode(true))
  })
  // Copy <style> elements (Tailwind v4 generated styles, branding provider)
  document.querySelectorAll('style').forEach(style => {
    pipWin.document.head.appendChild(style.cloneNode(true))
  })
  // Copy computed CSS custom properties from :root (catches dynamically-set vars)
  const computed = getComputedStyle(document.documentElement)
  const vars: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule && rule.selectorText?.includes(':root')) {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i]
            if (prop.startsWith('--')) {
              vars.push(`${prop}: ${computed.getPropertyValue(prop)};`)
            }
          }
        }
      }
    } catch { /* cross-origin stylesheets */ }
  }
  // Also copy inline custom properties from documentElement (BrandingProvider, etc.)
  const inlineStyle = document.documentElement.style
  for (let i = 0; i < inlineStyle.length; i++) {
    const prop = inlineStyle[i]
    if (prop.startsWith('--')) {
      vars.push(`${prop}: ${inlineStyle.getPropertyValue(prop)};`)
    }
  }
  if (vars.length > 0) {
    const varStyle = pipWin.document.createElement('style')
    varStyle.textContent = `:root { ${vars.join(' ')} }`
    pipWin.document.head.appendChild(varStyle)
  }
}
