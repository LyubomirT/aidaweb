from flask import Flask, request, jsonify, render_template, redirect, make_response
import cohere
import markdown2  # for converting markdown to HTML
import dotenv
import os
import random   # for randomizing id for characters
import requests
import time
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Load the environment variables from the .env file
dotenv.load_dotenv()

# Create a new Cohere client
client = cohere.Client(os.getenv("CKEY"))

app = Flask(__name__)
limiter = Limiter(get_remote_address, app=app, storage_uri='memory://')

# Dictionary to store conversations
conversations = {}
progresses = {}
savedtokens = {}
convnames = {}
bans = {}
reqonroute = {}
reqonroute_id = {}
lastreqroute = {}
lastreqroute_id = {}
ipban = {}

# reqonroute is a dictionary that stores the number of requests on a route for the user IP
# reqonroute_id is a dictionary that stores the number of requests on a route for the user ID
# lastreqroute is a dictionary that stores the time of the last request on a route for the user IP
# lastreqroute_id is a dictionary that stores the time of the last request on a route for the user ID
# bans is a dictionary that stores the IDs that are banned

def check_ban(id):
    if id in bans:
        return True
    return False

def reqonroute_inc(ip, id, route):
    if ip not in reqonroute:
        reqonroute[ip] = {}
    if id not in reqonroute_id:
        reqonroute_id[id] = {}
    if route not in reqonroute[ip]:
        reqonroute[ip][route] = 0
    if route not in reqonroute_id[id]:
        reqonroute_id[id][route] = 0
    reqonroute[ip][route] += 1
    reqonroute_id[id][route] += 1

def lastreqroute_set(ip, id, route):
    if ip not in lastreqroute:
        lastreqroute[ip] = {}
    if id not in lastreqroute_id:
        lastreqroute_id[id] = {}
    lastreqroute[ip][route] = time.time()
    lastreqroute_id[id][route] = time.time()

def lastreqroute_get(ip, id, route):
    if ip not in lastreqroute:
        return 0
    if route not in lastreqroute[ip]:
        return 0
    if id not in lastreqroute_id:
        return 0
    if route not in lastreqroute_id[id]:
        return 0
    return lastreqroute[ip][route], lastreqroute_id[id][route]

def reqonroute_get(ip, id, route):
    if ip not in reqonroute:
        return 0
    if route not in reqonroute[ip]:
        return 0
    if id not in reqonroute_id:
        return 0
    if route not in reqonroute_id[id]:
        return 0
    return reqonroute[ip][route], reqonroute_id[id][route]

def shouldbebanned(ip, id, route, limit, timeperiod):
    reqonroute_inc(ip, id, route)
    lastreqroute_set(ip, id, route)
    req, req_id = reqonroute_get(ip, id, route)
    lastreq, lastreq_id = lastreqroute_get(ip, id, route)
    if req > limit and time.time() - lastreq < timeperiod:
        return True
    if req_id > limit and time.time() - lastreq_id < timeperiod:
        return True
    return False

def ban(id):
    bans[id] = True

def unban(id):
    if id in bans:
        del bans[id]
    
def ipban_(ip):
    ipban[ip] = True

def ipunban(ip):
    if ip in ipban:
        del ipban[ip]

# data structure for savedtokens
# {"id": {"token": "token", "expiry": "expiry_time"}}

TOKEN_EXPIRY_TIME = 4 * 3600  # Token expiry time in seconds (4 hours)

