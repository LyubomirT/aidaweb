import cohere
import dotenv
import os
import time

# Load the environment variables from the .env file
dotenv.load_dotenv()

# Create a new Cohere client
client = cohere.Client(os.getenv("CKEY"))

response = client.chat_stream(message="Hello, how are you?")
responses = []

for event in response:
    if event.event_type == 'text-generation':
        responses.append(event.text)
        str_ = ''.join(responses)
        print(str_)
        time.sleep(0.1)
    