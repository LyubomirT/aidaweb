const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const newConvButton = document.getElementById('new-conv-button');
const sendButton = document.getElementById('send-button');
const username = document.getElementById('user_name');
const userAvatar = document.getElementById('user_avatar');
const errorModal = document.getElementById('errorModal');
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

errorModalClose.addEventListener('click', function() {
  closeModal(errorModal);
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
    username.innerHTML = data.username;
    userAvatar.src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;
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
  newConvButton.disabled = true;
  chatBox.innerHTML = '';
  chatHistory = [];
  convId = null;
});

chatInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

sendButton.addEventListener('click', function() {
  sendMessage();
});

function sendMessage() {
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

  var lastUsr = null;
  var lastAsst = null;
  var tmp_ch = null;

  // Save the last two messages (edited message and assistant response)
  const messages = document.querySelectorAll('.messagecontainer');
  lastUsr = messages[messages.length - 2].querySelector('.USER.message').textContent;
  lastAsst = messages[messages.length - 1].querySelector('.ASSISTANT.message').textContent;

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
      chatBox.innerHTML += constructMessage(lastUsr, 'USER');
      chatBox.innerHTML += constructMessage(lastAsst, 'ASSISTANT');
      unlockChats();
      return;
    }
    const rawResponse = data.raw_response;
    const htmlResponse = data.html_response;
    chatHistory = data.chat_history;  // Update chat history from server
    console.log('Chat history:', chatHistory);
    // Append the edited message and the assistant response
    chatBox.innerHTML += constructMessage(editedMessage, editedMessage, 'USER');
    response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
    response.raw = rawResponse;
    chatBox.innerHTML += response;
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
    chatBox.innerHTML += constructMessage(lastUsr, 'USER');
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
    chatBox.innerHTML += constructMessage(lastAsst, 'ASSISTANT');
    unlockChats();
  });
}

document.getElementById('edit-modal-close').addEventListener('click', function() {
  closeModal(document.getElementById('editModal'));
});


function constructMessage(message, rawmsg, role) {  
  var regenstring;
  if (role === "USER") {
    imgsrc = userAvatar.src;
    var _username = username.innerHTML;
    regenstring = `
    <div class="msgcontrol edit" onclick="openEditModal(editModal, '${message}')">
    <i class="fi fi-rr-edit"></i>
    </div>
    `;
  } else {
    const assistanthidden = document.getElementById('assistant-hidden');
    imgsrc = assistanthidden.src;
    var _username = "Assistant"
    // get the svg from the file at regenlink
    var svg = document.createElement('div');
    regenstring = `<div class="msgcontrol regen" onclick="regenerate()">
    <i class="fi fi-rr-refresh"></i>
    </div>`;
  }
  console.log(rawmsg);
  if (rawmsg.message !== undefined) {
    rawmsg = rawmsg.message;
  } else {
    rawmsg = rawmsg;
  }
  // Find ID by calculating its position in the chat history
  if (chatHistory.length > 0) {
    var id = chatHistory.length;
  } else {
    var id = 0;
  }

  chatHistory.push({id: id, message: rawmsg, role: role});

  return `
  <div class="messagecontainer">
    <div class="infocontainer">
      <img class="msg-avatar" src="${imgsrc}" alt="${role} avatar">
      <div class="${role} username">${_username}</div>
    </div>
    <div class="${role} message">${message}</div>
    <div class="msgcontrols">
      ${regenstring}
      <div class="msgcontrol copy" onclick="copy_(${id})">
      <i class="fi fi-rr-copy"></i>
      </div>
    </div>
  </div>
  `;
}

function getItem(id) {
  // Get from chat history
  for (var i = 0; i < chatHistory.length; i++) {
    if (chatHistory[i].id === id) {
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
    console.log('Chat history:', chatHistory);
    response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
    response.raw = rawResponse;
    chatBox.innerHTML += response;
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
  // Lock all conversations
  const conversations = document.querySelectorAll('.conversation');
  conversations.forEach((conv) => {
    console.warn("Locked" + conv.innerHTML);
    conv.disabled = true;
  });
}

function unlockChats() {
  // Unlock all conversations
  const conversations = document.querySelectorAll('.conversation');
  conversations.forEach((conv) => {
    conv.disabled = false;
  });
}

function postMessage(message) {

  chatInput.disabled = true;
  sendButton.disabled = true;
  // Create a preview of the message
  chatBox.innerHTML += constructMessage(message, message, 'USER');

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
        unlockChats();
        return;
      }
      convId = data.conv_id;
      var LconvName = data.name;
      // Create a new conversation element and add it to the TOP of the conversations list
      const convElement = document.createElement('button');
      convElement.classList.add('conversation');
      convElement.innerHTML = LconvName;
      convElement.conv_id = convId;
      convElement.disabled = true;
      conversationsList.prepend(convElement);
      constructConversation(convElement);
      newConvButton.disabled = false;

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
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          openErrorModal(errorModal, 'Error: ' + data.error);
          chatInput.disabled = false;
          sendButton.disabled = false;
          // Remove the last message (user message) if there is an error
          deleteLast();
          unlockChats();
          return;
        }
        const rawResponse = data.raw_response;
        const htmlResponse = data.html_response;
        chatHistory = data.chat_history;  // Update chat history from server
        console.log('Chat history:', chatHistory);
        response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
        response.raw = rawResponse;
        chatBox.innerHTML += response;
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
      unlockChats();
      return;
    });
  } else {
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
      }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        openErrorModal(errorModal, 'Error: ' + data.error);
        chatInput.disabled = false;
        sendButton.disabled = false;
        // Remove the last message (user message) if there is an error
        deleteLast();
        unlockChats();
        return;
      }
      const rawResponse = data.raw_response;
      const htmlResponse = data.html_response;
      chatHistory = data.chat_history;  // Update chat history from server
      console.log('Chat history:', chatHistory);
      response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
      response.raw = rawResponse;
      chatBox.innerHTML += response;
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
      // Remove the last message (user message) if there is an error
      deleteLast();

      unlockChats();
    });
  }
}

function constructConversation(conv) {
 // On click, get the conversation history from the server and display it in the chat box
  conv.addEventListener('click', function() {
    chatBox.innerHTML = '';
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
      const chatHistory = data.chat_history_html;
      chatHistory.forEach(message => {
        if (message.role === 'USER') {
          chatBox.innerHTML += constructMessage(message.message, message, 'USER');
        } else {
          chatBox.innerHTML += constructMessage(message.message, message, 'ASSISTANT');
        }
      });
      hljs.highlightAll();
      chatBox.scrollTop = chatBox.scrollHeight;

      // Enable the chat input and send button
      chatInput.disabled = false;
      sendButton.disabled = false;

      // Set the conversation ID
      convId = conv.conv_id;
    }).catch(error => console.error('Error:', error));
  });
}

function verify() {
  fetch('/joined_server', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({authtoken: oauth2Token, give_convs: true,}),
  }).then(response => response.json())
  .then(data => {
    if (data.joined === false) {
      window.location.href = '/join';
    } else {
      console.log('User has joined the server');
    }
    // Create conversation elements for each conversation
    data.conversations.forEach(conv => {
      const convElement = document.createElement('button');
      convElement.classList.add('conversation');
      convElement.innerHTML = conv.name;
      convElement.conv_id = conv.conv_id;
      conversationsList.appendChild(convElement);
      constructConversation(convElement);
    });
  })
  .catch(error => console.error('Error:', error));
}

verify();  // Verify that the user has joined the server