const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const newConvButton = document.getElementById('new-conv-button');
const sendButton = document.getElementById('send-button');
const username = document.getElementById('user_name');
const userAvatar = document.getElementById('user_avatar');
let chatHistory = [];  // Retrieve chat history from server
let convId = null;  // Conversation ID
// If there is a Discord access token in the URL, save it in local storage as OAUTH2_TOKEN
const urlParams = new URLSearchParams(window.location.hash.substr(1));
const discordToken = urlParams.get('access_token');
if (discordToken) {
  localStorage.setItem('OAUTH2_TOKEN', discordToken);
}
console.log('Discord token:', discordToken);

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
  fetch('/new_conv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({token: oauth2Token,}),  // Send the Discord token to the server
  })
  .then(response => response.json())
  .then(data => {
    convId = data.conv_id;
    chatBox.innerHTML = '';
    chatHistory = [];
  })
  .catch(error => console.error('Error:', error));
});

newConvButton.click();

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

function postMessage(message) {
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
    const rawResponse = data.raw_response;
    const htmlResponse = data.html_response;
    chatHistory = data.chat_history;  // Update chat history from server
    console.log('Chat history:', chatHistory);
    chatBox.innerHTML += '<div>User: ' + message + '</div>';
    chatBox.innerHTML += '<div>Assistant: ' + htmlResponse + '</div>';
    chatBox.scrollTop = chatBox.scrollHeight;
  })
  .catch(error => console.error('Error:', error));
}

function verify() {
  fetch('/joined_server', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({authtoken: oauth2Token,}),
  }).then(response => response.json())
  .then(data => {
    if (data.joined === false) {
      window.location.href = '/join';
    } else {
      console.log('User has joined the server');
    }
  })
  .catch(error => console.error('Error:', error));
}

verify();  // Verify that the user has joined the server