
# Django Management Extension for VS Code 

![Django Extension Logo](./images/logo.png)

### Version: 0.0.1

This **VS Code** extension provides easy access to **Django's management commands** right from the editor, enhancing the developer experience for Django projects.

## Features & Usage

### 🚀 Django > Start/Create/New Project

Initiate a new Django project.

- Shortcut: `Ctrl+Shift+P` > "Django > Start/Create/New Project"
- Note: You can't be inside a project if you want to use this command.
- Note: This will create a django project and automatically `cd` into it within the same VS Code window.

### 📦 Django > Start/Create/New App

Begin a new app within your Django project.

- Shortcut: `Ctrl+Shift+P` > "Django > Start/Create/New App"
- Note: You must be inside the project folder to use this command.

### 🛠 Django > Check Project

Checks the entire Django project for potential problems.

- Shortcut: `Ctrl+Shift+P` > "Django > Check Project"

### 👤 Django > Create/Add Superuser

Creates a superuser account (a user with all permissions).

- Shortcut: `Ctrl+Shift+P` > "Django > Create/Add Superuser"
- Note: This action operates using a custom injected command.
- Note: This action assumes username@example.com email format.

### 🌐 Django > Run/Start Server

Launch the Django development server.

- Shortcut: `Ctrl+Shift+P` > "Django > Run/Start Server"
- Note: this action will try to launch the server on the following ports in order **[8000, 8080, 8001, 8002, 8003, 8004]**

### 🛑 Django > Stop/Kill Running Server

Terminate the running Django development server.

- Shortcut: `Ctrl+Shift+P` > "Django > Stop/Kill Running Server"
- Note: Only kills the process spawned by this extension.

### 🔀 Django > Make Migrations

Generate new migrations based on changes detected.

- Shortcut: `Ctrl+Shift+P` > "Django > Make Migrations"

### 📥 Django > Migrate

Apply migrations to sync the database schema.

- Shortcut: `Ctrl+Shift+P` > "Django > Migrate"

### 📜 Django > Show Migrations

Display a project's migrations and their status.

- Shortcut: `Ctrl+Shift+P` > "Django > Show Migrations"

### 💾 Django > Dump Data

Outputs the contents of the database to a file.

- Shortcut: `Ctrl+Shift+P` > "Django > Dump Data"
- Note: Supported exports are `(json, xml, yaml)`

### 🔄 Django > Load Data

Populate the database with data from a file.

- Shortcut: `Ctrl+Shift+P` > "Django > Load Data"

### 🗑 Django > Flush Database

Reset the database by removing all data and recreating tables.

- Shortcut: `Ctrl+Shift+P` > "Django > Flush Database"
- Note: This action required confirmation.

### 🖥 Django > Open Database Shell (dbshell)

Start the database shell.

- Shortcut: `Ctrl+Shift+P` > "Django > Open Database Shell (dbshell)"

### 🐚 Django > Open Django Shell

Begin the Python interactive interpreter with Django settings imported.

- Shortcut: `Ctrl+Shift+P` > "Django > Open Django Shell"

### 📧 Django > Send Test Email

Dispatch a test email to specified email addresses.

- Shortcut: `Ctrl+Shift+P` > "Django > Send Test Email"
- Note: You might need to set up SMTP server settings first.

### 🗂 Django > Collect Static Files

Amass all static files in your apps to a central location.

- Shortcut: `Ctrl+Shift+P` > "Django > Collect Static Files"
- Note: You might need to set up Static Files first.

### ⌛ Django > Clear Expired Sessions

Clear out expired user sessions.

- Shortcut: `Ctrl+Shift+P` > "Django > Clear Expired Sessions"

### 🔑 Django > Change User Password

Update a user's password.

- Shortcut: `Ctrl+Shift+P` > "Django > Change User Password"

### 📋 Django > Adminify Models

Automatically register all models of a Django app in the admin dashboard.

- Shortcut: `Ctrl+Shift+P` > "Django > Adminify Models"
- Note: You must choose an app first.
- Note: If you already have an admin.py file it will be automatically backed-up before creating the new one.

---

![Django Extension Logo](./images/rocket.gif)

---
## Feedback and Contributions

Feedback, bug reports, and pull requests are welcome. Feel free to contribute and enhance the features of this extension.

Contact me at: contact@hamdiz.me
