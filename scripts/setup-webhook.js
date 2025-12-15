/**
 * Webhook Setup Script
 * Run this script to set or delete the Telegram webhook
 * 
 * Usage:
 *   node scripts/setup-webhook.js set <your-vercel-url>
 *   node scripts/setup-webhook.js delete
 *   node scripts/setup-webhook.js info
 */

require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const action = process.argv[2];
const url = process.argv[3];

async function makeRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}?${queryString}`;
    
    https.get(fullUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function setWebhook(webhookUrl) {
  console.log(`🔗 Setting webhook to: ${webhookUrl}`);
  
  const params = {
    url: webhookUrl,
    allowed_updates: JSON.stringify(['message', 'callback_query', 'inline_query']),
    drop_pending_updates: 'true'
  };
  
  if (WEBHOOK_SECRET) {
    params.secret_token = WEBHOOK_SECRET;
  }
  
  const result = await makeRequest('setWebhook', params);
  
  if (result.ok) {
    console.log('✅ Webhook set successfully!');
    console.log('📋 Response:', result.description);
  } else {
    console.error('❌ Failed to set webhook:', result.description);
  }
}

async function deleteWebhook() {
  console.log('🗑️ Deleting webhook...');
  
  const result = await makeRequest('deleteWebhook', { drop_pending_updates: 'true' });
  
  if (result.ok) {
    console.log('✅ Webhook deleted successfully!');
  } else {
    console.error('❌ Failed to delete webhook:', result.description);
  }
}

async function getWebhookInfo() {
  console.log('📋 Getting webhook info...');
  
  const result = await makeRequest('getWebhookInfo');
  
  if (result.ok) {
    console.log('✅ Webhook Info:');
    console.log(JSON.stringify(result.result, null, 2));
  } else {
    console.error('❌ Failed to get webhook info:', result.description);
  }
}

async function main() {
  switch (action) {
    case 'set':
      if (!url) {
        console.error('❌ Please provide the webhook URL');
        console.log('Usage: node scripts/setup-webhook.js set https://your-app.vercel.app/api/telegram');
        process.exit(1);
      }
      await setWebhook(url);
      break;
      
    case 'delete':
      await deleteWebhook();
      break;
      
    case 'info':
      await getWebhookInfo();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node scripts/setup-webhook.js set <webhook-url>');
      console.log('  node scripts/setup-webhook.js delete');
      console.log('  node scripts/setup-webhook.js info');
      console.log('');
      console.log('📝 Example:');
      console.log('  node scripts/setup-webhook.js set https://your-app.vercel.app/api/telegram');
  }
}

main().catch(console.error);
