from flask import Flask, request, jsonify, render_template, redirect
import cohere
import dotenv
import os

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
    chat_history = data['chat_history'] # must be a list of dicts that look like this: [{"role": "USER", "message": "..."}, {"role": "ASSISTANT", "message": "..."}]
    
    response = client.chat(message=message, 
                                  chat_history=chat_history,
                                  temperature=0.5, max_tokens=150)
    response = response.text
    
    return jsonify({'responses': response})

if __name__ == '__main__':
    app.run(debug=False)
