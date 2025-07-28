// For analyzing sentences and correcting spelling
const nlp = window.nlp;
const didYouMean = window.didYouMean;

const locationKeywords = [
  "go to", "navigate", "direction", "where is",
  "location of", "find", "how to get to", "proceed to",
  "where can I find", "geographical location of",
  "locate", "how to reach"
];

const locationDictionary = [
  "library", "cafeteria", "auditorium", "gym", "office", "parking",
  "classroom", "administration", "reception", "hall", "study room",
  "computer lab", "conference room", "staff room", "restroom", "break room", "entrance",
  "exit", "loading dock", "student lounge", "medical office", "security office", "maintenance room",
  "rooftop", "courtyard", "lecture hall", "sports field", "laboratory", "printing station",
  "storage room", "faculty office", "art studio", "music room", "theater", "swimming pool",
  "dance studio", "meeting room", "workshop", "multi-purpose room", "waiting area"
];
//array of object [question and response] 
const knowledgeBase = [
  { question: "What’s up", answer: "hi,What’s up! How can I help you today?" },
  { question: "hi", answer: "hi! How can I help you today?" },
  { question: "hello", answer: "Hello! How can I help you today?" },
  { question: "hi there", answer: "Hello! How can I help you today?" },
  { question: "hay", answer: "Hello! How can I help you today?" },
  { question: "good morning", answer: "Good morning. Which building are you looking for?" },
  { question: "good afternoon", answer: "Good afternoon. Which building are you looking for?" },
  { question: "good evening", answer: "Good evening. Which building are you looking for?" },
  { question: "how are you", answer: "I'm fine, thanks for asking. Which building are you looking for?" },
  { question: "who are you", answer: "I'm your smart assistant." },
  { question: "what is your name", answer: "My name is Route Bot." },
  { question: "thank you", answer: "You're welcome!" },
  { question: "bye", answer: "Goodbye! Have a great day!" }
];

// State variables

/* ========================================================================
   waitingCorrectionConfirmation variable 
   which is responsible for waiting 
   which 'false' means that :
   'Bot can continue as normal.'
   otherwise means
   'Wait! Before answering, ask the user to confirm the corrected sentence.'
 ========================================================================
*/let waitingCorrectionConfirmation = false;
let correctedSentence = "";

/* ========================================
If debugMode = true → Show debug info.
If debugMode = false → Don’t show anything.
========================================
*/const debugMode = true; // Toggle this to enable/disable debug messages

/* ======================================================================
						### processInput ###
Gets the text the user typed.
Checks if the user made spelling mistakes (e.g., “libarry” → “library”).
If yes, asks: “Did you mean ___?” and waits for user to reply Yes/No.
If No spelling issue → process the sentence.
 ==================================================================== */
function processInput() {
  const inputBox = document.getElementById("UserInput");
  const chatContainer = document.getElementById("chat-container");
  let userInput = inputBox.value.trim();

  if (!userInput) return;

  // Handle confirmation flow
  //Notice that : test method Comes from JavaScript's built-in RegExp (Regular Expression) object.
  if (waitingCorrectionConfirmation) {
    if (/^(yes|yeah|yep|correct|right)$/i.test(userInput)) {
      waitingCorrectionConfirmation = false;
      appendMessage(userInput, "user");
      processCorrectedSentence(correctedSentence);
    } else if (/^(no|nah|nope|wrong)$/i.test(userInput)) {
      waitingCorrectionConfirmation = false;
      appendMessage(userInput, "user");
      appendMessage("Okay! Please rephrase your question.", "bot");
    } else {
      appendMessage(userInput, "user");
      appendMessage("Please reply with 'Yes' or 'No'.", "bot");
    }
    inputBox.value = "";
    return;
  }

  chatContainer.style.display = "block";
  appendMessage(userInput, "user");
  inputBox.value = "";

  const lowerInput = userInput.toLowerCase();
  // It splits the user input into individual words using spaces (and other whitespace) as the separator.
  const words = lowerInput.split(/\s+/); 
  const allKnownWords = locationDictionary.concat(
    knowledgeBase.flatMap(entry => entry.question.toLowerCase().split(/\s+/))
  );

  const correctedWords = words.map(word => didYouMean(word, allKnownWords) || word);
  correctedSentence = correctedWords.join(" "); //add space here inside string.

  if (correctedSentence !== lowerInput) {
    waitingCorrectionConfirmation = true;
    // this syntax because i'm using html tags also calling variable
    appendMessage(`Did you mean: <strong>"${correctedSentence}"</strong>? Please reply with Yes or No.`, "bot", true);
    return;
  }

  // calling function 
  processCorrectedSentence(lowerInput);
}

