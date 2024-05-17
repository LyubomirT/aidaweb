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
import json

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

lasttimewechecked = None

# data structure for savedtokens
# {"id": {"token": "token", "expiry": "expiry_time"}}

TOKEN_EXPIRY_TIME = 4 * 3600  # Token expiry time in seconds (4 hours)

@app.before_request
def limit_remote_addr():
    ip = get_remote_address()
    if ip in ipban:
        return render_template('banned.html'), 403
    
user_configs = {}

def save_user_config(id, config):
    user_configs[id] = config

def get_user_config(id):
    if id in user_configs:
        return user_configs[id]
    return None

def delete_user_config(id):
    if id in user_configs:
        del user_configs[id]

def store_user_config(id, config):
    with open(f"configs/{id}.json", "w") as f:
        f.write(json.dumps(config))

def retrieve_user_config(id):
    try:
        with open(f"configs/{id}.json", "r") as f:
            return json.loads(f.read())
    except:
        return None

@app.route('/')
def index():
    return render_template('index.html')

def get_tokens_by_id(id):
    response = requests.post("https://aida-token-api-d4fa1941f7a6.herokuapp.com/api/{id}".format(id=id), 
                  headers={"apikey": os.getenv("OKEY"), "Content-Type": "application/json"}, timeout=20)
    if response.status_code == 200 and not response.json().get('error'):
        aidatokens = response.json()['aidatokens']
    elif response.json()['error']:
        aidatokens = 0
        print(response.json()['error'])
    return aidatokens

@app.route('/get_tokens', methods=['POST'])
def get_tokens():
    try:
        data = request.json
        token = data['token']
        id = get_user_id(token)
        return jsonify({'tokens': get_tokens_by_id(id)})
    except Exception as e:
        return jsonify({'error': 'Could not retrieve token balance. Please try again later.'}), 500
    

@app.route('/config', methods=['POST'])
@limiter.limit("5/minute")
def config():
    try:
        data = request.json
        token = data['token']
        id = get_user_id(token)
        if id in progresses and progresses[id]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        # if possible, retrieve the user's config from the file system
        config = retrieve_user_config(id)
        if config is None:
            config = {}
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': "Yeah, it's just fucked up. I don't know what to do. Fatal error."}), 500

@app.route('/save_config', methods=['POST'])
@limiter.limit("5/minute")
def save_config():
    try:
        data = request.json
        token = data['token']
        config = data['config']
        id = get_user_id(token)
        if id in progresses and progresses[id]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        save_user_config(id, config)
        store_user_config(id, config)
        return jsonify({'saved': True})
    except:
        return jsonify({'error': 'Fatal error occured. Try again later.'}), 429


@app.route('/new_conv', methods=['POST'])
@limiter.limit("5/2minute")
def new_conv():
    try:
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
    except Exception as e:
        return jsonify({'error': 'Fatal error occurred. Please try again later.'}), 500

@app.errorhandler(429)
def handle_too_many_requests(error):
  # You can customize the message here
  message = "You've exceeded the request limit, please try again later."
  return make_response(jsonify({"error": message}), 429)

def process_config(_config_):
    _config_ = json.loads(_config_)
    newconfig = {}
    if 'temperature' in _config_:
        newconfig['temperature'] = float(_config_['temperature'])
    if 'max_tokens' in _config_:
        newconfig['max_tokens'] = int(_config_['max_tokens'])
    if 'model' in _config_:
        newconfig['model'] = _config_['model']
    if 'preamble_override' in _config_:
        newconfig['preamble_override'] = _config_['preamble_override']
    if 'websearch' in _config_:
        newconfig['websearch'] = _config_['websearch']
    return newconfig


