--------------------- STAGE 1 ---------------------

- [x] Chat Message Redesign
  - [x] Message Bubble
    - [x] Remove name
    - [x] Reuse name
  - [x] Add PFPs to messages
  - [x] Use a proper Markdown CSS for messages, or write our own

--------------------- STAGE 2 ---------------------

- [x] Add Regeneration
 - [x] Add a `regen` route
    - [x] Implement candidates and selected "routes"
    - [x] Split the convdata into "total" and "used" data
 - [x] Add a regeneration button to each last message of the AI
    - [x] Add candidate selection if there are multiple
    - [x] Limit the number of regenerations per message to 10

- [x] Let the user edit their messages
  - [x] Add an `edit` route
    - [x] Implement the `edit` route
    - [x] Implement proper callbacks
  - [x] Add an edit button to each message
  - [x] Add a "edited" tag to each message

BONUS:

- [x] Make the user edits appear BEFORE the AI message
  - [x] Do some magic with the frontend

--------------------- STAGE 3 --------------------- 

- [x] List All Conversations on the left sidebar
    - [x] Get the `getconvs` and `getconv` routes to work
    - [x] List all conversations on the left sidebar
    - [x] Allow switching between conversations
    - [x] Each new conversation simply clears the chat for now, but if a user sends a message, it should be saved to the conversation db

--------------------- STAGE 4 ---------------------

- [x] Make another AI name the conversation somehow when sending the first message in a new one
    - [x] Implement a `name` route
       - [x] Figure out what AI will be used for this
           - [x] Use the AI
           - [x] Make sure we don't pay for this
        - [x] If failed, use a "Conversation #" format
    

--------------------- STAGE 5 ---------------------

- [x] Allow editing the conversation name
    - [x] Implement an `editname` route
    - [x] Add an edit button to the conversation name

- [x] Allow deleting the conversation
    - [x] Implement a `deleteconv` route
    - [x] Add a delete button to the conversation name
        - [x] Add a confirmation dialog

- [x] Optionally
    - [x] Create a status bar above
        - [x] Show the conversation name
        - [x] Show the conversation ID
        - [x] Add a "Delete" button
        - [x] Add a "Edit" button
        - [ ] Add a message count


--------------------- STAGE 6 ---------------------

- [x] Drink some tea
    - [x] Make sure it's good tea
    - [x] Don't spill it
    - [x] Don't burn yourself
    - [x] Don't drink too much
    - [x] Don't drink too little

- [x] Add configuration
    - [x] Create a new menu
       - [x] Allow customizing the temperature
       - [x] Allow customizing the max tokens
       - [x] Allow customizing the preamble
       - [x] Allow enabling websearch
    - [ ] Implement a `configsave` route
       - [ ] Make sure the config is saved per-conversation
       - [ ] Associate convIDs along with the config in JSON
    - [ ] Implement a `configload` route
         - [ ] Make sure the config is loaded per-conversation
    - [ ] Delete the config when the conversation is deleted
    - [ ] Do not allow the user to change the config if the conversation is not empty

