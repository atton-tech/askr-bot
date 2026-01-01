import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 🟢 CHANGE THIS TO THE REAL CUSTOMER SERVICE NUMBER (Format: CountryCode + Number)
// Do not use + sign. Example: 966512345678
const SUPPORT_PHONE_NUMBER = '966500000000'; 

export default async function handler(req, res) {
  // DEBUG LOGS
  console.log("--- INCOMING WEBHOOK ---");

  // 1. VERIFICATION (GET)
  if (req.method === 'GET') {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
      console.log("Verified!");
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.status(403).end();
  }

  // 2. MESSAGE HANDLING (POST)
  if (req.method === 'POST') {
    res.status(200).send('EVENT_RECEIVED'); // Fast Reply

    const body = req.body;
    
    // Check if valid message
    if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const messageId = message.id;
      
      // Handle Text
      let textBody = "";
      if (message.type === 'text') {
        textBody = message.text.body.toLowerCase();
      } else if (message.type === 'interactive' && message.interactive.button_reply) {
        // Handle Button Click (if user clicks "Talk to Support")
        textBody = message.interactive.button_reply.id; // We use ID to trigger logic
      }

      console.log(`Msg from ${from}: ${textBody}`);
      await markAsRead(messageId);

      // --- 🧠 LOGIC BRAIN ---

      // 1. Define Keywords
      const websiteKeywords = ['رابط', 'موقع', 'متجر', 'طلب', 'link', 'website', 'shop'];
      const locationKeywords = ['وين', 'موقع', 'فرع', 'مكان', 'خريطة', 'لوكيشن', 'location', 'map'];
      const wholesaleKeywords = ['جمله', 'جملة', 'كميات', 'wholesale', 'bulk', 'توريد'];
      
      // 🟢 NEW: Support Keywords
      const supportKeywords = ['دعم', 'مساعدة', 'تحدث', 'موظف', 'خدمة', 'عملاء', 'support', 'help', 'human', 'call', 'agent', 'support_request']; 

      try {
        // 2. Check Matches
        if (websiteKeywords.some(key => textBody.includes(key))) {
            await sendButton(from, "يمكنكم الطلب عبر المتجر الإلكتروني الخاص بنا 👇", "Visit Store", "https://askr-aj.com/");
        } 
        else if (locationKeywords.some(key => textBody.includes(key))) {
            await sendButton(from, "تفضل بزيارة فرعنا بخميس مشيط 👇", "Open Map", "https://maps.app.goo.gl/oq5zWCHJ1U74nP9Z9?g_st=awb");
        } 
        else if (wholesaleKeywords.some(key => textBody.includes(key))) {
            await sendMessage(from, "سوف يتم الرد عليك قريبا بخصوص الجملة ⏳");
        }
        // 🟢 NEW: Support Logic
        else if (supportKeywords.some(key => textBody.includes(key))) {
           // Respond with the Second Number (Clickable Link)
           const supportMsg = `📞 *خدمة العملاء*\n\nيمكنك التواصل مباشرة مع أحد موظفينا عبر الرقم التالي:\n\n📱 *${SUPPORT_PHONE_NUMBER}*\n\nأو اضغط الرابط للمحادثة المباشرة 👇:\nhttps://wa.me/${SUPPORT_PHONE_NUMBER}`;
            await sendMessage(from, supportMsg);
        }
        else {
           // Default / Welcome Message with Buttons
            await sendMenu(from);
        }

      } catch (err) {
        console.error("Logic Error:", err.message);
      }
    }
    return;
  }
}

// --- HELPER FUNCTIONS ---
async function sendMessage(to, text) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: { messaging_product: 'whatsapp', to: to, text: { body: text } },
  }).catch(err => console.error("Send Text Error:", err.message));
}

async function sendButton(to, bodyText, buttonText, url) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: {
      messaging_product: "whatsapp", to: to, type: "interactive",
      interactive: {
        type: "cta_url", body: { text: bodyText },
        action: { name: "cta_url", parameters: { display_text: buttonText, url: url } }
      }
    }
  }).catch(err => console.error("Send Button Error:", err.message));
}

async function sendMenu(to) {
  // Sends a menu with a "Call Support" button
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
        type: "button",
        body: { text: "مرحباً بك في عسكر الجنوب 🤝\nكيف يمكننا مساعدتك؟" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "link", title: "رابط المتجر 🛒" } },
            { type: "reply", reply: { id: "support_request", title: "تحدث مع موظف 🙋‍♂️" } }
          ]
        }
      }
    }
  }).catch(err => console.error("Send Menu Error:", err.message));
}

async function markAsRead(messageId) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: { messaging_product: 'whatsapp', status: "read", message_id: messageId },
  }).catch(() => {});
}