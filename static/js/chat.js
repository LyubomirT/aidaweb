const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const newConvButton = document.getElementById('new-conv-button');
const sendButton = document.getElementById('send-button');
const username = document.getElementById('user_name');
const userAvatar = document.getElementById('user_avatar');
const errorModal = document.getElementById('errorModal');
const statusText = document.getElementById('status-text');
const settingsModal = document.getElementById('settingsModal');
const settingsModalClose = document.getElementById('settings-modal-close');
const settingsTemperature = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');
const maxTokens = document.getElementById('max-tokens');
const maxTokensValue = document.getElementById('max-tokens-value');
const customInstructions = document.getElementById('preamble-override');
const useMyName = document.getElementById('use-my-name');
const imageGen = document.getElementById('image-gen');
const imageGenModel = document.getElementById('image-gen-model');
const topP = document.getElementById('top-p');
const topPValue = document.getElementById('top-p-value');
const saveSettingsButton = document.getElementById('save-settings');
const resetSettingsButton = document.getElementById('reset-settings');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const fileSelector = document.getElementById('upload-button');
var kangaroo;
var darkmodeOn = false;
var firstClick = false;
const model = document.getElementById('model');
const websearch = document.getElementById('websearch');
const samples = document.getElementsByClassName('samples')[0];
let chatHistory = [];  // Retrieve chat history from server
let convId = null;  // Conversation ID
// If there is a Discord access token in the URL, save it in local storage as OAUTH2_TOKEN
const urlParams = new URLSearchParams(window.location.hash.substr(1));
const discordToken = urlParams.get('access_token');
if (discordToken) {
  localStorage.setItem('OAUTH2_TOKEN', discordToken);
}
const errorModalClose = document.getElementById('error-modal-close');
console.log('Discord token:', discordToken);
const iconimport = document.getElementById('svgimport');
// child of iconimport
const regenlink_ = document.querySelector('#svgimport > #regen');
const regenlink = regenlink_.textContent;

const conversationsList = document.getElementById('conversations-list');

function setMarked() {
  // set the marked variable to true
  fileSelector.innerHTML = '<i class="fi fi-rr-check"></i>';
}

function setUnmarked() {
  // set the marked variable to false
  fileSelector.innerHTML = '<i class="fi fi-rr-clip"></i>';
  localStorage.removeItem('upload');
}
setUnmarked();

fileSelector.addEventListener('click', function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.png, .jpg, .jpeg, .gif';
  fileInput.click();
  fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    if (!file) {
      return;
    }
    // Check if the file is an image
    if (!file.type.includes('png') && !file.type.includes('jpg') && !file.type.includes('jpeg') && !file.type.includes('gif')) {
      openErrorModal(errorModal, 'Please upload an image file');
      return;
    }
    // Not more than 25MB
    if (file.size > 25 * 1024 * 1024) {
      openErrorModal(errorModal, 'File size must be less than 25MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = function() {
      const dataURL = reader.result;
      // store the dataURL in local storage
      localStorage.setItem('upload', dataURL);
    };
    reader.readAsDataURL(file);
    setMarked();
  });
});

// Add event listeners
closeSidebar.addEventListener('click', function() {
  if (firstClick === false) {
    sidebar.style.display = 'none';
    closeSidebar.innerHTML = '<i class="fi fi-rr-angle-double-right"></i>';
    firstClick = true;
  } else {
    if (sidebar.style.display === 'flex') {
      sidebar.style.display = 'none';
      closeSidebar.innerHTML = '<i class="fi fi-rr-angle-double-right"></i>';
    } else {
      sidebar.style.display = 'flex';
      closeSidebar.innerHTML = '<i class="fi fi-rr-angle-double-left"></i>';
    }
  }
});

errorModalClose.addEventListener('click', function() {
  closeModal(errorModal);
});

settingsModalClose.addEventListener('click', function() {
  closeModal(settingsModal);
});

settingsTemperature.addEventListener('input', function() {
  temperatureValue.innerHTML = settingsTemperature.value;
});

maxTokens.addEventListener('input', function() {
  maxTokensValue.innerHTML = maxTokens.value;
});

topP.addEventListener('input', function() {
  topPValue.innerHTML = topP.value;
});

function loadConfig() {
  if (oauth2Token) {
    fetch('/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({token: oauth2Token,}),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Config:', data);
      data = JSON.parse(data);
      if (data.temperature !== undefined && data.temperature !== null) {
        settingsTemperature.value = data.temperature;
        temperatureValue.innerHTML = data.temperature;
      }
      if (data.max_tokens !== undefined && data.max_tokens !== null) {
        maxTokens.value = data.max_tokens;
        maxTokensValue.innerHTML = data.max_tokens;
      }
      if (data.preamble_override !== undefined && data.preamble_override !== null) {
        customInstructions.value = data.preamble_override;
      }
      if (data.model !== undefined && data.model !== null) {
        model.value = data.model;
      }
      if (data.websearch !== undefined && data.websearch !== null) {
        websearch.value = data.websearch;
      }
      if (data.usemyname !== undefined && data.usemyname !== null) {
        useMyName.value = data.usemyname;
      }
      if (data.imagegen !== undefined && data.imagegen !== null) {
        imageGen.value = data.imagegen;
      }
      if (data.top_p !== undefined && data.top_p !== null) {
        topP.value = data.top_p;
      }
      if (data.image_gen_model !== undefined && data.image_gen_model !== null) {
        imageGenModel.value = data.image_gen_model;
      }
    })
    .catch(error => console.error('Error:', error));
  }
}

function saveConfig() {
  fetch('/save_config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: oauth2Token,
      config: JSON.stringify({
        temperature: settingsTemperature.value,
        max_tokens: maxTokens.value,
        preamble_override: customInstructions.value,
        model: model.value,
        websearch: websearch.value,
        usemyname: useMyName.value,
        imagegen: imageGen.value,
        image_gen_model: imageGenModel.value,
        top_p: topP.value,
      }),
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      resetConfig();
      saveConfig();
      return;
    }
    console.log('Config saved:', data);
    closeModal(settingsModal);
  })
  .catch(error => console.error('Error:', error));
}