^^ I took a different route, but...
IT JUST WORKS (No, I'm not Todd Howard)

--------------------- STAGE 7 ---------------------

- [x] Add proper timeouts (need to wait 3s between any action)
    - [x] Implement a `timeout` route
    - [x] Implement a `timeout` function
    - [x] Implement a `timeout` check in the backend

- [x] Add a "typing" indicator
    - [x] If no response is received yet, show a "typing" indicator

- [x] Allow stopping the AI
    - [x] Implement a `stop` route
    - [x] Implement a stop button


--------------------- STAGE 8 ---------------------

- [x] Limit usage
    - [ ] Implement a `limit` route for information
       - [ ] The POST request will check if the user can do the action
    - [ ] Set restrictions
        - [ ] Only users with Bronze, Booster, Contributor, or Legend roles can use the AI
        - [ ] Each message costs you 0.3 AIDA Tokens (or whatever the price is), those will be bought in Discord tho
        - [ ] Boosters get a 40% discount
        - [ ] Check based on the roles
    
- [x] Add a display for the amount of tokens you currently have
    - [ ] Implement a `tokens` route
    - [ ] Implement a `tokens` function
    - [ ] Implement a `tokens` check in the backend

- [x] Add a "Connection Failure" message
    - [ ] If we fail to get data from the Discord DB handler, show a "Connection Failure" message
        - [ ] Make sure to show that it's something on our end, not the user's

--------------------- STAGE 9 --------------------- 

- [x] Add sample starters
    - [x] If the conversation is empty, show a list of sample starters
    - [x] Create a list of sample starters
        - [ ] Use a title/description format
           - [ ] Only the description will be sent to the AI
        - [x] Messages are sent on the user's behalf
        - [x] They disappear if the user sends a message (or clicks on a sample)


<-> CURRENT: WORKING ON IMAGE GENERATION <->



+++++++++++++++++++++ BETA OPEN +++++++++++++++++++++








+++++++++++++++++++++ OUTSIDE WEBSITE +++++++++++++++++++++

--------------------- STAGE 1 ---------------------

- [ ] Create a normal-looking index page
    - [ ] Add a header
    - [ ] Add a footer
    - [ ] Add a "Get Started" button
    - [ ] Add a "About" button
    - [ ] Add a "Contact" button

- [ ] Create an about page (I guess)
    - [ ] Write some random wall of text
    - [ ] MAKE SURE THE HEADER AND FOOTER ARE THERE

- [ ] Create a contact page
    - [ ] Give options
        - [ ] Discord
        - [ ] Email
        - [ ] GitHub
    
- [ ] Create a "Get Started" page
    - [ ] Links to the login page
        - [ ] Relink to the chat page if already logged in


--------------------- STAGE 2 ---------------------

- [ ] Need some proper pages for error handling
    - [ ] 404
    - [ ] 500
    - [ ] 403
    - [ ] 401
    - [ ] 400
    - [ ] 429

- [ ] Add a proper favicon
    - [ ] Add a favicon to the website
    - [ ] Make sure it's a good one
    - [ ] Let Lyu know if you need help with design
    - [ ] Don't laugh at the favicon


+++++++++++++++++++++ FINAL +++++++++++++++++++++









+++++++++++++++++++++ HOSTING +++++++++++++++++++++

--------------------- STAGE 1 ---------------------

- [ ] Host on Heroku
     - [ ] Talk to Lyu about this
        - [ ] He's got the money
    - [ ] Buy a domain
         - [ ] Decide who pays the bills
            - [ ] Eh, we'll figure it out

- [ ] Set up the purchase of AIDA Tokens
    - [ ] Make sure the Discord bot is ready
    - [ ] Ask Lyu to write the code for that thing
    - [ ] NO REFUNDS

- [ ] Force Orange Utilities to show the link
    - [ ] Make sure the link is shown on the main page
    - [ ] Make sure the link is shown on the Discord server
    - [ ] Make sure the link is shown on the GitHub repo


--------------------- STAGE 2 ---------------------

- [ ] Put "Made with ❤️ by The Orange Squad" somewhere
    - [ ] Make sure it's visible
    - [ ] Make sure it's not too big
    - [ ] Make sure it's not too small
    - [ ] Don't make it too cringe

- [ ] Add a "Privacy Policy" page
    - [ ] Write a privacy policy
    - [ ] Add a summary
        - [ ] In case someone doesn't have the brain capacity to read the whole thing
    - [ ] Make sure it's GDPR-compliant

- [ ] Use the maintenance page for stuff
    - [ ] Get it from GitHub, Idk where it is
        - [ ] There for sure is a maintenance repo on our GitHub
    - [ ] If the website is down, show a maintenance page
    - [ ] If the website is up, show the website

- [ ] Add a "Terms of Service" page
    - [ ] Write a terms of service
    - [ ] Add a summary
        - [ ] In case someone doesn't have the brain capacity to read the whole thing
    - [ ] Make sure it's GDPR-compliant

- [ ] NO COOKIES

--------------------- STAGE 3 ---------------------

- [ ] Go to sleep
    - [ ] Sleep well
    - [ ] Don't sleep too little
    - [ ] Let yourself rest

- [ ] Buy some cookies
    - [ ] Some reputable brand
    - [ ] Open the package
    - [ ] Take a cookie
    - [ ] Eat the cookie
    - [ ] Enjoy the cookie

- [ ] Realize that you're done
    - [ ] Take a deep breath
    - [ ] Realize that you've done it
    - [ ] Be proud of yourself
    - [ ] Celebrate


+++++++++++++++++++++ 🎉🎉🎉🎉🎉🎉🎉🎉 +++++++++++++++++++++