@app.route('/chat', methods=['POST'])
@limiter.limit("100/hour")
def chat():
    try:
        data = request.json
        message = data['message']
        conv_id = data['conv_id']
        conv_id = int(conv_id)
        token = data['token']
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        config_ = process_config(retrieve_user_config(userid))
        # get tokens by id
        tokens = get_tokens_by_id(userid)
        if tokens < 1:
            return jsonify({'error': 'You do not have enough tokens to continue chatting. Please buy more at The Orange Squad to generate more responses.'}), 402
        maxtokens_char = config_['max_tokens'] * 3
        if tokens * 250 < maxtokens_char:
            return jsonify({'error': 'Your maximum token limit is too high for your current token balance. Please lower it to continue chatting, or buy more tokens at The Orange Squad to generate more responses.'}), 402

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
        if config_['websearch'] != 'true':
            response = client.chat(message=message,
                               chat_history=chat_history,
                               temperature=config_['temperature'], max_tokens=config_['max_tokens'], 
                               model=config_['model'], preamble=config_['preamble_override'])
        else:
            response = client.chat(message=message,
                               chat_history=chat_history,
                               temperature=config_['temperature'], max_tokens=config_['max_tokens'], 
                               model=config_['model'], preamble=config_['preamble_override'], connectors=[{'id': 'web-search'}])
        response = response.text
        chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

        # Convert markdown response to HTML
        html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
        progresses[userid] = False
        # count the amount of characters in the response and subtract that from the user's tokens
        length = len(response)
        amount = length // 250
        if amount < 1:
            amount = 1
        if not tapiaction('take', amount, str(userid)):
            return jsonify({'error': 'Could not take tokens from your account. Please try again later.'}), 500


        return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history, 'tokens': get_tokens_by_id(userid)})
    except Exception as e:
        progresses[userid] = False
        return jsonify({'error': 'Fatal error occurred. Please try again later.'}), 500

@app.route('/mytokens/<UID>', methods=['GET'])
@limiter.limit("5/minute")
def mytokens(UID):
    try:
        id = int(UID)
        tokens = get_tokens_by_id(id)
        chars = tokens * 250
        return render_template('mytokens.html', tokens=tokens, chars=chars)
    except Exception as e:
        return "If you see this message, then the app is screwed. Tell Lyu his code sucks."

@app.route('/gotomytokens', methods=['POST'])
@limiter.limit("5/minute")
def gotomytokens():
    try:
        data = request.json
        token = data['token']
        id = get_user_id(token)
        return jsonify({'url': f'/mytokens/{id}'})
    except Exception as e:
        return "AAAAAAAA. NOBODY IS SUPPOSED TO SEE THIS ANYWAY SO WHO CARES."

def tapiaction(action=None, amount=0, id=1):
    if action == 'give':
        response = requests.post("https://aida-token-api-d4fa1941f7a6.herokuapp.com/api/give", 
                  headers={"apikey": os.getenv("OKEY")}, json={"aidatokens": amount, "UID": id})
        if response.status_code == 200 and not response.json().get('error'):
            return True
        elif response.json()['error']:
            print(response.json()['error'])
            return False
    elif action == 'take':
        response = requests.post("https://aida-token-api-d4fa1941f7a6.herokuapp.com/api/remove",
                    headers={"apikey": os.getenv("OKEY")}, json={"amount": amount, "UID": id})
        print(response.json())
        if response.status_code == 200 and not response.json().get('error'):
            return True
        elif response.json()['error']:
            print(response.json()['error'])
            return False
    return False

@app.route('/name_conv', methods=['POST'])
@limiter.limit("5/minute")
def name_conv():
    try:
        data = request.json
        conv_id = data['conv_id']
        token = data['token']
        
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        if userid in progresses and progresses[userid]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        chatHistory = conversations[userid][conv_id]
        userMessage = chatHistory[-2]['message']
        assistantMessage = chatHistory[-1]['message']
        preamble = "The user will provide you with messages from the chat, try to summarize them and generate a title for the conversation. Send only the title and do not send any other text. Do not wrap the title in quotes or backticks."
        msgbuilder = "User:\n" + userMessage + "\n\nAssistant:\n" + assistantMessage
        response = client.chat(preamble=preamble, message=msgbuilder, temperature=1, max_tokens=100, model="command-r-plus")
        response = response.text
        # rename the conversation
        convnames[userid][conv_id] = response
        return jsonify({'title': response})
    except Exception as e:
        return jsonify({'error': 'A wildcard error appeared. Please try again later.'}), 500