saveSettingsButton.addEventListener('click', function() {
  saveConfig();
});

function resetConfig() {
  settingsTemperature.value = 0.5;
  temperatureValue.innerHTML = 0.5;
  maxTokens.value = 500;
  maxTokensValue.innerHTML = 500;
  customInstructions.value = '';
  model.value = 'command-r';
  websearch.value = 'true';
  useMyName.value = 'false';
  imageGen.value = 'false';
  topP.value = 0.9;
  imageGenModel.value = 'dreamshaper';
}

resetSettingsButton.addEventListener('click', function() {
  if (confirm('Are you sure you want to reset the settings?')) {
    resetConfig();
  }
});

// If there is a discord token in local storage, use it to authenticate
const oauth2Token = localStorage.getItem('OAUTH2_TOKEN');
if (oauth2Token) {
  fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${oauth2Token}`,
    },
  })
  .then(response => response.json())
  .then(data => {
    console.log('Discord user:', data);
    username.innerHTML = data.global_name;
    userAvatar.src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;
    turnIntoDropdown(document.getElementById("user_info"));
  })
  .catch(error => {
    console.error('Error:', error);
    localStorage.removeItem('OAUTH2_TOKEN');
    // Redirect to the home page if there is an error with the token  
    window.location.href = '/auth/discord';
  });
} else {
  // Redirect to the home page if there is no token
  window.location.href = '/auth/discord';
}

newConvButton.addEventListener('click', function() {
  chatBox.innerHTML = '';
  chatHistory = [];
  convId = null;
  statusText.innerHTML = 'New conversation';
  // on mobile, close the sidebar
  if (window.innerWidth < 768) {
    sidebar.style.display = 'none';
    closeSidebar.innerHTML = '<i class="fi fi-rr-angle-double-right"></i>';
  }
  setUnmarked();
});

chatInput.addEventListener('keydown', function(e) {
  // if the screen is too small, simply return
  if (window.innerWidth < 768) {
    return;
  }
  if (e.shiftKey && e.key === 'Enter') {
    chatInput.value += '\n';
  } else if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener('click', function() {
  sendMessage();
});

function sendMessage() {
  if (chatInput.value === '') {
    openErrorModal(errorModal, 'Please enter a message before sending');
    return;
  }
  if (chatInput.value.length > 2000) {
    openErrorModal(errorModal, 'Message is too long (max 2000 characters)');
    return;
  }
  if (document.getElementById('conv-samples')) {
    document.getElementById('conv-samples').remove();
  }
  const message = chatInput.value;
  chatInput.value = '';
  postMessage(message);
}

// Open Modal Dialog for Editing Message
function openEditModal(modal, message) {
  modal.style.display = "block";
  document.getElementById('edit-message').value = message;
}

function openErrorModal(modal, message) {
  modal.style.display = "block";
  document.getElementById('error-message').innerHTML = message;
}

// Close Modal Dialog
function closeModal(modal) {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (event.target == modal) {
      closeModal(modal);
    }
  });
}

// Save Edit Button Click Event
document.getElementById('save-edit').addEventListener('click', function() {
  const editedMessage = document.getElementById('edit-message').value;
  closeModal(document.getElementById('editModal'));
  postEdit(editedMessage);
});

// Function to Send Edited Message to Server
function postEdit(editedMessage) {
  chatInput.disabled = true;
  sendButton.disabled = true;

  lockChats();

  var lastUsr = null;
  var lastAsst = null;
  var tmp_ch = null;

  // Save the last two messages (edited message and assistant response)
  const messages = document.querySelectorAll('.messagecontainer');
  lastUsr = messages[messages.length - 2].querySelector('.User.message').textContent;
  lastAsst = messages[messages.length - 1].querySelector('.Chatbot.message').textContent;
  lastUsrImgIfPossible = messages[messages.length - 2].querySelector('.uploaded-image');
  lastAsstImgIfPossible = messages[messages.length - 1].querySelector('.uploaded-image');
  if (lastUsrImgIfPossible !== null) {
    lastUsr = lastUsrImgIfPossible.src;
  } else {
    lastUsr = null;
  }
  if (lastAsstImgIfPossible !== null) {
    lastAsst = lastAsstImgIfPossible.src;
  } else {
    lastAsst = null;
  }

  deleteLast();
  deleteLast();

  fetch('/edit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      new_message: editedMessage,
      conv_id: convId,
      token: oauth2Token,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      chatInput.disabled = false;
      sendButton.disabled = false;
      // Restore the last two messages (edited message and assistant response)
      chatBox.innerHTML += constructMessage(lastUsr, 'User', attachmentbase64=lastUsr);
      chatBox.innerHTML += constructMessage(lastAsst, 'Chatbot', attachmentbase64=lastAsst);
      constructCopyCodeButton();
      applyRemainingMode();
      unlockChats();
      return;
    }
    const rawResponse = data.raw_response;
    const htmlResponse = data.html_response;
    chatHistory = data.chat_history;  // Update chat history from server
    console.log('Chat history:', chatHistory);
    // Append the edited message and the assistant response
    chatBox.innerHTML += constructMessage(editedMessage, editedMessage, 'User', attachmentbase64=lastUsrImgIfPossible);
    response = constructMessage(htmlResponse, rawResponse, 'Chatbot', attachmentbase64=data.attachmentbase64);
    response.raw = rawResponse;
    chatBox.innerHTML += response;
    constructCopyCodeButton();
    applyRemainingMode();
    MathJax.typeset();
    hljs.highlightAll();
    chatBox.scrollTop = chatBox.scrollHeight;
    chatInput.disabled = false;
    sendButton.disabled = false;
    unlockChats();
  })
  .catch(error => {
    console.error('Error:', error);
    chatInput.disabled = false;
    sendButton.disabled = false;
    openErrorModal(errorModal, 'Error: ' + error);
    // Restore the last two messages (edited message and assistant response)
    chatBox.innerHTML += constructMessage(lastUsr, 'User', attachmentbase64=lastUsrImgIfPossible);
    constructCopyCodeButton();
    applyRemainingMode();
    fetch('/textmanager/to_html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({text: lastAsst}),
    })
    .then(response => response.json())
    .then(data => {
      lastAsst = data.html;
    })
    .catch(error => console.error('Error:', error));
    chatBox.innerHTML += constructMessage(lastAsst, 'Chatbot', attachmentbase64=lastAsstImgIfPossible);
    constructCopyCodeButton();
    applyRemainingMode();
    unlockChats();
  });
}

document.getElementById('edit-modal-close').addEventListener('click', function() {
  closeModal(document.getElementById('editModal'));
});

function edit(id) {
  console.log('Editing message:', id);
  // Ensure we're editing a user message (odd-numbered id)
  if (id % 2 === 1) {
    console.error("Attempted to edit an assistant message");
    console.warn("Getting the last user message instead");
    id -= 1;
  }

  // Find the correct message in the chat history
  // The ID is the key to finding the message
  const item = getItem(id);

  console.log('Scanned chat history:', chatHistory);

  if (!item) {
    console.error("User message not found for editing");
    return;
  }

  // Get the raw message content
  const messageToEdit = item.message;

  // Open the edit modal with the correct message
  openEditModal(document.getElementById('editModal'), messageToEdit);
}

function constructCopyCodeButton() {
  let blocks = document.querySelectorAll('pre');

  if (blocks.length > 0) {
    blocks.forEach((block) => {
      if (block.querySelector('.copy-code')) {
        return;
      }
      let button = document.createElement('button');
      button.innerHTML = '<i class="fi fi-rr-copy"></i>';
      button.classList.add('copy-code');
      button.addEventListener('click', function() {
        navigator.clipboard.writeText(block.textContent).then(function() {
          console.log('Copied to clipboard:', block.textContent);
        }, function(err) {
          console.error('Error:', err);
        });
      });
      block.appendChild(button);
    });
  }
}

function rewind(id) {
  if (!confirm('Are you sure you want to rewind to this message?')) {
    return;
  }
  // Rewind to the message with the specified id
  console.log('id:', id);
  console.log('Chat history:', chatHistory);
  // Before proceeding, reassign IDs to all messages (because it might be broken)
  for (var i = 0; i < chatHistory.length; i++) {
    chatHistory[i].id = i;
    // same for messages in the html
    var messages = document.querySelectorAll('.messagecontainer');
    for (var j = 0; j < messages.length; j++) {
      messages[j].id = j;
    }
  }
  // if the id is even and not 0, subtract 1
  if (id % 2 === 0 && id !== 0) {
    id -= 1;
  }
  // if the id is 0, just refuse to rewind
  if (id === 0) {
    openErrorModal(errorModal, 'The chat, apparently, is broken.');
    return;
  }
  lockChats();
  fetch('/rewind', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conv_id: convId,
      token: oauth2Token,
      to: id,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      unlockChats();
      return;
    }
    // it returns expectedlength, remove all messages after that length
    const expectedLength = data.expectedlength;
    chatHistory = chatHistory.slice(0, expectedLength);
    console.log('Chat history:', chatHistory);
    // same for what's currently in the html
    var messages = document.querySelectorAll('.messagecontainer');
    // remove all messages after the expected length
    for (var i = expectedLength; i < messages.length; i++) {
      messages[i].remove();
    }
    unlockChats();
    // Delete the last two messages
    deleteLast();
    deleteLast();
    // Reconstruct the two last messages
    const lastUsr = chatHistory[chatHistory.length - 2];
    const lastAsst = chatHistory[chatHistory.length - 1];
    chatBox.innerHTML += constructMessage(lastUsr.message, lastUsr.message, 'User');
    chatBox.innerHTML += constructMessage(lastAsst.message, lastAsst.message, 'Chatbot');
  });
}

function constructMessage(message, rawmsg, role, attachmentbase64=null) { 
  // Remove all regen and edit buttons
  const regen = document.querySelectorAll('.regen');
  const edit = document.querySelectorAll('.edit');
  if (role==="Chatbot") {
    regen.forEach((element) => {
      element.remove();
      console.log("Removed regen button");
    });
  }
  // Find ID by calculating its position in the chat history
  if (chatHistory.length > 0) {
    var id = chatHistory.length;
  } else {
    var id = 0;
  }
  var regenstring;
  if (role === "User") {
    imgsrc = userAvatar.src;
    var _username = username.innerHTML;
    message.textToEdit = rawmsg;
    regenstring = `
    <div class="msgcontrol edit" onclick="edit(${id})">
    <i class="fi fi-rr-edit"></i>
    </div>
    `;
    if (localStorage.getItem('upload') || attachmentbase64 !== null) {
      if (attachmentbase64 !== null) {
        base64string = attachmentbase64;
      } else if (localStorage.getItem('upload')) {
        base64string = localStorage.getItem('upload');
      }
      contentstring = `<img src="${base64string}" alt="User uploaded image" class="uploaded-image">`;
    } else {
      contentstring = ``;
    }
  } else {
    const assistanthidden = document.getElementById('assistant-hidden');
    imgsrc = assistanthidden.src;
    var _username = "Assistant"
    // get the svg from the file at regenlink
    var svg = document.createElement('div');
    regenstring = `
    <div class="msgcontrol rewind" onclick="rewind(${id})">
    <i class="fi fi-rr-rewind"></i>
    </div>
    <div class="msgcontrol regen" onclick="regenerate()">
    <i class="fi fi-rr-refresh"></i>
    </div>
    `;
    regenstring += `
    <div class="msgcontrol tts" onclick="textToSpeech(${id})">
    <i class="fi fi-rr-volume"></i>
    </div>
    `;
    contentstring = ``;
    if (attachmentbase64 !== null) {
      contentstring = `<img src="${attachmentbase64}" alt="Assistant uploaded image" class="uploaded-image">`;
    }
  }
  console.log(rawmsg);
  if (rawmsg.message !== undefined) {
    rawmsg = rawmsg.message;
  } else {
    rawmsg = rawmsg;
  }
  if (role === "User") {
    message = message.replace(/(?:\r\n|\r|\n)/g, '<br>');
    message = message.replace('<br><br>', '<br>');
    // I don't know why this bug happens, but it does, so...
  } else if (role === "Chatbot") {
    // We need to replace $something$ with $$something$$ for MathJax to render it
    // In both the raw message and the HTML message
    // something can be any string of characters
    var re = /\$([^\$]+)\$/g;
    //message = message.replace(re, '$$$$$1$$$$');
    //rawmsg = rawmsg.replace(re, '$$$$$1$$$$');
    setUnmarked();
    
  }

  chatHistory.push({id: id, message: rawmsg, role: role});

  return `
  <div class="messagecontainer">
    <div class="infocontainer">
      <img class="msg-avatar" src="${imgsrc}" alt="${role} avatar">
      <div class="${role} username">${_username}</div>
    </div>
    <div class="${role} message">${message}</div>
    ${contentstring}
    <div class="msgcontrols">
      ${regenstring}
      <div class="msgcontrol copy" onclick="copy_(${id})">
      <i class="fi fi-rr-copy"></i>
      </div>
    </div>
  </div>
  `;
}

function textToSpeech(id) {
  const message = getItem(id);
  if (!message) return;

  const ttsButton = document.querySelectorAll('.tts')[id - 1];
  console.log('TTS buttons:', document.querySelectorAll('.tts'));
  ttsButton.innerHTML = '<i class="fi fi-rr-spinner"></i>';

  fetch('/text_to_speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: message.message,
      token: oauth2Token,
    }),
  })
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      ttsButton.innerHTML = '<i class="fi fi-rr-volume"></i>';
    };
    audio.play();
    ttsButton.innerHTML = '<i class="fi fi-rr-pause"></i>';
    ttsButton.onclick = () => {
      if (audio.paused) {
        audio.play();
        ttsButton.innerHTML = '<i class="fi fi-rr-pause"></i>';
      } else {
        audio.pause();
        ttsButton.innerHTML = '<i class="fi fi-rr-play"></i>';
      }
    };
  })
  .catch(error => {
    console.error('Error:', error);
    openErrorModal(errorModal, 'Error generating speech: ' + error);
    ttsButton.innerHTML = '<i class="fi fi-rr-volume"></i>';
  });
}

function getItem(id) {
  console.log('chat history:', chatHistory)
  if (id === null) {
    return;
  } else if (id==0) {
    return chatHistory[0];
  }
  // Get from chat history
  for (var i = 0; i < chatHistory.length; i++) {
    if (chatHistory[i] !== undefined && i === id) {
      return chatHistory[i];
    }
  }
}

function copy_(id = null) {
  // Copy the message to the clipboard
  if (id === null) {
    return;
  }
  const item = getItem(id);
  console.warn(item);
  if (item === undefined) {
    return;
  }
  const message = item.message;
  navigator.clipboard.writeText(message).then(function() {
    console.log('Copied to clipboard:', message);
  }, function(err) {
    console.error('Error:', err);
  });
}

function cleanRegen() {
  const regen = document.querySelectorAll('.regen');
  regen.forEach((element) => {
    element.remove();
  });
}

function deleteLast() {
  // deletes last message
  const messages = document.querySelectorAll('.messagecontainer');
  const lastMessage = messages[messages.length - 1];
  lastMessage.remove();
}

function fixName(name) {
  // Replace all other symbols that come after the symbol 20 with ...
  /*
  if (name.length > 20) {
    name = name.substring(0, 20) + '...';
  }
  */
  // BETTER WAY TO DO THIS IS TO REPLACE IT BY WORDS INSTEAD OF CHARACTERS (LIKE EVERY WORD AFTER OR IN THE 20TH CHARACTER)
  // EXCEPTION: IF ONE WORD, THEN BY CHARACTERS
  /*
  if (name.length > 30 && name.indexOf(' ') !== -1) {
    // by words
    var words = name.split(' ');
    var newname = '';
    for (var i = 0; i < words.length; i++) {
      if (newname.length + words[i].length > 30) {
        break;
      }
      newname += words[i] + ' ';
    }
    name = newname + '...';
  }
  */
  return name;
}

function regenerate() {
  // this function heads to the regenerate route and deletes the last message (if it's an assistant message)
  // it also receives a new message from the server and appends it to the chatbox
  chatInput.disabled = true;
  sendButton.disabled = true;
  lockChats();
  fetch('/regen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conv_id: convId,
      chat_history: chatHistory,
      token: oauth2Token,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      chatInput.disabled = false;
      sendButton.disabled = false;
      unlockChats();
      return;
    }
    deleteLast();
    cleanRegen();
    const rawResponse = data.raw_response;
    const htmlResponse = data.html_response;
    chatHistory = data.chat_history;  // Update chat history from server
    // assign each message an id
    for (var i = 0; i < chatHistory.length; i++) {
      chatHistory[i].id = i;
    }
    console.log('Chat history:', chatHistory);
    response = constructMessage(htmlResponse, rawResponse, 'Chatbot', data.attachmentbase64);
    response.raw = rawResponse;
    chatBox.innerHTML += response;
    constructCopyCodeButton();
    applyRemainingMode();
    MathJax.typeset();
    hljs.highlightAll();
    chatBox.scrollTop = chatBox.scrollHeight;
    chatInput.disabled = false;
    sendButton.disabled = false;
    unlockChats();
  })
  .catch(error => {
    console.error('Error:', error);
    chatInput.disabled = false;
    sendButton.disabled = false;
    openErrorModal(errorModal, 'Error: ' + error);
    unlockChats();
  });
}

function lockChats() {
  chatInput.disabled = true;
  sendButton.disabled = true;
  sendButton.innerHTML = '<i class="fi fi-rr-menu-dots"></i>';
  newConvButton.disabled = true;
  fileSelector.disabled = true;
  // Lock all conversations
  const conversations = document.querySelectorAll('.conversation');
  conversations.forEach((conv) => {
    console.warn("Locked" + conv.innerHTML);
    conv.disabled = true;
    // for all the children of the conversation, disable them
    var children = conv.children;
    for (var i = 0; i < children.length; i++) {
      children[i].disabled = true;
    }
  });
  // find all regen buttons and disable them
  const regen = document.querySelectorAll('.regen');
  regen.forEach((element) => {
    element.disabled = true;
  });
  // find all edit buttons and disable them
  const edit = document.querySelectorAll('.edit');
  edit.forEach((element) => {
    element.disabled = true;
  });
}

function unlockChats() {
  chatInput.disabled = false;
  sendButton.disabled = false;
  sendButton.innerHTML = '<i class="fi fi-rr-paper-plane-top"></i>';
  newConvButton.disabled = false;
  fileSelector.disabled = false;
  // Unlock all conversations
  const conversations = document.querySelectorAll('.conversation');
  conversations.forEach((conv) => {
    conv.disabled = false;
    // for all the children of the conversation, enable them
    var children = conv.children;
    for (var i = 0; i < children.length; i++) {
      children[i].disabled = false;
    }
  });
  // find all regen buttons and enable them
  const regen = document.querySelectorAll('.regen');
  regen.forEach((element) => {
    element.disabled = false;
  });
  // find all edit buttons and enable them
  const edit = document.querySelectorAll('.edit');
  edit.forEach((element) => {
    element.disabled = false;
  });
}

function postMessage(message) {

  chatInput.disabled = true;
  sendButton.disabled = true;
  newConvButton.disabled = true;

  const edit = document.querySelectorAll('.edit');
  edit.forEach((element) => {
    element.remove();
  });

  // Create a preview of the message
  chatBox.innerHTML += constructMessage(message, message, 'User');
  constructCopyCodeButton();
  chatBox.scrollTop = chatBox.scrollHeight;
  applyRemainingMode();

  lockChats();
  // If the chat history is empty, start a new conversation
  if (convId === null) {
    fetch('/new_conv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({token: oauth2Token,}),  // Send the Discord token to the server
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error('Error:', data.error);
        openErrorModal(errorModal, data.error);
        chatInput.disabled = false;
        sendButton.disabled = false;
        newConvButton.disabled = false;
        unlockChats();
        return;
      }
      convId = data.conv_id;
      var LconvName = data.name;
      // Create a new conversation element and add it to the TOP of the conversations list
      const convElement = document.createElement('button');
      convElement.classList.add('conversation');
      const p = document.createElement('p');
      p.id = 'name';
      convElement.appendChild(p);
      convElement.querySelector('#name').innerHTML = LconvName;
      convElement.conv_id = convId;
      convElement.disabled = true;
      statusText.innerHTML = data.name + ` (${convId})`;
      createDropdown(convElement);
      conversationsList.prepend(convElement);
      constructConversation(convElement, LconvName);
      applyRemainingMode();
      children = convElement.children;
      for (var i = 0; i < children.length; i++) {
        children[i].disabled = true;
      }

      if (localStorage.getItem('upload')) {
        var base64string = localStorage.getItem('upload');
      } else {
        var base64string = null;
      }

      fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conv_id: convId,
          chat_history: chatHistory,  // Send chat history to server,
          token: oauth2Token,
          attachmentbase64: base64string,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          chatInput.disabled = false;
          sendButton.disabled = false;
          newConvButton.disabled = false;
          // Remove the last message (user message) if there is an error
          deleteLast();
          unlockChats();
          return;
        }
        setTokens(data.tokens);
        const rawResponse = data.raw_response;
        const htmlResponse = data.html_response;
        chatHistory = data.chat_history;  // Update chat history from server
        // assign each message an id
        for (var i = 0; i < chatHistory.length; i++) {
          chatHistory[i].id = i;
        }
        console.log('Chat history:', chatHistory);
        response = constructMessage(htmlResponse, rawResponse, 'Chatbot', data.attachmentbase64);
        response.raw = rawResponse;
        chatBox.innerHTML += response;
        constructCopyCodeButton();
        applyRemainingMode();
        MathJax.typeset();
        hljs.highlightAll();
        fetch('/name_conv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conv_id: convId,
            token: oauth2Token,
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            chatBox.scrollTop = chatBox.scrollHeight;
            chatInput.disabled = false;
            sendButton.disabled = false;
            newConvButton.disabled = false;
            unlockChats();
          } else {
            normalName = data.title;
            normalName = fixName(normalName);
            convElement.querySelector('#name').innerHTML = normalName;
            console.warn("Name changed to " + normalName);
            convElement.setAttribute('conv_name', normalName);
            LconvName = data.title;
            statusText.innerHTML = LconvName + ` (${convId})`;
            chatBox.scrollTop = chatBox.scrollHeight;
            chatInput.disabled = false;
            sendButton.disabled = false;
            newConvButton.disabled = false;
            unlockChats();
          }
        })
        .catch(error => {
          console.error('Error:', error);
          chatInput.disabled = false;
          sendButton.disabled = false;
          newConvButton.disabled = false;
          openErrorModal(errorModal, 'Error: ' + error);
          // Remove the last message (user message) if there is an error
          deleteLast();
          unlockChats();
        });
      })
      .catch(error => {
        console.error('Error:', error);
        chatInput.disabled = false;
        sendButton.disabled = false;
        newConvButton.disabled = false;
        openErrorModal(errorModal, 'Error: ' + error);
        // Remove the last message (user message) if there is an error
        deleteLast();
        unlockChats();
      });
    })
    .catch(error => {
      console.error('Error:', error);
      openErrorModal(errorModal, 'Error: ' + error);
      chatInput.disabled = false;
      sendButton.disabled = false;
      newConvButton.disabled = false;
      unlockChats();
      return;
    });
  } else {
    if (localStorage.getItem('upload')) {
      var base64string = localStorage.getItem('upload');
    } else {
      var base64string = null;
    }
    fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        conv_id: convId,
        chat_history: chatHistory,  // Send chat history to server,
        token: oauth2Token,
        attachmentbase64: base64string,
      }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        openErrorModal(errorModal, 'Error: ' + data.error);
        chatInput.disabled = false;
        sendButton.disabled = false;
        newConvButton.disabled = false;
        // Remove the last message (user message) if there is an error
        deleteLast();
        unlockChats();
        return;
      }
      setTokens(data.tokens);
      const rawResponse = data.raw_response;
      const htmlResponse = data.html_response;
      chatHistory = data.chat_history;  // Update chat history from server
      // assign each message an id
      for (var i = 0; i < chatHistory.length; i++) {
        chatHistory[i].id = i;
      }
      console.log('Chat history:', chatHistory);
      response = constructMessage(htmlResponse, rawResponse, 'Chatbot', data.attachmentbase64);
      response.raw = rawResponse;
      chatBox.innerHTML += response;
      constructCopyCodeButton();
      applyRemainingMode();
      MathJax.typeset();
      hljs.highlightAll();
      chatBox.scrollTop = chatBox.scrollHeight;
      chatInput.disabled = false;
      sendButton.disabled = false;
      newConvButton.disabled = false;
      unlockChats();
    })
    .catch(error => {
      console.error('Error:', error);
      chatInput.disabled = false;
      sendButton.disabled = false;
      newConvButton.disabled = false;
      openErrorModal(errorModal, 'Error: ' + error);
      // Remove the last message (user message) if there is an error
      deleteLast();

      unlockChats();
    });
  }
}

function constructConversation(conv, name = null) {
  // On click, get the conversation history from the server and display it in the chat box
  conv.setAttribute('conv_name', name);
  conv.setAttribute('conv_id', conv.conv_id);
  conv.addEventListener('click', function () {
    setUnmarked();
    // if the screen is too small (768px-), close the sidebar
    if (window.innerWidth <= 768) {
      closeSidebar.click();
    }
    statusText.innerHTML = conv.getAttribute('conv_name') + ` (${conv.conv_id})` || 'Conversation (?)';
    chatBox.innerHTML = '';
    chatHistory = [];
    console.log('Conversation ID:', conv.conv_id);
    fetch('/get_conv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conv_id: parseInt(conv.conv_id),
        token: oauth2Token,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          return;
        }
        const chatHistoryHtml = data.chat_history_html;
        // Assign each message an id
        for (var i = 0; i < chatHistoryHtml.length; i++) {
          chatHistoryHtml[i].id = i;
        }

        console.warn('Chat history:', chatHistoryHtml);

        // Append all messages except the last two
        chatHistoryHtml.slice(0, -2).forEach(message => {
          if (message.role === 'User') {
            if (message.attachmentbase64 !== null) {
              chatBox.innerHTML += constructMessage(message.message, message, 'User', message.attachmentbase64);
              constructCopyCodeButton();
            } else {
              chatBox.innerHTML += constructMessage(message.message, message, 'User');
              constructCopyCodeButton();
            }
          } else {
            chatBox.innerHTML += constructMessage(message.message, message, 'Chatbot', message.attachmentbase64);
            constructCopyCodeButton();
          }
          applyRemainingMode();
        });

        // Remove all regen and edit buttons
        const regen = document.querySelectorAll('.regen');
        const edit = document.querySelectorAll('.edit');
        regen.forEach(element => element.remove());
        edit.forEach(element => element.remove());

        // Append the last two messages individually to ensure they are displayed correctly
        const lastTwo = chatHistoryHtml.slice(-2);
        lastTwo.forEach(message => {
          if (message.role === 'User') {
            if (message.attachmentbase64 !== null) {
              chatBox.innerHTML += constructMessage(message.message, message, 'User', message.attachmentbase64);
              constructCopyCodeButton();
            } else {
              chatBox.innerHTML += constructMessage(message.message, message, 'User');
              constructCopyCodeButton();
            }
          } else {
            chatBox.innerHTML += constructMessage(message.message, message, 'Chatbot', message.attachmentbase64);
            constructCopyCodeButton();
          }
          applyRemainingMode();
        });

        chatHistory = data.chat_history;  // Update chat history from server

        MathJax.typeset();
        hljs.highlightAll();
        chatBox.scrollTop = chatBox.scrollHeight;

        reassignIds();

        // Enable the chat input and send button
        chatInput.disabled = false;
        sendButton.disabled = false;

        // Set the conversation ID
        convId = conv.conv_id;
      })
      .catch(error => console.error('Error:', error));
  });
}



function reassignIds() {
  // find all messagecontainers
  const messages = document.querySelectorAll('.messagecontainer');
  for (var i = 0; i < messages.length; i++) {
    // find all edit buttons and copy buttons in the messagecontainer
    const edit = messages[i].querySelector('.edit');
    const copy = messages[i].querySelector('.copy');
    if (edit !== null) {
      edit.setAttribute('onclick', `edit(${i})`);
    }
    if (copy !== null) {
      copy.setAttribute('onclick', `copy_(${i})`);
    }
  }
}


function verify() {
  lockChats();
  fetch('/joined_server', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({authtoken: oauth2Token, give_convs: true,}),
  }).then(response => response.json())
  .then(data => {
    console.warn('Data:', data);
    if (data.urlban) {
      window.location.href = '/banned';
    }
    if (data.joined === false) {
      window.location.href = '/join';
    } else {
      console.log('User has joined the server');
    }
    // Create conversation elements for each conversation
    list = data.conversations;
    kangaroo = data.kangaroo;
    // reverse the list
    list = list.reverse();
    list.forEach(conv => {
      const convElement = document.createElement('button');
      convElement.classList.add('conversation');
      const p = document.createElement('p');
      p.id = 'name';
      convElement.appendChild(p);
      convElement.querySelector('#name').innerHTML = fixName(conv.name);
      convElement.conv_id = conv.conv_id;
      createDropdown(convElement);
      conversationsList.appendChild(convElement);
      constructConversation(convElement, conv.name);
      applyRemainingMode();
    });
    // Create a "Load More" button
    if (data.conversations !== undefined && data.conversations.length >= 10) {
      const loadMore = document.createElement('button');
      loadMore.classList.add('classicbutton');
      loadMore.classList.add('load-more');
      loadMore.innerHTML = 'Load More';
      loadMore.addEventListener('click', function() {
        loadMoreConversations();
      });
      conversationsList.appendChild(loadMore);
    }
    loadConfig();
    unlockChats();
    const children = samples.children;
    for (var i = 0; i < children.length; i++) {
      children[i].addEventListener('click', function() {
        chatBox.innerHTML = '';
        chatInput.value = this.innerText;
        sendMessage();
      });
    }
  })
  .catch(error => console.error('Error:', error));
}

function loadMoreConversations() {
  // Load more conversations
  lockChats();
  fetch('/loadmoreconvs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({token: oauth2Token, kangaroo: kangaroo}),
  }).then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      unlockChats();
      return;
    }
    if (data.noconvs) {
      openErrorModal(errorModal, 'No more conversations to load');
      unlockChats();
      return;
    }
    kangaroo = data.newkangaroo;
    list = data.conversations;

    // reverse the list
    list = list.reverse();
    list.forEach(conv => {
      const convElement = document.createElement('button');
      convElement.classList.add('conversation');
      const p = document.createElement('p');
      p.id = 'name';
      convElement.appendChild(p);
      convElement.querySelector('#name').innerHTML = fixName(conv.name);
      convElement.conv_id = conv.conv_id;
      createDropdown(convElement);
      conversationsList.appendChild(convElement);
      constructConversation(convElement, conv.name);
      applyRemainingMode();
    });
    // Remove the "Load More" button
    const loadMore = document.querySelector('.load-more');
    loadMore.remove();
    // Create a new "Load More" button
    const newLoadMore = document.createElement('button');
    newLoadMore.classList.add('classicbutton');
    newLoadMore.classList.add('load-more');
    newLoadMore.innerHTML = 'Load More';
    newLoadMore.addEventListener('click', function() {
      loadMoreConversations();
    });
    conversationsList.appendChild(newLoadMore);
    unlockChats();
  })
  .catch(error => {
    console.error('Error:', error);
    unlockChats();
  });
}


function createDropdown(conversation) {
  // we'll create a button BUT it'll use an invisible select element
  // the select element will have all the options

  // create the select element
  var moreButton = document.createElement('button');
  moreButton.classList.add('more');
  moreButton.classList.add('conv-control');
  moreButton.innerHTML = '···';
  var dropdown = document.createElement('div');
  dropdown.classList.add('dropdown');
  dropdown.id = `dropdown-${conversation.conv_id}`
  var deleteButton = document.createElement('div');
  deleteButton.classList.add('delete');
  deleteButton.classList.add('conv-control-child');
  deleteButton.innerHTML = 'Delete';
  deleteButton.value = 'delete';
  var editButton = document.createElement('div');
  editButton.classList.add('edit-conv');
  editButton.classList.add('conv-control-child');
  editButton.innerHTML = 'Rename';
  editButton.value = 'edit-conv';
  var exportButton = document.createElement('div');
  exportButton.classList.add('export');
  exportButton.classList.add('conv-control-child');
  exportButton.innerHTML = 'Export';
  exportButton.value = 'export';
  var duplicateButton = document.createElement('div');
  duplicateButton.classList.add('duplicate');
  duplicateButton.classList.add('conv-control-child');
  duplicateButton.innerHTML = 'Duplicate';
  duplicateButton.value = 'duplicate';
  var optionlist = [];
  optionlist.push(deleteButton);
  optionlist.push(editButton);
  optionlist.push(exportButton);
  optionlist.push(duplicateButton);

  // add event listeners
  moreButton.addEventListener('click', function(event) {
    /* hide all other dropdowns */
    var dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach((dropdown) => {
      if (dropdown.id !== `dropdown-${conversation.conv_id}`) {
        dropdown.style.display = 'none';
      }
    });
    event.stopPropagation();
    dropdown.style.display = 'block';
    applyRemainingMode();

  });

  document.addEventListener('click', function(event) {
    if (event.target !== moreButton) {
      dropdown.style.display = 'none';
    }
  });

  dropdown.addEventListener('change', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.getAttribute('value') === 'delete') {
      // ask for confirmation
      if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
      }
      // Delete the conversation
      lockChats();
      fetch('/delete_conv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conv_id: conversation.conv_id,
          token: oauth2Token,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          unlockChats();
          return;
        }
        if (convId === conversation.conv_id) {
          chatBox.innerHTML = '';
          chatHistory = [];
          convId = null;
          statusText.innerHTML = 'New conversation';
        }
        // Remove the conversation element
        conversation.remove();
        unlockChats();
      })
      .catch(error => console.error('Error:', error));
    } else if (event.target.getAttribute('value') === 'edit-conv') {
      // Edit the conversation name
      var newName = prompt('Enter the new name for the conversation:');
      if (newName === null) {
        return;
      }
      lockChats();
      fetch('/rename_conv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conv_id: conversation.conv_id,
          new_name: newName,
          token: oauth2Token,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          unlockChats();
          return;
        }
        conversation.querySelector('#name').innerHTML = fixName(newName);
        conversation.setAttribute('conv_name', newName);
        unlockChats();
      })
      .catch(error => console.error('Error:', error));
    } else if (event.target.getAttribute('value') === 'export') {
      // Export the conversation
      exportConversation(conversation.conv_id);
    } else if (event.target.getAttribute('value') === 'duplicate') {
      // Duplicate the conversation
      duplicateConversation(conversation.conv_id);
    }
  });

  for (var i = 0; i < optionlist.length; i++) {
    optionlist[i].addEventListener('click', function(event) {
      // dropdowns
      const dropdowns = document.querySelectorAll('.dropdown');
      dropdowns.forEach((dropdown) => {
        dropdown.style.display = 'none';
      });
      event.stopPropagation();
      dropdown.setAttribute('value', event.target.value);
      dropdown.dispatchEvent(new Event('change'));
    });
    dropdown.appendChild(optionlist[i]);
  }


  moreButton.appendChild(dropdown);
  conversation.appendChild(moreButton);
}

function exportConversation(convId) {
  lockChats();
  fetch('/export_conv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conv_id: convId,
      token: oauth2Token,
    }),
  })
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `conversation_${convId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    unlockChats();
  })
  .catch(error => {
    console.error('Error:', error);
    openErrorModal(errorModal, 'Error exporting conversation: ' + error);
    unlockChats();
  });
}

