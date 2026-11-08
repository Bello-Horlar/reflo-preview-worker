export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("biz") || url.searchParams.get("business") || "").trim();

    const APP_URL = "https://reflohdc.netlify.app";
    const SUPABASE_URL = "https://jqsdiyrvdzwmqazdotci.supabase.co";
    
    // Supabase API Key
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc2RpeXJ2ZHp3bXFhemRvdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjk0MDAsImV4cCI6MjEwNDkwNTQwMH0._syYsiWtVfe6vZ678Oent7r1di_1VUpqjYBn8mMqR6o";

    let bizName = "Customer Hub | REFLO";
    let logoUrl = `${APP_URL}/assets/images/default-business-logo.png`;
    let displayLocation = "";
    let customDesc = "";

    // 1. Fetch Dynamic Business Metadata from Database
    if (slug) {
      try {
        // 🟢 Uses select=* so missing column names NEVER cause a 400 error
        const apiUrl = `${SUPABASE_URL}/rest/v1/businesses?slug=ilike.${encodeURIComponent(slug)}&select=*`;
        
        const apiRes = await fetch(apiUrl, {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Accept": "application/json"
          }
        });

        if (apiRes.ok) {
          const rows = await apiRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const biz = rows[0];
            
            // 🟢 Real Business Name (Glow Haven Studio)
            if (biz.name) bizName = biz.name;
            
            // Auto-detect location across any existing columns
            const locParts = [biz.address, biz.city, biz.state, biz.location].filter(Boolean);
            if (locParts.length > 0) {
              displayLocation = locParts.join(", ");
            }

            if (biz.description && biz.description.trim()) {
              customDesc = biz.description.trim();
            }

            // 🟢 Resolve Uploaded Logo (The Gold Badge)
            if (biz.logo_url) {
              if (biz.logo_url.startsWith("http")) {
                logoUrl = biz.logo_url;
              } else {
                const cleanLogo = biz.logo_url.replace(/^logos\//, "");
                logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${cleanLogo}`;
              }
            }
          }
        }
      } catch (_) {}
    }

    // 2. Format Action Text & Location
    const locationPrefix = displayLocation ? `📍 ${displayLocation} • ` : "";
    const actionText = `⭐ 1. Leave Feedback  •  📅 2. Book an Appointment`;
    
    const socialDescription = customDesc 
      ? `${locationPrefix}${actionText} — ${customDesc}`
      : `${locationPrefix}${actionText} online with us.`;

    const targetRedirect = `${APP_URL}/?biz=${encodeURIComponent(slug)}`;

    // 3. Detect Social Media Bots vs Real Humans
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    const isSocialCrawler = 
      userAgent.includes("telegrambot") ||
      userAgent.includes("whatsapp") ||
      userAgent.includes("facebookexternalhit") ||
      userAgent.includes("twitterbot") ||
      userAgent.includes("linkedinbot");

    // 4. Generate Clean Open Graph HTML
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

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60"
      }
    });
  }
};
