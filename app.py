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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data['message']
    chat_history = data['chat_history']
    print(chat_history)
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

if __name__ == '__main__':
    app.run(debug=False)
