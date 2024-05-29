import tkinter as tk
from tkinter import ttk
from tkinter import messagebox
from tkinter import filedialog
from tkinter import simpledialog
import os
import base64
import random

class DetailedText(tk.Text):
    """A Text widget that allows scrolling."""
    def __init__(self, parent, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        scrollbar = tk.Scrollbar(parent, command=self.yview)
        self['yscrollcommand'] = scrollbar.set
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.pack(fill=tk.BOTH, expand=True)

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
        self.conversation_tree = ttk.Treeview(self.normal_tab, columns=('ID', 'Name'), show='headings')
        self.conversation_tree.heading('ID', text='ID')
        self.conversation_tree.heading('Name', text='Name')
        conversation_scrollbar = ttk.Scrollbar(self.normal_tab, orient="vertical", command=self.conversation_tree.yview)
        self.conversation_tree.configure(yscrollcommand=conversation_scrollbar.set)
        conversation_scrollbar.pack(side=tk.LEFT, fill=tk.Y)
        self.conversation_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.conversation_tree.bind('<ButtonRelease-1>', self.on_conversation_select)

        # Scrollable Text for messages in Normal tab
        message_frame = tk.Frame(self.normal_tab)
        message_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.message_text = DetailedText(message_frame, wrap=tk.WORD, state=tk.DISABLED)
        
        # Search Results tabs
        self.search_user_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.search_user_tab, text="User Search Results")

        self.search_conv_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.search_conv_tab, text="Conversation Search Results")

        # Listbox for user search results
        user_list_frame = tk.Frame(self.search_user_tab)
        user_list_frame.pack(fill=tk.BOTH, expand=True)
        user_scrollbar = ttk.Scrollbar(user_list_frame, orient="vertical")
        self.user_listbox = tk.Listbox(user_list_frame, yscrollcommand=user_scrollbar.set)
        user_scrollbar.configure(command=self.user_listbox.yview)
        user_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.user_listbox.pack(fill=tk.BOTH, expand=True)
        self.user_listbox.bind('<Double-1>', self.load_selected_user)

        # Treeview for conversation search results
        self.conv_tree = ttk.Treeview(self.search_conv_tab, columns=('User ID', 'Conv ID'), show='headings')
        self.conv_tree.heading('User ID', text='User ID')
        self.conv_tree.heading('Conv ID', text='Conversation ID')
        conv_search_scrollbar = ttk.Scrollbar(self.search_conv_tab, orient='vertical', command=self.conv_tree.yview)
        self.conv_tree.configure(yscrollcommand=conv_search_scrollbar.set)
        conv_search_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.conv_tree.pack(fill=tk.BOTH, expand=True)
        self.conv_tree.bind('<ButtonRelease-1>', self.on_search_conversation_select)

        # Random tab
        self.random_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.random_tab, text="Random")

        # Scrollable Text for random messages
        random_message_frame = tk.Frame(self.random_tab)
        random_message_frame.pack(fill=tk.BOTH, expand=True)
        self.random_message_text = DetailedText(random_message_frame, wrap=tk.WORD, state=tk.DISABLED)

    def load_banned_users(self):
        if os.path.exists("banned.txt"):
            with open("banned.txt", "r") as file:
                return set(file.read().splitlines())
        return set()

    def load_dropdown(self):
        user_ids = [f.split(".")[0] for f in os.listdir(self.conversations_path) if f.endswith(".aidacf")]
        self.user_id_entry['values'] = user_ids

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
                conversation_data = eval(f.read())  # Convert directly to dict
            with open(convname_file, "r") as f:
                convname_data = eval(f.read())  # Convert directly to dict

            self.conversation_data = conversation_data
            self.convname_data = convname_data

            self.conversation_tree.delete(*self.conversation_tree.get_children())
            for conv_id, conv_name in self.convname_data.items():
                self.conversation_tree.insert("", "end", values=(conv_id, conv_name))

        except Exception as e:
            messagebox.showerror("Error", f"Failed to load user data: {e}")

    def display_messages_in_text(self, text_widget, messages):
        text_widget.configure(state=tk.NORMAL)
        text_widget.delete(1.0, tk.END)

        for msg in messages:
            role = msg['role']
            message = msg['message']
            text_widget.insert(tk.END, f"{role}: {message}\n\n")

        text_widget.configure(state=tk.DISABLED)

    def on_conversation_select(self, event):
        selected_item = self.conversation_tree.selection()[0]
        conv_id = self.conversation_tree.item(selected_item, 'values')[0]

        messages = self.conversation_data[int(conv_id)]
        self.display_messages_in_text(self.message_text, messages)

    def on_search_conversation_select(self, event):
        selected_item = self.conv_tree.selection()[0]
        user_id, conv_id = self.conv_tree.item(selected_item, 'values')

        self.user_id_var.set(user_id)
        self.load_user_data()
        self.conversation_tree.selection_set(self.conversation_tree.get_children()[list(map(str, self.conversation_data.keys())).index(str(conv_id))])

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
        self.conversation_tree.selection_set(self.conversation_tree.get_children()[list(map(str, self.conversation_data.keys())).index(str(random_conversation_id))])

        self.display_messages_in_text(self.message_text, messages)
        self.display_messages_in_text(self.random_message_text, messages)

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

        self.user_listbox.delete(0, tk.END)
        for user_id in matching_user_ids:
            self.user_listbox.insert(tk.END, user_id)

        self.conv_tree.delete(*self.conv_tree.get_children())
        for user_id, conv_id in matching_conv_ids:
            self.conv_tree.insert("", "end", values=(user_id, conv_id))

    def load_selected_user(self, event):
        selected_user = self.user_listbox.get(self.user_listbox.curselection())
        self.user_id_var.set(selected_user)
        self.load_user_data()

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
        selected_item = self.conversation_tree.selection()
        if not selected_item:
            messagebox.showerror("Error", "No conversation selected.")
            return

        conv_id = self.conversation_tree.item(selected_item[0], 'values')[0]
        del self.conversation_data[int(conv_id)]
        del self.convname_data[int(conv_id)]

        self.conversation_tree.delete(selected_item[0])
        self.message_text.configure(state=tk.NORMAL)
        self.message_text.delete(1.0, tk.END)
        self.message_text.configure(state=tk.DISABLED)

    def save_database(self):
        try:
            user_id = self.selected_user_id
            conversation_file = os.path.join(self.conversations_path, f"{user_id}.aidacf")
            convname_file = os.path.join(self.convnames_path, f"{user_id}.aidacf")

            with open(conversation_file, "w") as f:
                f.write(str(self.conversation_data))
            with open(convname_file, "w") as f:
                f.write(str(self.convname_data))

            messagebox.showinfo("Info", f"User {user_id}'s data has been saved.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save database: {e}")

# Create the main application window
root = tk.Tk()
app = ModerationApp(root)
root.mainloop()