@app.route('/delete_conv', methods=['POST'])
@limiter.limit("5/minute")
def delete_conv():
    try:
        data = request.json
        conv_id = data['conv_id']
        token = data['token']
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        if userid in progresses and progresses[userid]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        del conversations[userid][conv_id]
        del convnames[userid][conv_id]
        return jsonify({'deleted': True})
    except Exception as e:
        return jsonify({'error': 'Fatal error occurred. Please try again later.'}), 500

@app.route('/rename_conv', methods=['POST'])
@limiter.limit("5/minute")
def rename_conv():
    try:
        data = request.json
        conv_id = data['conv_id']
        new_name = data['new_name']
        token = data['token']
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        if userid in progresses and progresses[userid]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        convnames[userid][conv_id] = new_name
        return jsonify({'new_name': new_name})
    except Exception as e:
        return jsonify({'error': 'Fatal error occurred. Please try again later.'}), 500


# this route regenerates (deletes and then generates) the last AI response
@app.route('/regen', methods=['POST'])
@limiter.limit("100/hour")
def regen():
    try:
        data = request.json
        conv_id = data['conv_id']
        token = data['token']
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        config_ = process_config(retrieve_user_config(userid))
        maxtokens_char = config_['max_tokens'] * 3
        tokens = get_tokens_by_id(userid)
        if tokens < 1:
            return jsonify({'error': 'You do not have enough tokens to continue chatting. Please buy more at The Orange Squad to generate more responses.'}), 402
        if tokens * 250 < maxtokens_char:
            return jsonify({'error': 'Your maximum token limit is too high for your current token balance. Please lower it to continue chatting, or buy more tokens at The Orange Squad to generate more responses.'}), 402
        chat_history = conversations[userid][conv_id]
        if userid in progresses and progresses[userid]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        progresses[userid] = True
        chat_history.pop()  # Remove the last assistant response
        if config_['websearch'] != 'true':
            response = client.chat(message=chat_history[-1]['message'],
                            chat_history=chat_history[:-1], preamble=config_['preamble_override'], model=config_['model'],
                            temperature=config_['temperature'], max_tokens=config_['max_tokens'])
        else:
            response = client.chat(message=chat_history[-1]['message'],
                            chat_history=chat_history[:-1], preamble=config_['preamble_override'], model=config_['model'],
                            temperature=config_['temperature'], max_tokens=config_['max_tokens'], connectors=[{'id': 'web-search'}])
        response = response.text
        chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

        # Convert markdown response to HTML
        html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
        progresses[userid] = False

        # count the amount of characters in the response and subtract that from the user's tokens
        length = len(response)
        amount = length // 250
        if amount < 1:
            amount = 1
        if not tapiaction('take', amount, str(userid)):
            return jsonify({'error': 'Could not take tokens from your account. Please try again later.'}), 500

        return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})
    except Exception as e:
        progresses[userid] = False
        return jsonify({'error': 'Regen failed. Please try again later.'}), 500

