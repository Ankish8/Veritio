const SECURITY_TEXT = `Contact: mailto:security@veritio.io
Contact: https://github.com/Ankish8/Veritio/security/advisories/new
Canonical: https://veritio.io/.well-known/security.txt
Policy: https://veritio.io/security
Preferred-Languages: en
Expires: 2027-09-13T00:00:00.000Z
`

export function GET() {
  return new Response(SECURITY_TEXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