@app.before_request
def limit_remote_addr():
    ip = get_remote_address()
    if ip in ipban:
        return render_template('banned.html'), 403
    


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/new_conv', methods=['POST'])
@limiter.limit("5/2minute")
def new_conv():
    data_json = request.json
    token = data_json['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    # Generate a new conversation ID
    conv_id = random.randint(100000, 999999)
    # Initialize the conversation in the dictionary
    if userid not in conversations:
        conversations[userid] = {}
    if userid not in convnames:
        convnames[userid] = {}
    conversations[userid][conv_id] = []
    # DEBUG: GENERATE RANDOM STRING FOR CONVERSATION NAME
    convnames[userid][conv_id] = "Conversation " + str(random.randint(1000, 9999))
    # DELETE THAT WHEN WE HAVE A WAY TO NAME CONVERSATIONS
    return jsonify({'conv_id': conv_id, 'name': convnames[userid][conv_id]})

@app.errorhandler(429)
def handle_too_many_requests(error):
  # You can customize the message here
  message = "You've exceeded the request limit, please try again later."
  return make_response(jsonify({"error": message}), 429)

config = {
    "temperature": 0.5,
    "max_tokens": 400
}


@app.route('/chat', methods=['POST'])
@limiter.limit("100/hour")
def chat():
    data = request.json
    message = data['message']
    conv_id = data['conv_id']
    conv_id = int(conv_id)
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    if message.strip() == "":
        return jsonify({'error': 'Message cannot be empty.'}), 400
    progresses[userid] = True
    try:
        chat_history = conversations[userid][conv_id]
    except:
        progresses[userid] = False
        return jsonify({'error': 'Conversation not found.'}), 404
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
@limiter.limit("100/hour")
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

@app.route('/textmanager/to_html', methods=['POST'])
def to_html():
    data = request.json
    text = data['text']
    html = markdown2.markdown(text, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
    return jsonify({'html': html})

@app.route('/chatmanager/get_history', methods=['POST'])
def get_history():
    data = request.json
    conv_id = data['conv_id']
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    chat_history = conversations[userid][conv_id]
    return jsonify({'chat_history': chat_history})


# this route edits the last user message and regenerates the last AI response that goes after it
@app.route('/edit', methods=['POST'])
@limiter.limit("100/hour")
def edit():
    data = request.json
    new_message = data['new_message']
    conv_id = data['conv_id']
    token = data['token']
    userid = get_user_id(token)
    chat_history = conversations[userid][conv_id]
    if userid in progresses and progresses[userid]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    if new_message.strip() == "":
        return jsonify({'error': 'Message cannot be empty.'}), 400
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
@limiter.limit("5/10minute")
def joined_server():
    data = request.json
    if 'authtoken' not in data:
        return jsonify({'joined': False})
    authtoken = data['authtoken']
    serverid = '1079761115636043926'
    g1 = requests.get(f"https://discord.com/api/users/@me/guilds", headers={"Authorization": f"Bearer {authtoken}"})
    g1 = g1.json()
    g2 = requests.get(f"https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {authtoken}"})
    g2 = g2.json()
    for i in g1:
        if i['id'] == serverid:
            savedtokens[authtoken] = {'id': None, 'expiry': None}
            if authtoken not in savedtokens:
                savedtokens[authtoken] = {'id': None, 'expiry': None}
            savedtokens[authtoken]['expiry'] = time.time() + TOKEN_EXPIRY_TIME
            savedtokens[authtoken]['id'] = int(g2['id'])
            if data.get('give_convs', True):
                userid = savedtokens[authtoken]['id']
                # get all conversations associated with the user
                try:
                    user_convs = [{'conv_id': conv_id, 'name': convnames[userid][conv_id]} for conv_id in conversations[userid]]
                    print(user_convs)
                except:
                    user_convs = []
                return jsonify({'joined': True, 'conversations': user_convs})
            return jsonify({'joined': True})


@app.route('/get_convs', methods=['POST'])
@limiter.limit("5/5minute")
def get_convs():
    data = request.json
    token = data['token']
    if not check_join(token):
        return redirect('/join')
    userid = get_user_id(token)
    # get all conversations associated with the user
    try:
        user_convs = [{'conv_id': conv_id, 'name': convnames[userid][conv_id]} for conv_id in conversations[userid]]
    except:
        user_convs = []
    return jsonify({'conversations': user_convs})


@app.route('/get_conv', methods=['POST'])
@limiter.limit("10/minute")
def get_conv():
    data = request.json
    conv_id = data['conv_id']
    token = data['token']
    id = get_user_id(token)
    chat_history = conversations[id][conv_id]
    name = convnames[id][conv_id]
    chat_history_html = []
    if id in progresses and progresses[id]:
        return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
    for message in chat_history:
        if message['role'] == 'ASSISTANT':
            chat_history_html.append({'role': 'ASSISTANT', 'message': markdown2.markdown(message['message'], extras=["tables", "fenced-code-blocks", "spoiler", "strike"])})
        else:
            chat_history_html.append({'role': 'USER', 'message': message['message']})
    return jsonify({'chat_history': chat_history, 'chat_history_html': chat_history_html, 'name': name})


@app.route('/auth/discord')
def auth_discord():
    return render_template('login.html')


@app.route('/join')
def join():
    return render_template('jointos.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
