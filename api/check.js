export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let uids = [];

  if (req.method === 'POST') {
    uids = req.body.uids || [];
  } else {
    const singleUid = req.query.uid;
    if (singleUid) uids = [singleUid];
  }

  if (!Array.isArray(uids) || uids.length === 0) {
    return res.status(400).json({ error: 'No uids provided' });
  }

  const promises = uids.map(uid => checkSingle(uid));
  const results = await Promise.all(promises);

  return res.status(200).json({ results });
}

async function checkSingle(uidRaw) {
  const uid = String(uidRaw).trim();

  if (!uid.match(/^\d+$/)) {
    return { uid: uidRaw, status: 'error' };
  }

  try {
    const profileUrl = `https://mbasic.facebook.com/profile.php?id=${uid}`;

    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    if (res.status === 404) {
      return { uid, status: 'error' };
    }

    const text = await res.text();
    const lower = text.toLowerCase();

    if (
      lower.includes('account disabled') ||
      lower.includes('your account has been disabled') ||
      lower.includes('account has been disabled') ||
      lower.includes('this account has been disabled') ||
      lower.includes('account is disabled')
    ) {
      return { uid, status: 'error' };
    }

    if (
      lower.includes('confirm your identity') ||
      lower.includes('checkpoint') ||
      lower.includes('we need to verify') ||
      lower.includes('security check')
    ) {
      return { uid, status: 'error' };
    }

    if (
      lower.includes("this content isn't available") ||
      lower.includes('content unavailable') ||
      lower.includes('the link you followed may be broken') ||
      lower.includes('this page isn')
    ) {
      return { uid, status: 'error' };
    }

    return { uid, status: 'live' };

  } catch (e) {
    return { uid, status: 'error' };
  }
}
