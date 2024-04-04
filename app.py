from flask import Flask, request, jsonify, render_template, redirect
import cohere
import dotenv
import os
import sqlite3
import random   # for randomizing id for characters

# Load the environment variables from the .env file
dotenv.load_dotenv()

# Create a new Cohere client
client = cohere.Client(os.getenv("CKEY"))

app = Flask(__name__)

def create_connection():
    conn = sqlite3.connect('characters.db')
    return conn

def create_table(conn):
    conn.execute('''CREATE TABLE IF NOT EXISTS characters
                (id INTEGER PRIMARY KEY, name TEXT NOT NULL, shortdesc TEXT NOT NULL, introduction TEXT NOT NULL, definition TEXT NOT NULL);''')
    conn.commit()

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

def createChar(name, shortdesc, introduction, definition, id=None):
    # if id is not provided, generate a random id
    if id == None:
        id = random.randint(1000, 9999)
        while getCharInfo(id) != None:
            id = random.randint(1000, 9999)
    conn = create_connection()
    create_table(conn)
    conn.execute("INSERT INTO characters (id, name, shortdesc, introduction, definition) VALUES (?, ?, ?, ?, ?)", (id, name, shortdesc, introduction, definition))
    conn.commit()
    conn.close()
    return True

@app.route('/create_char', methods=['POST'])
def create_char():
    try:
        data = request.json
        name = data['name']
        # limit to 2-50 characters
        if len(name) < 2 or len(name) > 50:
            return jsonify({'error': 'Name must be between 2 and 50 characters'})
        shortdesc = data['shortdesc']
        # limit to 2-80 characters
        if len(shortdesc) < 2 or len(shortdesc) > 80:
            return jsonify({'error': 'Short description must be between 2 and 80 characters'})
        introduction = data['introduction']
        # limit to 1-500 characters
        if len(introduction) < 1 or len(introduction) > 500:
            return jsonify({'error': 'Introduction must be between 1 and 500 characters'})
        definition = data['definition']
        # limit to 1000 characters
        if len(definition) > 1000:
            return jsonify({'error': 'Definition must be less than 1000 characters'})
        if createChar(name, shortdesc, introduction, definition):
            return jsonify({'success': 'Character created successfully'})
        else:
            return jsonify({'error': 'An error occurred while creating the character'})
    except Exception as e:
        return jsonify({'error': "Could not create character"})

def getCharInfo(id):
    conn = create_connection()
    create_table(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM characters WHERE id=?", (id,))
    row = cursor.fetchone()
    conn.close()
    return row
if __name__ == '__main__':
    app.run(debug=False)
