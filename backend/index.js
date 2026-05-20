import dns from 'node:dns/promises';

// Forces Node to use public DNS servers that support SRV records
dns.setServers(['1.1.1.1', '8.8.8.8']);


import express from "express";
import cors from "cors";
import axios from 'axios';
import session from "express-session";
import crypto from "crypto";

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest();
}

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

const SF_LOGIN_URL = 'https://login.salesforce.com';

app.get('/auth/login', (req, res) => {
  console.log('➡️ Starting Salesforce Login flow...');
  const verifier = base64URLEncode(crypto.randomBytes(32));
  req.session.codeVerifier = verifier;
  const challenge = base64URLEncode(sha256(verifier));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SF_CLIENT_ID,
    scope: 'api',
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  
  // Explicitly save the session before redirecting to ensure the codeVerifier is stored
  req.session.save((err) => {
    if (err) console.error('Session save error:', err);
    res.redirect(`${SF_LOGIN_URL}/services/oauth2/authorize?${params}`);
  });
});
app.get('/oauth/callback', async (req, res) => {
  console.log('⬅️ Received callback! Full URL:', req.originalUrl);
  console.log('⬅️ Query params:', req.query);

  if (req.query.error) {
    console.error(`❌ Salesforce returned an error: ${req.query.error} - ${req.query.error_description}`);
    return res.status(400).send(`Salesforce Error: ${req.query.error_description}`);
  }

  if (!req.query.code) {
    console.error('❌ No code parameter found in the URL!');
    return res.status(400).send('No authorization code provided by Salesforce.');
  }

  try {
    const { data } = await axios.post(`${SF_LOGIN_URL}/services/oauth2/token`, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: 'http://localhost:5000/oauth/callback', // Hardcoded to prevent env issues
        code: req.query.code,
        code_verifier: req.session.codeVerifier
      }
    });
    req.session.sf = {
      accessToken: data.access_token,
      instanceUrl: data.instance_url,
      userInfo: data.id
    };
    
    req.session.save(() => {
      console.log('✅ OAuth Success! Session saved.');
      res.redirect('http://localhost:5173/dashboard'); // Redirect back to Vite frontend
    });
  } catch (err) {
    console.error('❌ OAuth Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'OAuth failed', detail: err.response?.data || err.message });
  }
});

app.get('/api/me', (req, res) => {
  res.json({ loggedIn: !!req.session.sf });
});

app.get('/api/validation-rules', async (req, res) => {
  const { accessToken, instanceUrl } = req.session.sf || {};
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // 1. Query basic fields (cannot query Metadata field on multiple rows)
    const query = `SELECT Id, ValidationName, Active, Description
                   FROM ValidationRule
                   WHERE EntityDefinition.QualifiedApiName = 'Account'`;
    const { data } = await axios.get(
      `${instanceUrl}/services/data/v59.0/tooling/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    // 2. Fetch full metadata individually for each rule
    const recordsWithMetadata = await Promise.all(data.records.map(async (rule) => {
      const ruleData = await axios.get(
        `${instanceUrl}/services/data/v59.0/tooling/sobjects/ValidationRule/${rule.Id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return {
        ...rule,
        Metadata: ruleData.data.Metadata
      };
    }));

    res.json(recordsWithMetadata);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// 5. Deploy changes — receives array of modified rules
app.post('/api/deploy', async (req, res) => {
  const { accessToken, instanceUrl } = req.session.sf || {};
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { rules } = req.body; 
  const results = [];

  for (const rule of rules) {
    try {
      await axios.patch(
        `${instanceUrl}/services/data/v59.0/tooling/sobjects/ValidationRule/${rule.Id}`,
        {
          Metadata: {
            ...rule.Metadata,      
            active: rule.Active   
          }
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
      results.push({ id: rule.Id, success: true });
    } catch (err) {
      results.push({ id: rule.Id, success: false, error: err.response?.data || err.message });
    }
  }
  res.json({ results });
});

// 6. Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
app.listen(process.env.PORT, () => {
    console.log("Server running on port " + (process.env.PORT));
});

