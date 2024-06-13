# AIDA Web

This is the web interface for the AIDA project. It is a web application that allows users to interact with the AIDA system and engage in awesome conversations with the smart AIDA bot.

## Installation

AIDA is self-hosted by me and is available for public use at <https://aidaweb.jprq.app/>. However, if you want to host your own instance of AIDA, you can follow the instructions below.

### Prerequisites

- A valid JPRQ account (for tunneling)
- Python 3.8 or higher
- All the dependencies in the `requirements.txt` file
- Your own instance of the AIDA token backend (<https://github.com/The-Orange-Squad/token-api>)

### Environment Variables

You need to set the following environment variables:

- `HFACE`: The Hugging Face model ID for image generation and image captioning.
- `CKEY`: The Cohere API key for the chatbot. You can get one by signing up at <https://dashboard.cohere.com/>.
- `OKEY`: The API key you set for your own instance of the AIDA token backend. (<https://github.com/The-Orange-Squad/token-api>). This is used to check the user's balance and deduct tokens for each message.
- `PATH_TO_JPRQ`: The path to the JPRQ executable on your system. Can be set to `jprq` if it is in your PATH.
- `JPRQAUTH`: The JPRQ authentication token for your account. You can get one by signing up at <https://jprq.io/auth>.
- `JPRQNAME`: The JPRQ subdomain you want to use for your AIDA instance. You can select any available subdomain you want (if you have a paid JPRQ account).

### Steps

1. Clone this repository to your local machine.
2. Install the dependencies by running `pip install -r requirements.txt`.
3. Run the application by running `python app.py`.
4. Visit `http://localhost:5000` in your browser to access the AIDA web interface.
5. Enjoy!

> ## new version ( <em> Kindly remove this after you get it running or update it accordingly </em>)
* <em>NOTE that, I did not push the virtual environbent file due to the size.
* you can just create it from your side by running `python -m venv virtual_env`.
* remember to add `virtual_env/` and `node_modules/` to the `.gitignore` file so that you don't push them
</em>
>> 1. Activate the virtual environment by running `source virtual_env/bin/activate` 
>> 2. Install the dependencies by running `pip install -r requirements.txt`.
>> 3. Install node dependencies(tailwindcss) by running `npm install` 
>> 4. Run the tailwindcss 'watcher' by running `npm run build` (you won't need this if you just want to preview the website. but it wouldn't hurt to)
>> 5. Run the application by running `python app.py`.
>> 6. Visit `http://localhost:5000/landing` in your browser to access the AIDA web landing interface.


## Usage

The AIDA web interface is very simple to use. You can interact with the AIDA bot by typing in the chat box and pressing the `Enter` key. The bot will respond to your messages in real-time. Everything else is pretty self-explanatory and intuitive, try to explore the interface yourself!

## Why is it only available to members of The Orange Squad?

This is originally developed for The Orange Squad, my Discord community. I have decided to keep it exclusive to members of The Orange Squad as it is a special feature for them. However, I am planning to make it available to the public in the future, perhaps with a public version of the AIDA bot.

## License

We use the BSD 3-Clause License for this project. You can view the license in the `LICENSE` file.

## Contributing

We welcome contributions from everyone! If you want to contribute to this project, please fork this repository and submit a pull request. We will review your changes and merge them if they are good. Please make sure to follow the code of conduct and contribute responsibly.