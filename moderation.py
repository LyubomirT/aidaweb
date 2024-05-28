# sample (path: conversations/861620168370683924.aidacf):
# {243334: [{'role': 'USER', 'message': 'Hey!', 'attachment': None, 'attachmentbase64': None}, {'role': 'ASSISTANT', 'message': 'Hi lyubomirt! How can I assist you today?', 'attachmentbase64': None}]}
# THIS IS NOT JSON, JSON CAN'T HAVE INT KEYS
# .aidacf is a custom file extension, it's not a standard file extension
# conversation names (path: convnames/861620168370683924.aidacf):
# {243334: 'Greetings'}

import tkinter as tk
from tkinter import ttk
from tkinter import messagebox
from tkinter import filedialog
from tkinter import simpledialog
import pickle
import os
import json
import re
import base64

# the moderation app lets you ban users and delete conversations from the database. It also lets you view the conversations in a chat-like interface
# the app is a tkinter app with a treeview widget for the conversations and a text widget for the messages
# the app has a menu with options to ban users, delete conversations, and save the database
# the app has a toolbar with buttons to ban users, delete conversations, and save the database
# banned user ids are stored in banned.txt (create it if it doesn't exist)
# directly edit the user data (conversations and convnames) in the database folders
# the database folders are in the same directory as the moderation app
# the database folders are conversations and convnames
# we should use re or something for loading the user data as it's not valid json (int keys)
# also i guess we can just convert the string to a dict instead of going through all this re bullshit
# by default present with a dropdown to select the user id to view the conversations of
# also make sure that all operations use dropdowns for user-friendlyness
# do not load the entire database into memory, only load the data for the selected user
# do not load anything from the database until the user selects a user id and clicks the load button
# the keys in conversations and convnames are the same, and those are conversation ids
# we can retrieve conversation names from convnames using the conversation id
# the conversation names are displayed in the treeview

class ModerationApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Moderation App")

        self.banned_users = self.load_banned_users()
        self.selected_user_id = None
        self.conversations_path = "conversations"
        self.convnames_path = "convnames"

        self.create_widgets()
        self.load_dropdown()

    def create_widgets(self):
        # Menu
        menu = tk.Menu(self.root)
        self.root.config(menu=menu)

        file_menu = tk.Menu(menu, tearoff=0)
        menu.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Ban User", command=self.ban_user)
        file_menu.add_command(label="Delete Conversation", command=self.delete_conversation)
        file_menu.add_command(label="Save Database", command=self.save_database)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)

        # Toolbar
        toolbar = tk.Frame(self.root, bd=1, relief=tk.RAISED)
        toolbar.pack(side=tk.TOP, fill=tk.X)

        self.user_id_var = tk.StringVar()
        user_id_label = tk.Label(toolbar, text="User ID:")
        user_id_label.pack(side=tk.LEFT, padx=2, pady=2)
        self.user_id_entry = ttk.Combobox(toolbar, textvariable=self.user_id_var)
        self.user_id_entry.pack(side=tk.LEFT, padx=2, pady=2)
        load_button = tk.Button(toolbar, text="Load", command=self.load_user_data)
        load_button.pack(side=tk.LEFT, padx=2, pady=2)

        ban_button = tk.Button(toolbar, text="Ban User", command=self.ban_user)
        ban_button.pack(side=tk.LEFT, padx=2, pady=2)
        delete_button = tk.Button(toolbar, text="Delete Conversation", command=self.delete_conversation)
        delete_button.pack(side=tk.LEFT, padx=2, pady=2)
        save_button = tk.Button(toolbar, text="Save Database", command=self.save_database)
        save_button.pack(side=tk.LEFT, padx=2, pady=2)

        # Treeview for conversations
        self.tree = ttk.Treeview(self.root, columns=('ID', 'Name'), show='headings')
        self.tree.heading('ID', text='ID')
        self.tree.heading('Name', text='Name')
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.tree.bind('<ButtonRelease-1>', self.on_conversation_select)

        # Text widget for messages
        self.text = tk.Text(self.root)
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

    def load_banned_users(self):
        if os.path.exists("banned.txt"):
            with open("banned.txt", "r") as file:
                return set(file.read().splitlines())
        return set()

    def load_user_data(self):
        user_id = self.user_id_var.get().strip()
        if not user_id:
            messagebox.showerror("Error", "Please enter a user ID.")
            return

        try:
            self.selected_user_id = user_id
            conversation_file = os.path.join(self.conversations_path, f"{user_id}.aidacf")
            convname_file = os.path.join(self.convnames_path, f"{user_id}.aidacf")

            if not os.path.exists(conversation_file) or not os.path.exists(convname_file):
                messagebox.showerror("Error", "User data not found.")
                return

            with open(conversation_file, "r") as f:
                conversation_data = eval(f.read())  # Direct conversion to dict
            with open(convname_file, "r") as f:
                convname_data = eval(f.read())  # Direct conversion to dict

            self.conversation_data = conversation_data
            self.convname_data = convname_data

            self.tree.delete(*self.tree.get_children())
            for conv_id, conv_name in self.convname_data.items():
                self.tree.insert("", "end", values=(conv_id, conv_name))

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load user data: {e}")

    def on_conversation_select(self, event):
        selected_item = self.tree.selection()[0]
        conv_id = self.tree.item(selected_item, 'values')[0]

        messages = self.conversation_data[int(conv_id)]
        self.text.delete(1.0, tk.END)
        for msg in messages:
            role = msg['role']
            message = msg['message']
            self.text.insert(tk.END, f"{role}: {message}\n")

    def ban_user(self):
        if not self.selected_user_id:
            messagebox.showerror("Error", "No user selected.")
            return

        self.banned_users.add(self.selected_user_id)
        with open("banned.txt", "w") as file:
            for user in self.banned_users:
                file.write(f"{user}\n")
        messagebox.showinfo("Info", f"User {self.selected_user_id} has been banned.")

    def delete_conversation(self):
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showerror("Error", "No conversation selected.")
            return

        conv_id = self.tree.item(selected_item[0], 'values')[0]
        del self.conversation_data[int(conv_id)]
        del self.convname_data[int(conv_id)]

        self.tree.delete(selected_item[0])
        self.text.delete(1.0, tk.END)

    def save_database(self):
        try:
            user_id = self.selected_user_id
            conversation_file = os.path.join(self.conversations_path, f"{user_id}.aidacf")
            convname_file = os.path.join(self.convnames_path, f"{user_id}.aidacf")

            with open(conversation_file, "w") as f:
                f.write(str(self.conversation_data))
            with open(convname_file, "w") as f:
                f.write(str(self.convname_data))

            messagebox.showinfo("Info", "Database saved successfully.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save database: {e}")
        
    def load_dropdown(self):
        # Load the user ids from the conversations folder
        user_ids = [f.split(".")[0] for f in os.listdir(self.conversations_path) if f.endswith(".aidacf")]
        self.user_id_entry['values'] = user_ids

if __name__ == "__main__":
    root = tk.Tk()
    app = ModerationApp(root)
    root.mainloop()