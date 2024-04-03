from flask import Flask, request, jsonify, render_template, redirect
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    pw = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f'<User {self.name}>'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    name = request.form['name']
    email = request.form['email']
    pw = request.form['pw']

    user = User(name=name, email=email, pw=pw)
    db.session.add(user)
    db.session.commit()

    return redirect('/')

@app.route('/auth', methods=['POST'])
def auth():
    email = request.form['email']
    pw = request.form['pw']

    user = User.query.filter_by(email=email, pw=pw).first()
    if user:
        return 'Logged in'
    else:
        return 'Invalid credentials'

@app.route('/login')
def login():
    return render_template('login.html')

if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)