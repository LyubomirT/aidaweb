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
import random

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

        self.search_var = tk.StringVar()
        search_label = tk.Label(toolbar, text="Search:")
        search_label.pack(side=tk.LEFT, padx=2, pady=2)
        self.search_entry = tk.Entry(toolbar, textvariable=self.search_var)
        self.search_entry.pack(side=tk.LEFT, padx=2, pady=2)
        search_button = tk.Button(toolbar, text="Search", command=self.search_data)
        search_button.pack(side=tk.LEFT, padx=2, pady=2)

        ban_button = tk.Button(toolbar, text="Ban User", command=self.ban_user)
        ban_button.pack(side=tk.LEFT, padx=2, pady=2)
        delete_button = tk.Button(toolbar, text="Delete Conversation", command=self.delete_conversation)
        delete_button.pack(side=tk.LEFT, padx=2, pady=2)
        save_button = tk.Button(toolbar, text="Save Database", command=self.save_database)
        save_button.pack(side=tk.LEFT, padx=2, pady=2)
        refresh_button = tk.Button(toolbar, text="Refresh", command=self.load_dropdown)
        refresh_button.pack(side=tk.LEFT, padx=2, pady=2)
        random_button = tk.Button(toolbar, text="Random", command=self.load_random_conversation)
        random_button.pack(side=tk.LEFT, padx=2, pady=2)

        # Notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # Normal tab
        self.normal_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.normal_tab, text="Normal")

        # Treeview for conversations in Normal tab
        self.tree = ttk.Treeview(self.normal_tab, columns=('ID', 'Name'), show='headings')
        self.tree.heading('ID', text='ID')
        self.tree.heading('Name', text='Name')
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.tree.bind('<ButtonRelease-1>', self.on_conversation_select)

        # Text widget for messages in Normal tab
        self.text = tk.Text(self.normal_tab)
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Random tab
        self.random_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.random_tab, text="Random")

        # Text widget for messages in Random tab
        self.random_text = tk.Text(self.random_tab)
        self.random_text.pack(fill=tk.BOTH, expand=True)

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

    def load_random_conversation(self):
        user_ids = [f.split(".")[0] for f in os.listdir(self.conversations_path) if f.endswith(".aidacf")]
        if not user_ids:
            messagebox.showerror("Error", "No users found.")
            return

        random_user_id = random.choice(user_ids)
        conversation_file = os.path.join(self.conversations_path, f"{random_user_id}.aidacf")
        convname_file = os.path.join(self.convnames_path, f"{random_user_id}.aidacf")

        if not os.path.exists(conversation_file) or not os.path.exists(convname_file):
            messagebox.showerror("Error", "Random user data not found.")
            return

        with open(conversation_file, "r") as f:
            conversation_data = eval(f.read())  # Direct conversion to dict
        with open(convname_file, "r") as f:
            convname_data = eval(f.read())  # Direct conversion to dict

        random_conversation_id = random.choice(list(conversation_data.keys()))
        messages = conversation_data[random_conversation_id]

        self.user_id_var.set(random_user_id)
        self.load_user_data()
        self.tree.selection_set(self.tree.get_children()[list(conversation_data.keys()).index(random_conversation_id)])

        self.text.delete(1.0, tk.END)
        for msg in messages:
            role = msg['role']
            message = msg['message']
            self.text.insert(tk.END, f"{role}: {message}\n")

        self.random_text.delete(1.0, tk.END)
        for msg in messages:
            role = msg['role']
            message = msg['message']
            self.random_text.insert(tk.END, f"{role}: {message}\n")

    def search_data(self):
        search_query = self.search_var.get().strip()
        if not search_query:
            messagebox.showerror("Error", "Please enter a search query.")
            return

        user_ids = [f.split(".")[0] for f in os.listdir(self.conversations_path) if f.endswith(".aidacf")]

        matching_user_ids = [user_id for user_id in user_ids if search_query in user_id]
        matching_conv_ids = []

        for user_id in user_ids:
            conversation_file = os.path.join(self.conversations_path, f"{user_id}.aidacf")
            if os.path.exists(conversation_file):
                with open(conversation_file, "r") as f:
                    conversation_data = eval(f.read())
                for conv_id in conversation_data.keys():
                    if search_query in str(conv_id):
                        matching_conv_ids.append((user_id, conv_id))

        if matching_user_ids:
            self.user_id_var.set(matching_user_ids[0])
            self.load_user_data()

        if matching_conv_ids:
            user_id, conv_id = matching_conv_ids[0]
            self.user_id_var.set(user_id)
            self.load_user_data()
            self.tree.selection_set(self.tree.get_children()[list(self.conversation_data.keys()).index(conv_id)])

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
