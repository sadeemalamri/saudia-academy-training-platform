document.addEventListener("DOMContentLoaded", () => {
const WEBHOOK_URL =
  "https://hala7.app.n8n.cloud/webhook/b0d1af9f-cd4f-4c6e-9db0-a6c205c3d6e9/chat";

const SESSION_KEY = "saudia-academy-chat-session";

let sessionId = sessionStorage.getItem(SESSION_KEY);

if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, sessionId);
}
  const chatToggle = document.getElementById("chatToggle");
  const chatWindow = document.getElementById("chatWindow");
  const chatClose = document.getElementById("chatClose");
  const chatMinimize = document.getElementById("chatMinimize");
  const chatTeaser = document.getElementById("chatTeaser");
  const chatBody = document.getElementById("chatBody");
  const chatInput = document.getElementById("chatInput");
  const chatSend = document.getElementById("chatSend");
  const quickReplies = document.getElementById("quickReplies");
  const initialTime = document.getElementById("initialTime");

  // ===============================
  // Time helper — shows the real current time like "10:30 AM"
  // ===============================
  function getTimeNow() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  if (initialTime) {
    initialTime.textContent = getTimeNow();
  }

  // ===============================
  // Open / close / minimize the chat window
  // ===============================

  function openChat() {
    chatWindow.classList.add("open");
    if (chatTeaser) chatTeaser.style.display = "none";
    chatInput.focus();
  }

  function closeChat() {
    chatWindow.classList.remove("open");
  }

  chatToggle.addEventListener("click", () => {
    if (chatWindow.classList.contains("open")) {
      closeChat();
    } else {
      openChat();
    }
  });

  chatClose.addEventListener("click", closeChat);
  chatMinimize.addEventListener("click", closeChat);

  // ===============================
  // Message helpers
  // ===============================

  function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `chat-message ${sender}`;

    message.innerHTML = `
      <div class="chat-avatar-small">
        <i class="fa-solid ${sender === "user" ? "fa-user" : "fa-robot"}"></i>
      </div>
      <div class="chat-bubble-msg">
        <p>${text}</p>
        <span class="chat-time">${getTimeNow()}</span>
      </div>
    `;

    chatBody.appendChild(message);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "chat-message bot chat-typing";
    typing.id = "typingIndicator";

    typing.innerHTML = `
      <div class="chat-avatar-small"><i class="fa-solid fa-robot"></i></div>
      <div class="chat-bubble-msg">
        <span></span><span></span><span></span>
      </div>
    `;

    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById("typingIndicator");
    if (typing) typing.remove();
  }

  /* ============================================================
     DEMO ONLY — canned answers so the chat feels alive while
     testing. No real AI model is connected yet.

     HOW TO ADD YOUR OWN ANSWERS:
     Add a new object to the `knowledgeBase` array below. `keywords`
     is a list of words/phrases — if the user's message contains ANY
     one of them (in any order, any wording), that answer is used.
     The list is checked top to bottom, so put more specific topics
     above more general ones.

     Example — adding a new topic:

       {
         keywords: ["scholarship", "funding", "financial aid"],
         answer: "Saudia Academy does not currently offer scholarships, but the training program itself is fully funded."
       },

     >>> WHEN YOU HAVE A REAL AI BACKEND <<<
     Replace getBotReply() with an API call to your assistant instead
     of this keyword lookup, e.g.:

       async function getBotReply(question) {
         const res = await fetch("/api/chat", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ message: question })
         });
         const data = await res.json();
         return data.reply;
       }
  ============================================================ */
  const knowledgeBase = [
    {
      keywords: ["training program", "what is the training", "summer training"],
      answer: "Our Summer Training Program gives university students hands-on experience in the aviation industry over 2 or 6 months at Saudia Academy in Jeddah.",
    },
    {
      keywords: ["who can apply", "eligib", "requirements", "can i apply"],
      answer: "University students from 3rd year up to graduates in relevant majors can apply. Check the Apply Now page for full eligibility details.",
    },
    {
      keywords: ["major", "majors", "specialization", "field of study"],
      answer: "We accept students from a range of majors related to aviation, engineering, business, and technology — the application form lets you specify your own.",
    },
    {
      keywords: ["when does", "application open", "deadline", "open date"],
      answer: "Applications typically open each semester. Click Apply Now on the homepage to check if the form is currently open.",
    },
    {
      keywords: ["where", "location", "jeddah", "address"],
      answer: "Saudia Academy is located in Jeddah, Saudi Arabia.",
    },
    {
      keywords: ["contact", "email", "phone", "reach"],
      answer: "You can reach us at academy@saudia.com or +012 686 4163.",
    },
    {
      keywords: ["duration", "how long", "months"],
      answer: "The training program runs for either 2 months or 6 months, depending on the track you choose.",
    },
    {
      keywords: ["certificate", "certification"],
      answer: "Yes — trainees who successfully complete the program receive a certificate of completion.",
    },
  ];

  const greetingPattern = /\b(hi+|hello|hey+|hiya|yo|salam|assalamualaikum|good morning|good evening|good afternoon)\b/;
  const farewellPattern = /\b(bye+|goodbye|good bye|thanks|thank you|thx|shukran|see you|take care|that'?s all|no more questions)\b/;

  function getBotReply(question) {
    const text = question.trim().toLowerCase();

    if (farewellPattern.test(text)) {
      return {
        type: "farewell",
        text: "You're very welcome! Glad I could help. Have a great day 👋",
      };
    }

    if (greetingPattern.test(text)) {
      return {
        type: "greeting",
        text: "Hi there! 👋 How can I help you today?",
      };
    }

    for (const entry of knowledgeBase) {
      const isMatch = entry.keywords.some((keyword) => text.includes(keyword));
      if (isMatch) {
        return { type: "answer", text: entry.answer };
      }
    }

    return {
      type: "fallback",
      text: "Hmm, I'm not totally sure about that one — here are some things I can help with:",
    };
  }

async function sendMessage(text) {
  const message = text.trim();

  if (!message) return;

  addMessage(message, "user");
  showTyping();

  chatSend.disabled = true;
  chatInput.disabled = true;

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        action: "sendMessage",
        sessionId: sessionId,
        chatInput: message
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    const botReply =
      data.output ||
      data.text ||
      data.message ||
      data?.data?.output ||
      (Array.isArray(data) ? data[0]?.output : null) ||
      "Sorry, I couldn't understand the response.";

    removeTyping();
    addMessage(botReply, "bot");

  } catch (error) {
    console.error("Chatbot error:", error);

    removeTyping();

    addMessage(
      "Sorry, I couldn't connect to the assistant. Please try again.",
      "bot"
    );

  } finally {
    chatSend.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

  const quickReplyQuestions = [
    "What is the training program?",
    "Who can apply?",
    "What are the available majors?",
    "When does the application open?",
  ];

  function createQuickReplies() {
    const wrapper = document.createElement("div");
    wrapper.className = "quick-replies";

    quickReplyQuestions.forEach((questionText) => {
      const btn = document.createElement("button");
      btn.className = "quick-reply-btn";
      btn.textContent = questionText;

      btn.addEventListener("click", () => {
        wrapper.querySelectorAll(".quick-reply-btn, .quick-reply-end").forEach((b) => (b.disabled = true));
        sendMessage(questionText);
      });

      wrapper.appendChild(btn);
    });

    // Extra option to end the conversation gracefully
    const endBtn = document.createElement("button");
    endBtn.className = "quick-reply-btn quick-reply-end";
    endBtn.textContent = "No, that's all — thanks!";

    endBtn.addEventListener("click", () => {
      wrapper.querySelectorAll(".quick-reply-btn, .quick-reply-end").forEach((b) => (b.disabled = true));
      addMessage("Glad I could help! Have a great day 👋", "bot");

      setTimeout(() => {
        closeChat();
      }, 1600);
    });

    wrapper.appendChild(endBtn);

    return wrapper;
  }

  function appendFollowUp() {
    addMessage("Do you have any other questions? Feel free to type one, or pick from these:", "bot");
    chatBody.appendChild(createQuickReplies());
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // ===============================
  // Quick reply buttons
  // ===============================

  quickReplies.querySelectorAll(".quick-reply-btn:not(.quick-reply-end)").forEach((btn) => {
    btn.addEventListener("click", () => {
      sendMessage(btn.textContent);

      // Disable the suggestions after first use so the chat feels like
      // a real conversation instead of a repeatable menu
      quickReplies.querySelectorAll(".quick-reply-btn, .quick-reply-end").forEach((b) => {
        b.disabled = true;
      });
    });
  });

  const initialEndBtn = document.getElementById("initialEndBtn");
  if (initialEndBtn) {
    initialEndBtn.addEventListener("click", () => {
      quickReplies.querySelectorAll(".quick-reply-btn, .quick-reply-end").forEach((b) => {
        b.disabled = true;
      });

      addMessage("Glad I could help! Have a great day 👋", "bot");

      setTimeout(() => {
        closeChat();
      }, 1600);
    });
  }

  // ===============================
  // Text input
  // ===============================

  chatSend.addEventListener("click", () => {
    sendMessage(chatInput.value);
    chatInput.value = "";
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage(chatInput.value);
      chatInput.value = "";
    }
  });

});