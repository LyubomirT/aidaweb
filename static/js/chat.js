const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const newConvButton = document.getElementById('new-conv-button');
const sendButton = document.getElementById('send-button');
let chatHistory = [];  // Retrieve chat history from server
let convId = null;  // Conversation ID

newConvButton.addEventListener('click', function() {
  fetch('/new_conv', {
    method: 'POST',
  })
  .then(response => response.json())
  .then(data => {
    convId = data.conv_id;
    chatBox.innerHTML = '';
    chatHistory = [];
  })
  .catch(error => console.error('Error:', error));
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

function postMessage(message) {
  fetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      conv_id: convId,
      chat_history: chatHistory  // Send chat history to server
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