function openSettings() {
  settingsModal.style.display = 'flex';
}

function setTokens(tokens) {
  const tokenAmount = document.querySelector('.token-amount');
  tokenAmount.innerHTML = tokens + ' AIDA Tokens';
}

function turnIntoDropdown(element) {
  // doesnt assign any new classes, just adds an event listener that opens a dropdown
  // when the button is clicked
  const dropdown = document.createElement('div');
  dropdown.classList.add('dropdown');
  dropdown.classList.add('movethehellup');
  dropdown.style.display = 'none';
  // add options
  var settingsButton = document.createElement('div');
  settingsButton.classList.add('settings');
  settingsButton.classList.add('conv-control-child');
  settingsButton.innerHTML = 'Settings';
  settingsButton.value = 'settings';
  var logoutButton = document.createElement('div');
  logoutButton.classList.add('logout');
  logoutButton.classList.add('conv-control-child');
  logoutButton.innerHTML = 'Log out';
  logoutButton.value = 'logout';
  var tokenAmount = document.createElement('div');
  tokenAmount.classList.add('token-amount');
  tokenAmount.classList.add('conv-control-child');
  tokenAmount.innerHTML = '0 AIDA Tokens';
  tokenAmount.value = 'tokens';
  var switchMode = document.createElement('div');
  switchMode.classList.add('switch-mode');
  switchMode.classList.add('conv-control-child');
  switchMode.innerHTML = 'Toggle Light Mode';
  switchMode.value = 'switch-mode';
  var getHelp = document.createElement('div');
  getHelp.classList.add('get-help');
  getHelp.classList.add('conv-control-child');
  getHelp.innerHTML = 'Get Help';
  getHelp.value = 'get-help';
  var privacyPolicy = document.createElement('div');
  privacyPolicy.classList.add('privacy-policy');
  privacyPolicy.classList.add('conv-control-child');
  privacyPolicy.innerHTML = 'Privacy Policy';
  privacyPolicy.value = 'privacy-policy';
  var termsOfService = document.createElement('div');
  termsOfService.classList.add('terms-of-service');
  termsOfService.classList.add('conv-control-child');
  termsOfService.innerHTML = 'Terms of Service';
  termsOfService.value = 'terms-of-service';
  var optionlist = [];
  optionlist.push(settingsButton);
  optionlist.push(logoutButton);
  optionlist.push(tokenAmount);
  optionlist.push(switchMode);
  optionlist.push(getHelp);
  optionlist.push(privacyPolicy);
  optionlist.push(termsOfService);
  element.appendChild(dropdown);
  element.addEventListener('click', function(event) {
    event.stopPropagation();
    dropdown.style.display = 'block';
    applyRemainingMode();
  });
  document.addEventListener('click', function(event) {
    if (event.target !== element) {
      dropdown.style.display = 'none';
    }
  });

  fetch('/get_tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({token: oauth2Token,}),
  }).then(response => response.json())
  .then(data => {
    console.log('Tokens:', data);
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      return;
    }
    tokenAmount.innerHTML = data.tokens + ' AIDA Tokens';
  })

  dropdown.addEventListener('change', function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.getAttribute('value') === 'logout') {
      // Log out the user
      fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({token: oauth2Token,}),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          return;
        }
        localStorage.removeItem('OAUTH2_TOKEN');
        window.location.href = '/auth/discord';
      })
      .catch(error => console.error('Error:', error));
    } else if (event.target.getAttribute('value') === 'settings') {
      loadConfig();
      openSettings();
    } else if (event.target.getAttribute('value') === 'tokens') {
      fetch('gotomytokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({token: oauth2Token,}),
      }).then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          return;
        }
        url = data.url
        window.location.href = url;
      });
    } else if (event.target.getAttribute('value') === 'switch-mode') {
      // Get all elements on the page
      const elements = document.querySelectorAll('*');
      // Toggle the dark mode class
      elements.forEach((element) => {
        element.classList.toggle('darkmode');
      });
      darkmodeOn = !darkmodeOn;
      localStorage.setItem('darkmode', darkmodeOn);
    } else if (event.target.getAttribute('value') === 'get-help') {
      window.location.href = '/help';
    } else if (event.target.getAttribute('value') === 'privacy-policy') {
      window.location.href = '/privacy';
    } else if (event.target.getAttribute('value') === 'terms-of-service') {
      window.location.href = '/terms';
    }
  });
  for (var i = 0; i < optionlist.length; i++) {
    optionlist[i].addEventListener('click', function(event) {
      // dropdowns
      const dropdowns = document.querySelectorAll('.dropdown');
      dropdowns.forEach((dropdown) => {
        dropdown.style.display = 'none';
      });
      event.stopPropagation();
      dropdown.setAttribute('value', event.target.value);
      dropdown.dispatchEvent(new Event('change'));
    });
    dropdown.appendChild(optionlist[i]);
  }
}

