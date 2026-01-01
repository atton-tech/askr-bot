import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 🟢 SETTINGS
const SUPPORT_PHONE_NUMBER = '966500000000'; // Change to Client's Personal Number

export default async function handler(req, res) {
  // 1. VERIFICATION (GET)
  if (req.method === 'GET') {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
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
      // Handle button clicks or text
      let textBody = "";
      if (message.type === 'interactive' && message.interactive.button_reply) {
        textBody = message.interactive.button_reply.id;
      } else {
        textBody = message.text ? message.text.body.toLowerCase() : "";
      }

      console.log(`NEW LOG: Processing message from ${from}: ${textBody}`);

      // Mark as Read
      await markAsRead(message.id);

      // --- KEYWORDS ---
      const websiteKeywords = ['رابط', 'موقع', 'متجر', 'طلب', 'link', 'website', 'shop'];
      const locationKeywords = ['وين', 'موقع', 'فرع', 'مكان', 'خريطة', 'لوكيشن', 'location', 'map'];
      const wholesaleKeywords = ['جمله', 'جملة', 'كميات', 'wholesale', 'bulk', 'توريد'];
      const supportKeywords = ['دعم', 'مساعدة', 'تحدث', 'موظف', 'خدمة', 'support', 'help', 'human'];

      try {
        if (websiteKeywords.some(key => textBody.includes(key))) {
           await sendButton(from, "يمكنكم الطلب عبر المتجر الإلكتروني 👇", "Visit Store", "https://askr-aj.com/");
        } 
        else if (locationKeywords.some(key => textBody.includes(key))) {
           await sendButton(from, "تفضل بزيارة فرعنا بخميس مشيط 👇", "Open Map", "https://maps.app.goo.gl/oq5zWCHJ1U74nP9Z9?g_st=awb");
        } 
        else if (wholesaleKeywords.some(key => textBody.includes(key))) {
           await sendMessage(from, "سوف يتم الرد عليك قريبا بخصوص الجملة ⏳");
        }
        else if (supportKeywords.some(key => textBody.includes(key)) || textBody === 'support_request') {
           // 🟢 SUPPORT LOGIC
           const supportMsg = `📞 *خدمة العملاء*\n\nتواصل معنا مباشرة عبر الرقم:\n*${SUPPORT_PHONE_NUMBER}*\n\nأو اضغط الرابط:\nhttps://wa.me/${SUPPORT_PHONE_NUMBER}`;
           await sendMessage(from, supportMsg);
        }
        else {
           // 🟢 MENU
           await sendMenu(from);
        }
      } catch (err) {
        console.error("Logic Error:", err.message);
      }
    }

    // ✅ THE FIX: RETURN 200 AT THE VERY END
    return res.status(200).send('EVENT_RECEIVED');
  }
}

// --- HELPERS ---

async function sendMessage(to, text) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: { messaging_product: 'whatsapp', to: to, text: { body: text } },
  }).catch(err => console.error("Send Error:", err.message));
}

async function sendButton(to, body, btnText, url) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: {
      messaging_product: "whatsapp", to: to, type: "interactive",
      interactive: {
        type: "cta_url", body: { text: body },
        action: { name: "cta_url", parameters: { display_text: btnText, url: url } }
      }
    }
  }).catch(err => console.error("Btn Error:", err.message));
}

async function sendMenu(to) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: {
      messaging_product: "whatsapp", recipient_type: "individual", to: to, type: "interactive",
      interactive: {
        type: "button",
        body: { text: "مرحباً بك 🤝\nكيف يمكننا مساعدتك؟" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "link", title: "المتجر 🛒" } },
            { type: "reply", reply: { id: "support_request", title: "تحدث مع موظف 🙋‍♂️" } }
          ]
        }
      }
    }
  }).catch(err => console.error("Menu Error:", err.message));
}

async function markAsRead(id) {
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    data: { messaging_product: 'whatsapp', status: "read", message_id: id },
  }).catch(() => {});
}