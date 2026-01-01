import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export default async function handler(req, res) {
  // 1. VERIFICATION (GET)
  if (req.method === 'GET') {
    if (
      req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN
    ) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.status(403).end();
  }

  // 2. MESSAGE HANDLING (POST)
  if (req.method === 'POST') {
    const body = req.body;

    // Check if it's a message
    if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const textBody = message.text ? message.text.body.toLowerCase() : "";
      const messageId = message.id;

      console.log(`--- NEW VERSION V2 LOADED: Msg from ${from}: ${textBody} ---`);

      // Mark as read immediately
      await markAsRead(messageId);

      // --- LOGIC START ---
      const websiteKeywords = ['رابط', 'موقع', 'متجر', 'طلب', 'link', 'website', 'shop'];
      const locationKeywords = ['وين', 'موقع', 'فرع', 'مكان', 'خريطة', 'لوكيشن', 'location', 'map'];
      const wholesaleKeywords = ['جمله', 'جملة', 'كميات', 'wholesale', 'bulk', 'توريد']; 
      const greetingKeywords = ['هلا', 'مرحبا', 'السلام', 'hi', 'hello', 'start', 'test', 'hey'];

      try {
        if (websiteKeywords.some(key => textBody.includes(key))) {
          await sendButton(from, "يمكنكم الطلب عبر المتجر الإلكتروني الخاص بنا 👇", "Visit Store", "https://askr-aj.com/");
        } 
        else if (locationKeywords.some(key => textBody.includes(key))) {
          await sendButton(from, "تفضل بزيارة فرعنا بخميس مشيط 👇", "Open Map", "https://maps.app.goo.gl/oq5zWCHJ1U74nP9Z9?g_st=awb");
        } 
        else if (wholesaleKeywords.some(key => textBody.includes(key))) {
          await sendMessage(from, "سوف يتم الرد عليك قريبا بخصوص الجملة ⏳");
        }
        else if (greetingKeywords.some(key => textBody.includes(key))) {
          await sendMessage(from, "رقائق عسكر الجنوب ترحب بكم 🤝\n\nكيف يمكننا مساعدتك؟\n\n📌 *اكتب 'رابط' للطلب*\n📍 *اكتب 'موقع' للفرع*\n📦 *اكتب 'جملة' للكميات*");
        }
        else {
          await sendMessage(from, "عذراً، لم أفهم طلبك.\nالرجاء كتابة *رابط*، *موقع*، أو *جملة*.");
        }
      } catch (err) {
        console.error("Logic Error:", err.message);
      }
      // --- LOGIC END ---
    }
    
    // 🟢 MOVED HERE: Send "OK" only AFTER the work is done
    return res.status(200).send('EVENT_RECEIVED');
  }
}

// -----------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------

async function sendMessage(to, text) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      data: { messaging_product: 'whatsapp', to: to, text: { body: text } },
    });
    console.log(`✅ Text sent to ${to}`);
  } catch (err) {
    console.error("❌ Send Text Error:", err.response ? err.response.data : err.message);
  }
}

async function sendButton(to, bodyText, buttonText, url) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: bodyText },
          action: {
            name: "cta_url",
            parameters: { display_text: buttonText, url: url }
          }
        }
      }
    });
    console.log(`✅ Button sent to ${to}`);
  } catch (err) {
    console.error("❌ Send Button Error:", err.response ? err.response.data : err.message);
  }
}

async function markAsRead(messageId) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: { messaging_product: 'whatsapp', status: "read", message_id: messageId },
  }).catch(() => {});
}