function processCorrectedSentence(lowerInput) {
  if (debugMode) appendDebugMessage("Interpreted input", lowerInput);

/*
  const doc = nlp(lowerInput);
      uses the Compromise NLP library (nlp) to analyze the user's input — turning it
      into a “document” object that understands the grammar, parts of speech, nouns, verbs, etc.
*/const doc = nlp(lowerInput);

  // selecting all nouns and converting nouns into a plain JavaScript array.
  // nouns included in 'doc' variable which is result of analyzing the user input text.
  const rawNouns = doc.nouns().out('array');	

/*
    let's check if there are any words which is related with places or distination 
    or if user askes for route ... 
*/if (locationKeywords.some(keyword => lowerInput.includes(keyword))) {
    const correctedNouns = rawNouns.map(noun => correctTypos(noun, locationDictionary));
    const destination = correctedNouns.join(" ").trim();

    if (debugMode) appendDebugMessage("Detected destination", destination);

    // check if it's destination which means should generate google map link for user.
    if (destination) {
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
      const botReply = `Here is the location on Google Maps: <a href="${mapLink}" target="_blank">${destination}</a>`;
      appendMessage(botReply, "bot", true);
    } else {
      appendMessage("I couldn't understand the destination. Could you try again?", "bot");
    }
    return;
  } // END if user want route statement

  // 'match' from didYouMean 
  // match or check if there are any word similar to those stored in 'knowledgeBase' array.
  const match = getFuzzyMatch(lowerInput, knowledgeBase);
  if (match) {
    if (debugMode) appendDebugMessage("Matched question", match.question);
    appendMessage(match.answer, "bot");
  } else {
    const words = lowerInput.split(/\s+/);
    const unclearWords = [];
    const allKnownWords = locationDictionary.concat(knowledgeBase.map(entry => entry.question.toLowerCase()));

    words.forEach(word => {
      const suggestion = didYouMean(word, allKnownWords);
      // if there are not match inside 'didYouMean' library so bot did not get it.
      if (!suggestion || suggestion.toLowerCase() !== word.toLowerCase()) {
        unclearWords.push(word);// add unclear words.
      }
    });// end of words.forEach

    // check if there are words stored here ...
    // TRUE : so did not get this word or these words 
    // FALSE : bot did not understand whole user question or inquiry
    if (unclearWords.length > 0) {
      appendMessage(`I'm not sure what you meant by: <strong>${unclearWords.join(', ')}</strong>. Could you clarify or rephrase?`, "bot", true);
    } else {
      appendMessage("I'm still learning. Could you rephrase your question?", "bot");
    }
  } // END IF(match) wroge/false scope
} //END processCorrectedSentence

function correctTypos(word, dictionary) {
  const suggestion = didYouMean(word, dictionary);
  return suggestion || word;
} //END correctTypos

function getFuzzyMatch(input, base) {
  const questions = base.map(entry => entry.question);
  const matchedQuestion = didYouMean(input, questions);
  return base.find(entry => entry.question === matchedQuestion);
} //END getFuzzyMatch

function appendMessage(text, sender, isHTML = false) {
  const chatContainer = document.getElementById("chat-container");
  const message = document.createElement("p");
  message.className = sender === "user" ? "user-message" : "bot-message";

  message.innerHTML = isHTML
    ? `🤖 <strong>${sender === "user" ? "You" : "Bot"}:</strong> ${text}`
    : `🤖 <strong>${sender === "user" ? "You" : "Bot"}:</strong> ${escapeHTML(text)}`;

  chatContainer.appendChild(message);
  chatContainer.scrollTop = chatContainer.scrollHeight;
} //END appendMessage

// Debug info (light grey message)
function appendDebugMessage(label, content) {
  const chatContainer = document.getElementById("chat-container");
  const message = document.createElement("div");
  message.className = "bot-debug";
  message.innerHTML = `<small><strong>${escapeHTML(label)}:</strong> ${escapeHTML(content)}</small>`;
  chatContainer.appendChild(message);
  chatContainer.scrollTop = chatContainer.scrollHeight;
} // END appendDebugMessage

// HTML escaping

// replace '&' with '&amp; which let innerHTML method understand it as text instead code,and so on.
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, tag => (
    {
      '&': '&amp;',  
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[tag] || tag
  ));
} // END escapeHTML

// Theme toggle
function theme_toggle() {
  const root = document.documentElement;
  const toggleButton = document.getElementById("Theme_toggle_button");
  const currentTheme = root.getAttribute("data-theme");

  if (currentTheme === "dark") {
    root.removeAttribute("data-theme");
    toggleButton.innerText = "Dark";
  } else {
    root.setAttribute("data-theme", "dark");
    toggleButton.innerText = "Light";
  }
} // END theme_toggle

// Scrollbar style
function hideScrollbar() {
  const chatContainer = document.getElementById("chat-container");
  chatContainer.style.overflowY = "scroll";
  chatContainer.style.scrollbarWidth = "none";
  chatContainer.style.msOverflowStyle = "none";
  chatContainer.style.webkitOverflowScrolling = "touch";
  chatContainer.style.setProperty('scrollbar-width', 'none');
  chatContainer.style.setProperty('overflow', 'hidden');
} // END hideScrollbar

// Call on load
hideScrollbar();
