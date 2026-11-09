/* =====================================================================
   agent.js - the MOCK AI AGENT on the #agent page.

   There is no AI and no network call. When you send a message:
     1. your message is added to the chat
     2. a "typing" indicator shows for a moment
     3. we look for a keyword in your message and pick a canned reply
     4. optionally a "tool step" line appears (like "Searching docs...")
     5. the reply is "typed" out word by word
     6. the reply gets action buttons (copy, thumbs up/down) and sources

   Message markup (handy for tagging):
     <div class="msg msg-agent|msg-user" data-role="agent|user" data-message-id="m3">
        <div class="msg-avatar">...</div>
        <div class="msg-body">
           <div class="msg-text">...</div>
           <div class="msg-sources">...</div>      (agent only)
           <div class="msg-actions">...</div>      (agent only)
        </div>
     </div>

   WHERE TO HOOK IN AGENT TRACKING: look for onAgentEvent() below. It is
   called for every send, reply and feedback click. Right now it only logs
   to the console; add your own tracking call inside it.
   ===================================================================== */

(function () {

  // ---------- 1. THE CANNED REPLIES ----------
  // Checked top to bottom; the first "match" found in your message wins.
  // steps   = optional tool-step lines shown before the answer
  // sources = optional links shown under the answer
  var REPLIES = [
    { match: /\b(hello|hi|hey)\b/i,
      text: "Hi there! I'm the fAIke Assistant. I can answer questions about tagging, guides and this site.",
      steps: [], sources: [] },

    { match: /tag|feature|button|click/i,
      text: "To tag a feature, open the Pendo Designer, choose Tag Feature, then click the element on the page. Try the Page Elements section for practice, and watch out for dynamic ids and identical twins.",
      steps: ['Searching the knowledge base…'],
      sources: [{ label: 'Page Elements', href: '#tagging' }, { label: 'Data Table', href: '#guides-table' }] },

    { match: /guide|modal|tooltip|walkthrough/i,
      text: "Guides are in-app messages. You target them at a page or an element. The Guide Targeting section has pages for tooltips, scrolling targets, hidden elements and duplicated DOM.",
      steps: ['Searching the knowledge base…', 'Reading 3 articles…'],
      sources: [{ label: 'Tooltip Targets', href: '#guides-targets' }, { label: 'Scroll to Reveal', href: '#guides-reveal' }] },

    { match: /cart|checkout|order|shop/i,
      text: "There's a mock shop in Multi-step Processes. Add items to the cart, apply the promo code PURPLE10, and run through checkout. Nothing is charged.",
      steps: ['Looking up the checkout flow…'],
      sources: [{ label: 'Checkout', href: '#checkout-shop' }] },

    { match: /joke|funny/i,
      text: "Why did the guide cross the page? To get to the other tooltip.",
      steps: [], sources: [] },

    { match: /thank/i,
      text: "You're welcome! Anything else I can help with?",
      steps: [], sources: [] }
  ];

  // Used when nothing above matched.
  var FALLBACK = {
    text: "I'm just a mock agent, so I only know a few topics: tagging, guides, the shop, and jokes. Try asking about one of those.",
    steps: [], sources: []
  };

  var GREETING = "Hello! I'm the fAIke Assistant. Ask me something, or tap a suggestion below.";


  // ---------- 2. TRACKING HOOK ----------
  // Called with an event name and some details. Add your tracking here.
  function onAgentEvent(name, details) {
    console.log('[agent]', name, details);
    // e.g. window.pendo && pendo.track('Agent ' + name, details);
  }


  // ---------- 3. SMALL HELPERS ----------
  var log     = document.getElementById('chat-log');
  var input   = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var status  = document.getElementById('agent-status');
  var messageCount = 0;
  var busy = false;                       // true while the agent is "responding"

  function esc(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
  function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function scrollToBottom() { log.scrollTop = log.scrollHeight; }

  // Adds one message to the chat and returns its text element.
  function addMessage(role, text) {
    messageCount++;
    var msg = document.createElement('div');
    msg.className = 'msg msg-' + role;
    msg.setAttribute('data-role', role);
    msg.setAttribute('data-message-id', 'm' + messageCount);
    msg.innerHTML =
      '<div class="msg-avatar">' + (role === 'agent' ? '✨' : '🙂') + '</div>' +
      '<div class="msg-body"><div class="msg-text">' + esc(text) + '</div></div>';
    log.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function setBusy(isBusy) {
    busy = isBusy;
    sendBtn.disabled = isBusy;
    status.textContent = isBusy ? 'Typing…' : 'Online';
  }


  // ---------- 4. THE CONVERSATION ----------
  async function respondTo(userText) {
    setBusy(true);
    var reply = REPLIES.filter(function (r) { return r.match.test(userText); })[0] || FALLBACK;

    // Typing indicator (three dots), shown for a moment.
    var typing = document.createElement('div');
    typing.className = 'msg msg-agent msg-typing';
    typing.innerHTML = '<div class="msg-avatar">✨</div><div class="msg-body"><div class="msg-text"><span class="dots"><i></i><i></i><i></i></span></div></div>';
    log.appendChild(typing);
    scrollToBottom();
    await pause(700);

    // Tool-step lines (one at a time).
    var stepBox = null;
    for (var i = 0; i < reply.steps.length; i++) {
      if (!stepBox) {
        stepBox = document.createElement('div');
        stepBox.className = 'agent-steps';
        log.insertBefore(stepBox, typing);
      }
      stepBox.insertAdjacentHTML('beforeend', '<div class="agent-step">⚙️ ' + esc(reply.steps[i]) + '</div>');
      scrollToBottom();
      await pause(700);
    }

    // Swap the typing indicator for a real (empty) message, then type it out.
    typing.remove();
    var msg = addMessage('agent', '');
    var textEl = msg.querySelector('.msg-text');
    var words = reply.text.split(' ');
    for (var w = 0; w < words.length; w++) {
      textEl.textContent += (w ? ' ' : '') + words[w];
      scrollToBottom();
      await pause(35);
    }

    // Sources (links) and action buttons under the finished message.
    var body = msg.querySelector('.msg-body');
    if (reply.sources.length) {
      body.insertAdjacentHTML('beforeend',
        '<div class="msg-sources">Sources: ' + reply.sources.map(function (s) {
          return '<a href="' + s.href + '" class="source-link">' + esc(s.label) + '</a>';
        }).join(' · ') + '</div>');
    }
    body.insertAdjacentHTML('beforeend',
      '<div class="msg-actions">' +
        '<button class="msg-action action-copy"  aria-label="Copy">📋</button>' +
        '<button class="msg-action action-up"    aria-label="Good answer">👍</button>' +
        '<button class="msg-action action-down"  aria-label="Bad answer">👎</button>' +
      '</div>');

    onAgentEvent('reply', { messageId: msg.getAttribute('data-message-id'), text: reply.text });
    scrollToBottom();
    setBusy(false);
    input.focus();
  }

  // Send whatever is in the text box (or a suggestion's text).
  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    addMessage('user', text);
    onAgentEvent('send', { text: text });
    input.value = '';
    respondTo(text);
  }

  // Start (or restart) the chat with the greeting.
  function newChat() {
    log.innerHTML = '';
    messageCount = 0;
    addMessage('agent', GREETING);
    setBusy(false);
  }


  // ---------- 5. WIRE UP THE CLICKS ----------
  document.getElementById('chat-form').addEventListener('submit', function (event) {
    event.preventDefault();
    send(input.value);
  });

  // Enter sends; Shift+Enter makes a new line.
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });

  document.querySelectorAll('#chat-suggestions .chip').forEach(function (chip) {
    chip.addEventListener('click', function () { send(chip.textContent); });
  });

  document.getElementById('agent-new-chat').addEventListener('click', newChat);

  // Copy / thumbs buttons are added later, so listen on the whole log.
  log.addEventListener('click', function (event) {
    var btn = event.target.closest('.msg-action');
    if (!btn) return;
    var msg = btn.closest('.msg');
    var id = msg.getAttribute('data-message-id');

    if (btn.classList.contains('action-copy')) {
      var text = msg.querySelector('.msg-text').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      window.showToast('Copied');
      onAgentEvent('copy', { messageId: id });
    } else {
      // Thumbs up / down: only one can be "on" at a time.
      var up = btn.classList.contains('action-up');
      msg.querySelectorAll('.action-up, .action-down').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      onAgentEvent('feedback', { messageId: id, rating: up ? 'up' : 'down' });
    }
  });


  // ---------- GO! ----------
  newChat();

})();
