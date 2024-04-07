from flask import Flask, request, jsonify, render_template, redirect
import cohere
import markdown2  # for converting markdown to HTML
import dotenv
import os
import random   # for randomizing id for characters

# Load the environment variables from the .env file
dotenv.load_dotenv()

# Create a new Cohere client
client = cohere.Client(os.getenv("CKEY"))

app = Flask(__name__)

# Dictionary to store conversations
conversations = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new_conv', methods=['POST'])
def new_conv():
    # Generate a new conversation ID
    conv_id = str(random.randint(100000, 999999))
    # Initialize the conversation in the dictionary
    conversations[conv_id] = []
    return jsonify({'conv_id': conv_id})

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data['message']
    conv_id = data['conv_id']
    chat_history = conversations[conv_id]
    chat_history.append({"role": "USER", "message": message})  # Add user message to history

    # Send the updated chat history
    response = client.chat(message=message, 
                            chat_history=chat_history,
                            temperature=0.5, max_tokens=150)
    response = response.text
    chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history
    
    # Convert markdown response to HTML
    html_response = markdown2.markdown(response, extras=["tables"])

    return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})

@app.route('/auth/discord')
def auth_discord():
    return render_template('login.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