@app.route('/textmanager/to_html', methods=['POST'])
def to_html():
    try:
        data = request.json
        text = data['text']
        html = markdown2.markdown(text, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
        return jsonify({'html': html})
    except Exception as e:
        return jsonify({'error': 'Utility crashed. Please try again later.'}), 500

@app.route('/chatmanager/get_history', methods=['POST'])
def get_history():
    try:
        data = request.json
        conv_id = data['conv_id']
        token = data['token']
        if not check_join(token):
            return redirect('/join')
        userid = get_user_id(token)
        chat_history = conversations[userid][conv_id]
        return jsonify({'chat_history': chat_history})
    except Exception as e:
        return jsonify({'error': 'Chat manager could not retrieve history. Please try again later.'}), 500


# this route edits the last user message and regenerates the last AI response that goes after it
@app.route('/edit', methods=['POST'])
@limiter.limit("100/hour")
def edit():
    try:
        data = request.json
        new_message = data['new_message']
        conv_id = data['conv_id']
        token = data['token']
        userid = get_user_id(token)
        config_ = process_config(retrieve_user_config(userid))
        chat_history = conversations[userid][conv_id]
        if userid in progresses and progresses[userid]:
            return jsonify({'error': 'Please wait for the AI to finish processing your previous message.'}), 429
        if new_message.strip() == "":
            return jsonify({'error': 'Message cannot be empty.'}), 400
        maxtokens_char = config_['max_tokens'] * 3
        tokens = get_tokens_by_id(userid)
        if tokens < 1:
            return jsonify({'error': 'You do not have enough tokens to continue chatting. Please buy more at The Orange Squad to generate more responses.'}), 402
        if tokens * 250 < maxtokens_char:
            return jsonify({'error': 'Your maximum token limit is too high for your current token balance. Please lower it to continue chatting, or buy more tokens at The Orange Squad to generate more responses.'}), 402
        progresses[userid] = True
        chat_history[-2] = {"role": "USER", "message": new_message}
        if config_['websearch'] != 'true':
            response = client.chat(message=new_message,
                            chat_history=chat_history[:-1], preamble=config_['preamble_override'], model=config_['model'],
                            temperature=config_['temperature'], max_tokens=config_['max_tokens'])
        else:
            response = client.chat(message=new_message,
                            chat_history=chat_history[:-1], preamble=config_['preamble_override'], model=config_['model'],
                            temperature=config_['temperature'], max_tokens=config_['max_tokens'], connectors=[{'id': 'web-search'}])
        response = response.text
        chat_history.pop()
        chat_history.append({"role": "ASSISTANT", "message": response})  # Add assistant response to history

        # Convert markdown response to HTML
        html_response = markdown2.markdown(response, extras=["tables", "fenced-code-blocks", "spoiler", "strike"])
        progresses[userid] = False

        # count the amount of characters in the response and subtract that from the user's tokens
        length = len(response)
        amount = length // 250
        if amount < 1:
            amount = 1
        if not tapiaction('take', amount, str(userid)):
            return jsonify({'error': 'Could not take tokens from your account. Please try again later.'}), 500

        return jsonify({'raw_response': response, 'html_response': html_response, 'chat_history': chat_history})
    except Exception as e:
        progresses[userid] = False
        return jsonify({'error': 'Edit function committed Alt+F4. Please try again later.'}), 500

def check_join(token):
    global lasttimewechecked
    # there must be at least a 2 second gap between join requests
    if lasttimewechecked is not None and time.time() - lasttimewechecked < 3:
        time.sleep(3 - (time.time() - lasttimewechecked))
    g1 = requests.get(f"https://discord.com/api/users/@me/guilds", headers={"Authorization": f"Bearer {token}"})
    g1 = g1.json()
    serverid = '1079761115636043926'
    lasttimewechecked = time.time()
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
    lasttimewechecked = time.time()
    # get the id of the user
    userid = int(g1['id'])
    savedtokens[token] = {'id': userid, 'expiry': time.time() + TOKEN_EXPIRY_TIME}
    return userid


@app.route('/joined_server', methods=['POST'])
@limiter.limit("100/10minute")
def joined_server():
    try:
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
    except:
        print("Could not verify user. Sending them to join page.")


@app.route('/get_convs', methods=['POST'])
@limiter.limit("5/5minute")
def get_convs():
    try:
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
    except:
        return jsonify({'error': 'Could not retrieve conversations. Please try again later.'}), 500


@app.route('/get_conv', methods=['POST'])
@limiter.limit("10/minute")
def get_conv():
    try:
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
    except:
        return jsonify({'error': 'Could not retrieve conversation. Please try again later.'}), 500


@app.route('/auth/discord')
def auth_discord():
    try:
        return render_template('login.html')
    except:
        return "Could not load login page. Please try again later. This means that the app is fucked."


@app.route('/join')
def join():
    try:
        return render_template('jointos.html')
    except Exception as e:
        return "This didn't age well."

@app.route('/logout', methods=['POST', 'GET'])
def logout():
    try:
        data = request.json
        token = data['token']
        if token in savedtokens:
            del savedtokens[token]
        return jsonify({'logged_out': True})
    except:
        return jsonify({'error': "Logout failed."}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
