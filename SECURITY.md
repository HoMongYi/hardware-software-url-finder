# Security boundary

HSUF does not connect to company databases or ERP. Public providers receive only normalized vendor/model/category and bounded public candidate titles/snippets. input_id, metadata and raw private records are not sent. Private overlay output can be sensitive; the organisation owns access and storage policy.

Fetched content is untrusted evidence. No page instructions, code, cookies or scripts are executed. Judge selects an existing candidate ID, never a new final URL. Core independently fetches the selected official page and checks model/revision, support signals, lifecycle, redirect domains and page type.

## Network limits

- HTTP/HTTPS only, credentials in URLs rejected; default ports only.
- Reject loopback, RFC1918, link-local, metadata, CGNAT, reserved/multicast, mapped-private IPv6 and private/reserved IPv6.
- Resolve every hostname; reject an answer set containing any non-public address. Pin one validated IP to the connection to avoid DNS rebinding.
- Revalidate every redirect, reject HTTPS downgrade and credential forwarding to other origins. Provider POSTs do not follow redirects.
- 12-second total deadline including DNS, 1 MiB decoded body, up to 4 redirects, sequential batch execution, no retries. Compressed responses are rejected; request Accept-Encoding identity.
- No CAPTCHA/anti-bot bypass, login, marketplace crawling or binary downloads.

Audit without page evidence returns review. DNS/socket/network access is never required by offline resolution.

URL tokens are not a substitute for fetched page content. Core requires a supported text/HTML MIME type, no attachment disposition, model visible in title/body, and software/download evidence in actual text. Punctuation-distinct model identities remain distinct for exact lookup and batch caching. Default shared-engine research concurrency is one with a bounded queue; an overloaded queue returns review rather than issuing unbounded provider calls. Unverified alias hints are not exposed to providers.

HTML evidence is parsed as a DOM without JavaScript execution. Script/style/template/noscript/iframe, hidden, aria-hidden and inline display:none/visibility:hidden/opacity:0 subtrees are excluded, including links. This is a static parser, not a browser renderer: external CSS, script-generated compatibility tables and computed visibility are not verified. Sites requiring those evidence paths need browser/manual verification and must not be promoted on a guessed model match.

## HTTP/MCP

HTTP binds to loopback by default and rejects browser Origin headers and unexpected Host names. Non-loopback requires HSUF_HTTP_TOKEN and Bearer auth. JSON body limit is 1 MiB, at most 1000 batch items and two concurrent requests; busy requests return 429. Production TLS, proxy, rate limits, secret storage and process isolation belong to the deploying organisation. HTTP is not a hosted multi-tenant service.

Offline MCP tools have readOnlyHint. Optional research is read-only toward websites but makes external requests and may incur provider cost; it is separately named and opt-in. stdio buffer is limited to 1 MiB.

Command Judge is an operator-configured executable, not an OS sandbox. It runs without shell expansion or webpage-derived command/args, has timeout/stdout/stderr bounds, and receives only safe OS environment variables. Do not load an untrusted local Pipeline config.

## Data and release

Real credentials, raw .env contents, cookies, private keys, internal endpoints, catalogue IDs, customer and employee data do not belong in Public Registry/tests/releases. `.env.example` lists variable names only. Private overlays and caches are ignored and omitted by explicit release allowlists. Public package construction rejects symlinks.

Source archive/legacy CSV remains outside this public tree. UNKNOWN regional-equivalence and catalogue mappings are withheld. General error patterns are expressed as generic rules with an explicit field allowlist; company identifiers/evidence logs are discarded. Independently verified public exact records store public manufacturer source URL, source date and content hash in the refresh report. No raw manufacturer HTML is stored in releases.

The local secret/private leak scan uses patterns and allowlists. It is not a guarantee that every possible secret or sensitive free-text item has been found. Review source data provenance and final file lists before publishing. The project uses MIT; no GitHub push, release publish or npm publish is automated.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting under the repository Security tab if the maintainer has enabled it. Otherwise open a minimal [GitHub Issue](https://github.com/HoMongYi/hardware-software-url-finder/issues) asking for a private reporting channel. Include the affected version and a high-level description; do not post credentials, private records, production URLs or exploit details publicly. Share a synthetic reproduction through the agreed channel. No email address is assumed.