function duplicateConversation(convId) {
  lockChats();
  fetch('/duplicate_conv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conv_id: convId,
      token: oauth2Token,
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      openErrorModal(errorModal, 'Error: ' + data.error);
      unlockChats();
      return;
    }
    
    // Create a new conversation element for the duplicated conversation
    const convElement = document.createElement('button');
    convElement.classList.add('conversation');
    const p = document.createElement('p');
    p.id = 'name';
    convElement.appendChild(p);
    convElement.querySelector('#name').innerHTML = fixName(data.new_name);
    convElement.conv_id = data.new_conv_id;
    createDropdown(convElement);
    conversationsList.prepend(convElement);
    constructConversation(convElement, data.new_name);
    applyRemainingMode();

    unlockChats();
  })
  .catch(error => {
    console.error('Error:', error);
    openErrorModal(errorModal, 'Error duplicating conversation: ' + error);
    unlockChats();
  });
}

function loadDarkMode() {
  // Load the dark mode setting from local storage
  darkmodeOn = localStorage.getItem('darkmode') === 'true';
  if (darkmodeOn) {
    // Apply dark mode to all elements
    applyRemainingMode();
  }
}

loadDarkMode();

function applyRemainingMode() {
  const elements = document.querySelectorAll('*');
  elements.forEach((element) => {
    if (darkmodeOn && !element.classList.contains('darkmode')) {
      element.classList.add('darkmode');
    }
  });
}
verify();  // Verify that the user has joined the server