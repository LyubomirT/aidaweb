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

settingsModalClose.addEventListener('click', function() {
  closeModal(settingsModal);
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
});

chatInput.addEventListener('keydown', function(e) {
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

function edit(id) {
  // Get the message from the chat history and open the edit modal
  const item = getItem(id);
  console.log(item);
  if (item === undefined) {
    return;
  }
  openEditModal(editModal, item.message);
}


function constructMessage(message, rawmsg, role) {  
  // Remove all regen and edit buttons
  const regen = document.querySelectorAll('.regen');
  const edit = document.querySelectorAll('.edit');
  if (role==="ASSISTANT") {
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
  if (role === "USER") {
    imgsrc = userAvatar.src;
    var _username = username.innerHTML;
    message.textToEdit = rawmsg;
    regenstring = `
    <div class="msgcontrol edit" onclick="edit(${id})">
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
  if (role === "USER") {
    message = message.replace(/(?:\r\n|\r|\n)/g, '<br>');
    message = message.replace('<br><br>', '<br>');
    // I don't know why this bug happens, but it does, so...
  } else if (role === "ASSISTANT") {
    // We need to replace $something$ with $$something$$ for MathJax to render it
    // In both the raw message and the HTML message
    // something can be any string of characters
    var re = /\$([^\$]+)\$/g;
    //message = message.replace(re, '$$$$$1$$$$');
    //rawmsg = rawmsg.replace(re, '$$$$$1$$$$');
    
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
  console.log('chat history:', chatHistory)
  if (id === null) {
    return;
  } else if (id==0) {
    return chatHistory[0];
  }
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

function fixName(name) {
  // Replace all other symbols that come after the symbol 20 with ...
  if (name.length > 26) {
    name = name.substring(0, 25) + '...';
  }
  // BETTER WAY TO DO THIS IS TO REPLACE IT BY WORDS INSTEAD OF CHARACTERS (LIKE EVERY WORD AFTER OR IN THE 20TH CHARACTER)
  // EXCEPTION: IF ONE WORD, THEN BY CHARACTERS
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
    response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
    response.raw = rawResponse;
    chatBox.innerHTML += response;
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
  newConvButton.disabled = true;
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
}

function unlockChats() {
  newConvButton.disabled = false;
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
      children = convElement.children;
      for (var i = 0; i < children.length; i++) {
        children[i].disabled = true;
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
        const rawResponse = data.raw_response;
        const htmlResponse = data.html_response;
        chatHistory = data.chat_history;  // Update chat history from server
        // assign each message an id
        for (var i = 0; i < chatHistory.length; i++) {
          chatHistory[i].id = i;
        }
        console.log('Chat history:', chatHistory);
        response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
        response.raw = rawResponse;
        chatBox.innerHTML += response;
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
            // Do nothing
          } else {
            normalName = data.title;
            normalName = fixName(normalName);
            convElement.querySelector('#name').innerHTML = normalName;
            console.warn("Name changed to " + normalName);
            convElement.setAttribute('conv_name', normalName);
            LconvName = data.title;
            statusText.innerHTML = LconvName + ` (${convId})`;
          }
        })
        .catch(error => console.error('Error:', error));
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
        newConvButton.disabled = false;
        // Remove the last message (user message) if there is an error
        deleteLast();
        unlockChats();
        return;
      }
      const rawResponse = data.raw_response;
      const htmlResponse = data.html_response;
      chatHistory = data.chat_history;  // Update chat history from server
      // assign each message an id
      for (var i = 0; i < chatHistory.length; i++) {
        chatHistory[i].id = i;
      }
      console.log('Chat history:', chatHistory);
      response = constructMessage(htmlResponse, rawResponse, 'ASSISTANT');
      response.raw = rawResponse;
      chatBox.innerHTML += response;
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

function constructConversation(conv, name=null) {
  // On click, get the conversation history from the server and display it in the chat box
  conv.setAttribute('conv_name', name);
  conv.setAttribute('conv_id', conv.conv_id);
  conv.addEventListener('click', function() {
    statusText.innerHTML = conv.getAttribute('conv_name') + ` (${conv.conv_id})` || 'Conversation (?)';
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
      if (data.error) {
        openErrorModal(errorModal, 'Error: ' + data.error);
        return;
      }
      const chatHistory = data.chat_history_html;
      // assign each message an id
      for (var i = 0; i < chatHistory.length; i++) {
        chatHistory[i].id = i;
      }
      chatHistory.slice(0, -2).forEach(message => {
        if (message.role === 'USER') {
          chatBox.innerHTML += constructMessage(message.message, message, 'USER');
        } else {
          chatBox.innerHTML += constructMessage(message.message, message, 'ASSISTANT');
        }
      });
      // Remove all regen and edit buttons
      const regen = document.querySelectorAll('.regen');
      const edit = document.querySelectorAll('.edit');
      regen.forEach((element) => {
        element.remove();
      });
      edit.forEach((element) => {
        element.remove();
      });
      // Append the last two messages
      const lastTwo = chatHistory.slice(-2);
      lastTwo.forEach(message => {
        if (message.role === 'USER') {
          chatBox.innerHTML += constructMessage(message.message, message, 'USER');
        } else {
          chatBox.innerHTML += constructMessage(message.message, message, 'ASSISTANT');
        }
      });
      MathJax.typeset();
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
    });
  })
  .catch(error => console.error('Error:', error));
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
  var uselessButton = document.createElement('div');
  uselessButton.classList.add('useless');
  uselessButton.classList.add('conv-control-child');
  uselessButton.innerHTML = 'Useless';
  var editButton = document.createElement('div');
  editButton.classList.add('edit-conv');
  editButton.classList.add('conv-control-child');
  editButton.innerHTML = 'Rename';
  editButton.value = 'edit-conv';
  var optionlist = [];
  optionlist.push(deleteButton);
  optionlist.push(uselessButton);
  optionlist.push(editButton);

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

function openSettings() {
  settingsModal.style.display = 'block';
}

function turnIntoDropdown(element) {
  // doesnt assign any new classes, just adds an event listener that opens a dropdown
  // when the button is clicked
  const dropdown = document.createElement('div');
  dropdown.classList.add('dropdown');
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
  var optionlist = [];
  optionlist.push(settingsButton);
  optionlist.push(logoutButton);
  element.appendChild(dropdown);
  element.addEventListener('click', function(event) {
    event.stopPropagation();
    dropdown.style.display = 'block';
  });
  document.addEventListener('click', function(event) {
    if (event.target !== element) {
      dropdown.style.display = 'none';
    }
  });

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
      openSettings();
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
verify();  // Verify that the user has joined the server