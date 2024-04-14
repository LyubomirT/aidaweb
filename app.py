from flask import Flask, request, jsonify, render_template, redirect
import cohere
import markdown2  # for converting markdown to HTML
import dotenv
import os
import random   # for randomizing id for characters
import requests
import time

# Load the environment variables from the .env file
dotenv.load_dotenv()

# Create a new Cohere client
client = cohere.Client(os.getenv("CKEY"))

app = Flask(__name__)

# Dictionary to store conversations
conversations = {}
progresses = {}
savedtokens = {}
convnames = {}
# data structure for savedtokens
# {"id": {"token": "token", "expiry": "expiry_time"}}

TOKEN_EXPIRY_TIME = 4 * 3600  # Token expiry time in seconds (4 hours)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/new_conv', methods=['POST'])
def new_conv():
    data_json = request.json
    token = data_json['token']
    if not check_join(token):
        return redirect('/join')
    g1 = requests.get(f"https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {token}"})
    g1 = g1.json()
    # get the id of the user
    userid = int(g1['id'])
    # Generate a new conversation ID
    conv_id = str(random.randint(100000, 999999))
    # Initialize the conversation in the dictionary
    if userid not in conversations:
        conversations[userid] = {}
    if userid not in convnames:
        convnames[userid] = {}
    conversations[userid][conv_id] = []
    # DEBUG: GENERATE RANDOM STRING FOR CONVERSATION NAME
    convnames[userid][conv_id] = "Conversation " + str(random.randint(1000, 9999))
    # DELETE THAT WHEN WE HAVE A WAY TO NAME CONVERSATIONS
    return jsonify({'conv_id': conv_id})


config = {
    "temperature": 0.5,
    "max_tokens": 400
}


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data['message']
    conv_id = data['conv_id']
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    progresses[userid] = True
    chat_history = conversations[userid][conv_id]
    chat_history.append({"role": "USER", "message": message})  # Add user message to history

    # Send the updated chat history
    response = client.chat(message=message,
                           chat_history=chat_history,
                           temperature=config['temperature'], max_tokens=config['max_tokens'])
    response = response.text
    chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

    # Convert markdown response to HTML
    html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
    progresses[userid] = False

    return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})


# this route regenerates (deletes and then generates) the last AI response
@app.route('/regen', methods=['POST'])
def regen():
    data = request.json
    conv_id = data['conv_id']
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    chat_history = conversations[userid][conv_id]
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    progresses[userid] = True
    chat_history.pop()  # Remove the last assistant response
    response = client.chat(message=chat_history[-1]['message'],
                           chat_history=chat_history[:-1],
                           temperature=config['temperature'], max_tokens=config['max_tokens'])
    response = response.text
    chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

    # Convert markdown response to HTML
    html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
    progresses[userid] = False

    return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})


# this route edits the last user message and regenerates the last AI response that goes after it
@app.route('/edit', methods=['POST'])
def edit():
    data = request.json
    new_message = data['new_message']
    conv_id = data['conv_id']
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    chat_history = conversations[userid][conv_id]
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    progresses[userid] = True
    chat_history[-2] = {"role": "USER", "message": new_message}
    response = client.chat(message=new_message,
                           chat_history=chat_history[:-1],
                           temperature=config['temperature'], max_tokens=config['max_tokens'])
    response = response.text
    chat_history.pop()
    chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

    # Convert markdown response to HTML
    html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
    progresses[userid] = False

    return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})


def check_join(token):
    g1 = requests.get(f"https://discord.com/api/users/@me/guilds", headers={"Authorization": f"Bearer {token}"})
    g1 = g1.json()
    serverid = '1079761115636043926'
    for i in g1:
        if i['id'] == serverid:
            return True
    return False


def get_user_id(token):
    if token in savedtokens and 'expiry' in savedtokens[token]:
        if savedtokens[token]['expiry'] > time.time():
            return savedtokens[token]['id']
    g1 = requests.get(f"https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {token}"})
    g1 = g1.json()
    # get the id of the user
    userid = int(g1['id'])
    savedtokens[token] = {'id': userid, 'expiry': time.time() + TOKEN_EXPIRY_TIME}
    return userid


@app.route('/joined_server', methods=['POST'])
def joined_server():
    data = request.json
    if 'authtoken' not in data:
        return jsonify({'joined': False})
    authtoken = data['authtoken']
    serverid = '1079761115636043926'
    g1 = requests.get(f"https://discord.com/api/users/@me/guilds", headers={"Authorization": f"Bearer {authtoken}"})
    g1 = g1.json()
    for i in g1:
        if i['id'] == serverid:
            if authtoken not in savedtokens:
                savedtokens[authtoken] = {'id': None, 'expiry': None}
            savedtokens[authtoken]['expiry'] = time.time() + TOKEN_EXPIRY_TIME
            return jsonify({'joined': True})


@app.route('/get_convs', methods=['POST'])
def get_convs():
    data = request.json
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    # get all conversations associated with the user
    user_convs = conversations[userid]
    return jsonify({'conversations': user_convs})


@app.route('/get_conv', methods=['POST'])
def get_conv():
    data = request.json
    conv_id = data['conv_id']
    chat_history = conversations[conv_id]
    return jsonify({'chat_history': chat_history})


@app.route('/auth/discord')
def auth_discord():
    return render_template('login.html')


@app.route('/join')
def join():
    return render_template('jointos.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
