export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("biz") || url.searchParams.get("business") || "").trim();

    const APP_URL = "https://reflohdc.netlify.app";
    const SUPABASE_URL = "https://jqsdiyrvdzwmqazdotci.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc2RpeXJ2ZHp3bXFhemRvdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjk0MDAsImV4cCI6MjEwNDkwNTQwMH0._syYsiWtVfe6vZ678Oent7r1di_1VUpqjYBn8mMqR6o";

    let bizName = "Customer Hub | REFLO";
    let bizDesc = "Leave feedback or schedule an appointment online with us.";
    let logoUrl = `${APP_URL}/assets/images/default-business-logo.png`;
    let displayLocation = "";

    // 1. Fetch Dynamic Business Metadata directly from Supabase REST API
    if (slug) {
      try {
        const apiRes = await fetch(
          `${SUPABASE_URL}/rest/v1/businesses?slug=ilike.${encodeURIComponent(slug)}&select=name,description,logo_url,address,city,state`,
          {
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`
            }
          }
        );
        const rows = await apiRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const biz = rows[0];
          if (biz.name) bizName = biz.name;
          const locParts = [biz.address, biz.city, biz.state].filter(Boolean);
          if (locParts.length > 0) displayLocation = locParts.join(", ");
          if (biz.description && biz.description.trim()) bizDesc = biz.description.trim();
          if (biz.logo_url) {
            logoUrl = biz.logo_url.startsWith("http")
              ? biz.logo_url
              : `${SUPABASE_URL}/storage/v1/object/public/logos/${biz.logo_url}`;
          }
        }
      } catch (_) {}
    }

    const socialDescription = displayLocation 
      ? `📍 ${displayLocation} • ${bizDesc}`
      : bizDesc;

    const targetRedirect = `${APP_URL}/?biz=${encodeURIComponent(slug)}`;

    // 2. Detect Social Media Bots vs Real Humans
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    const isSocialCrawler = 
      userAgent.includes("telegrambot") ||
      userAgent.includes("whatsapp") ||
      userAgent.includes("facebookexternalhit") ||
      userAgent.includes("twitterbot") ||
      userAgent.includes("linkedinbot");

    // 3. Generate Clean Open Graph HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bizName}</title>
    <meta name="description" content="${socialDescription}">
    <link rel="canonical" href="${targetRedirect}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="REFLO Customer Hub">
    <meta property="og:title" content="${bizName}">
    <meta property="og:description" content="${socialDescription}">
    <meta property="og:image" content="${logoUrl}">
    <meta property="og:image:secure_url" content="${logoUrl}">
    <meta property="og:url" content="${targetRedirect}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${bizName}">
    <meta name="twitter:description" content="${socialDescription}">
    <meta name="twitter:image" content="${logoUrl}">

    ${
      !isSocialCrawler
        ? `<script>window.location.replace("${targetRedirect}");</script>
           <meta http-equiv="refresh" content="0;url=${targetRedirect}">`
        : ""
    }
</head>
<body style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #ffffff;">
    <h2>${bizName}</h2>
    <p>${socialDescription}</p>
    <p style="margin-top: 20px;"><a href="${targetRedirect}" style="color: #38bdf8;">Click here to continue to Customer Hub</a></p>
</body>
</html>`;

    // 🟢 Cloudflare serves real text/html — never rewritten to text/plain!
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60"
      }
    });
  }
};
