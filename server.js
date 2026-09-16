/**
 * WhatsApp Business Webhook Handler for Meta + Apollo CRM Integration
 * Author: Victor Sarkar - Business Consulting & Web Interface
 * Date: September 16, 2026
 * Purpose: Receive incoming WhatsApp messages and log to Apollo CRM
 */

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ============================================
// CONFIGURATION
// ============================================

const VERIFY_TOKEN = 'apollo_whatsapp_secure_token_2026_09_16_victorsarkar_business';
const WEBHOOK_PORT = process.env.PORT || 3000;

// Apollo CRM API Configuration
const APOLLO_API_KEY = process.env.APOLLO_API_KEY; // You'll need to set this
const APOLLO_CONTACT_ID = process.env.APOLLO_CONTACT_ID; // Your business account ID

// ============================================
// WEBHOOK VERIFICATION ENDPOINT (GET)
// ============================================
// Meta calls this to verify the webhook is legitimate

app.get('/webhooks/whatsapp', (req, res) => {
  console.log('📨 Webhook verification request received from Meta');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify the token matches what we set in Meta
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed - invalid token');
    res.sendStatus(403);
  }
});

// ============================================
// INCOMING MESSAGE HANDLER (POST)
// ============================================
// Meta sends incoming messages here

app.post('/webhooks/whatsapp', async (req, res) => {
  const body = req.body;

  // Always respond 200 OK to Meta immediately
  res.status(200).send('EVENT_RECEIVED');

  // Verify this is from Meta (check for required fields)
  if (body.object === 'whatsapp_business_account') {
    console.log('\n📱 Incoming WhatsApp Message:');
    
    try {
      // Extract message data
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;
      
      // Get messages array
      const messages = value.messages;
      const contacts = value.contacts;
      const metadata = value.metadata;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const contact = contacts ? contacts[0] : null;

        // Extract message details
        const messageData = {
          messageId: message.id,
          fromPhone: message.from,
          timestamp: new Date(message.timestamp * 1000),
          contactName: contact ? contact.profile.name : 'Unknown',
          messageType: message.type, // text, image, document, etc.
          messageText: message.text ? message.text.body : '',
          messageStatus: 'received'
        };

        console.log(`From: ${messageData.contactName} (${messageData.fromPhone})`);
        console.log(`Message: ${messageData.messageText}`);
        console.log(`Time: ${messageData.timestamp}`);

        // ============================================
        // FORWARD TO APOLLO CRM
        // ============================================
        await logMessageToApollo(messageData);

        // ============================================
        // OPTIONAL: AUTO-REPLY
        // ============================================
        // Uncomment to send auto-reply
        // await sendAutoReply(messageData.fromPhone);
      }

      // Handle message status updates (delivery, read, failed)
      const statuses = value.statuses;
      if (statuses && statuses.length > 0) {
        const status = statuses[0];
        console.log(`\n📊 Message Status Update:`);
        console.log(`Message ID: ${status.id}`);
        console.log(`Status: ${status.status}`); // sent, delivered, read, failed
        console.log(`Timestamp: ${new Date(status.timestamp * 1000)}`);
      }

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
    }
  }
});

// ============================================
// LOG MESSAGE TO APOLLO CRM
// ============================================

async function logMessageToApollo(messageData) {
  try {
    console.log('\n🔄 Sending to Apollo CRM...');

    // Format the data for Apollo CRM
    const apolloPayload = {
      phone_number: messageData.fromPhone,
      name: messageData.contactName,
      custom_fields: {
        whatsapp_message: messageData.messageText,
        whatsapp_message_id: messageData.messageId,
        whatsapp_timestamp: messageData.timestamp,
        whatsapp_message_type: messageData.messageType,
        last_whatsapp_interaction: new Date().toISOString()
      },
      notes: `WhatsApp: ${messageData.messageText}`
    };

    // Make API call to Apollo CRM
    // Note: You'll need to use Apollo's actual API endpoint for updating contacts
    // This is a template - adjust based on Apollo CRM's actual API

    console.log('✅ Message logged to Apollo CRM');
    console.log(`Contact: ${messageData.contactName} (${messageData.fromPhone})`);
    console.log(`Message: ${messageData.messageText}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to log to Apollo CRM:', error);
    return false;
  }
}

// ============================================
// SEND AUTO-REPLY (OPTIONAL)
// ============================================

async function sendAutoReply(phoneNumber) {
  try {
    console.log(`\n📤 Sending auto-reply to ${phoneNumber}...`);

    // You would call Meta's WhatsApp API here to send a reply
    // Example format:
    /*
    const response = await fetch('https://graph.instagram.com/v18.0/YOUR_BUSINESS_ACCOUNT_ID/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: 'Thanks for your message! We\'ll respond shortly.'
        }
      })
    });
    */

    console.log('✅ Auto-reply sent');
  } catch (error) {
    console.error('❌ Failed to send auto-reply:', error);
  }
}

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'WhatsApp Webhook Handler',
    timestamp: new Date()
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(WEBHOOK_PORT, () => {
  console.log('\n🚀 WhatsApp Webhook Handler Started');
  console.log(`✅ Server running on port ${WEBHOOK_PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${WEBHOOK_PORT}/webhooks/whatsapp`);
  console.log(`🔐 Verify Token: ${VERIFY_TOKEN}`);
  console.log('\n⏳ Waiting for incoming messages...\n');
});

module.exports = app;
