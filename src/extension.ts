import * as vscode from "vscode";
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from 'path';
import { changePasswordPythonCommand, djangoManCreateSuperUserCommand } from './injectables';

/** Looks for a manage.py file inside the given directory & determines if it's a django project or not. */
function isDjangoProject(dir: string): boolean {
	return fs.existsSync(`${dir}/manage.py`);
}

/** Injects a custom createsuperuser command into the project's main app! */
function injectPythonCommand(currentDir: string, projectName: string, command: string) {
	const commandsDir = path.join(currentDir, projectName, 'management', 'commands');

	// Ensure the directory exists
	if (!fs.existsSync(commandsDir)) {
		fs.mkdirSync(commandsDir, { recursive: true });
	}

	let comandFile: string = command === 'createsuperuser' ? 'djcsu.py' : 'djmcp.py';

	let commandContent: string = command === 'createsuperuser' ? djangoManCreateSuperUserCommand : changePasswordPythonCommand;

	// Path for the custom command file
	const commandFilePath = path.join(commandsDir, comandFile);

	// Inject the custom django command file
	fs.writeFileSync(commandFilePath, commandContent, 'utf8');
}

/** Adds the project's main app to the INSTALLED_APPS if it wasn't added already! */
function addAppToInstalledApps(currentDir: string, projectName: string) {
	const settingsPath = path.join(currentDir, projectName, 'settings.py');

	// Check if settings.py exists
	if (fs.existsSync(settingsPath)) {
		const settingsContent = fs.readFileSync(settingsPath, 'utf8');
		const appPresent = settingsContent.includes(`"${projectName}"`);

		// If app's name isn't present, add it to the INSTALLED_APPS list
		if (!appPresent) {
			const updatedContent = settingsContent.replace('INSTALLED_APPS = [', `INSTALLED_APPS = [\n    "${projectName}",`);
			fs.writeFileSync(settingsPath, updatedContent, 'utf8');
		}
	}
}

let serverProcess: child_process.ChildProcess | null = null;

let registerAllModels: string = ``;

export function activate(context: vscode.ExtensionContext) {
	let startProjectCommand = vscode.commands.registerCommand(
		"django-man.startproject",
		() => {
			const currentDir = vscode.workspace.workspaceFolders
				? vscode.workspace.workspaceFolders[0].uri.fsPath
				: undefined;
			if (currentDir && isDjangoProject(currentDir)) {
				vscode.window.showErrorMessage("You can't start a project within another project, did you mean start app?");
				return;
			}
			if (currentDir && !isDjangoProject(currentDir)) {
				vscode.window
					.showInputBox({
						prompt: "Enter the name for your new Django project:",
					})
					.then((name) => {
						if (name) {
							// Check if project directory already exists
							if (fs.existsSync(`${currentDir}/${name}`)) {
								vscode.window.showErrorMessage(
									`Project named '${name}' already exists.`
								);
								return;
							}

							child_process.exec(
								`django-admin startproject ${name}`,
								{ cwd: currentDir },
								(error, stdout, stderr) => {
									if (error) {
										vscode.window.showErrorMessage(
											`Error starting project: ${stderr}`
										);
										return;
									}

									vscode.window.showInformationMessage(
										`Started new project: ${name}`
									);

									// Change to the new project directory and launch VS Code
									child_process.exec(
										`code --reuse-window ${currentDir}/${name}`,
										(error, stdout, stderr) => {
											if (error) {
												vscode.window.showErrorMessage(
													`Error opening project in VS Code: ${stderr}`
												);
												return;
											}
										}
									);
								}
							);
						} else {
							vscode.window.showErrorMessage("Please provide a project name.");
						}
					});
			} else {
				vscode.window.showErrorMessage("You are not in a valid directory.");
			}
		}
	); // TESTED

	let startAppCommand = vscode.commands.registerCommand("django-man.startapp", () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		if (currentDir && isDjangoProject(currentDir)) {
			vscode.window
				.showInputBox({ prompt: "Enter the name for your new Django app:" })
				.then((name) => {
					if (name) {
						child_process.exec(
							`python manage.py startapp ${name}`,
							{ cwd: currentDir },
							(error, stdout, stderr) => {
								if (error) {
									vscode.window.showErrorMessage(
										`Error starting app: ${stderr}`
									);
									return;
								}
								vscode.window.showInformationMessage(
									`Started new app: ${name}`
								);
							}
						);
					} else {
						vscode.window.showErrorMessage("Please provide an app name.");
					}
				});
		} else {
			vscode.window.showErrorMessage(
				"You are not inside a Django project directory. Ensure that the directory contains a manage.py file."
			);
		}
	}); // TESTED

	let runServerCommand = vscode.commands.registerCommand('django-man.runserver', async () => {

		const currentDir = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

		if (currentDir && isDjangoProject(currentDir)) {
			const ports = [8000, 8080, 8001, 8002, 8003, 8004]; // List of ports to try
			let portIndex = 0;

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Starting Django Server",
				cancellable: true
			}, async (progress, token) => {
				token.onCancellationRequested(() => {
					// Handle user cancellation
					if (serverProcess) {
						serverProcess.kill('SIGTERM');
						serverProcess = null;
					}
				});

				const tryRunServer = async () => {
					if (portIndex < ports.length) {
						const port = ports[portIndex];
						progress.report({ message: `Trying to run server on port ${port}...` });

						serverProcess = child_process.exec(`python manage.py runserver ${port}`, { cwd: currentDir }, (error, stdout, stderr) => {
							if (error && stderr.includes("port")) {
								portIndex++;
								tryRunServer(); // Try the next port
							} else if (error) {
								vscode.window.showErrorMessage(`Error running server: ${stderr}`);
							} else {
								progress.report({ message: `Server is running on port ${port}.` });
							}
						});
					} else {
						vscode.window.showErrorMessage('All tried ports are in use. Please check your system.');
					}
				};

				await tryRunServer();
			});
		} else {
			vscode.window.showErrorMessage('You are not inside a Django project directory. Ensure that the directory contains a manage.py file.');
		}
	}); //TESTED

	let stopServerCommand = vscode.commands.registerCommand('django-man.stopserver', () => {
		if (serverProcess) {
			serverProcess.kill('SIGTERM');
			vscode.window.showInformationMessage('Django server stopped.');
			serverProcess = null;
		} else {
			vscode.window.showErrorMessage('Django server is not running.');
		}
	}); //TESTED

	let makeMigrationsCommand = vscode.commands.registerCommand(
		"django-man.makemigrations",
		() => {
			const currentDir = vscode.workspace.workspaceFolders
				? vscode.workspace.workspaceFolders[0].uri.fsPath
				: undefined;
			if (currentDir && isDjangoProject(currentDir)) {
				child_process.exec(
					"python manage.py makemigrations",
					{ cwd: currentDir },
					(error, stdout, stderr) => {
						if (error) {
							vscode.window.showErrorMessage(
								`Error making migrations: ${stderr}`
							);
							return;
						}
						vscode.window.showInformationMessage("Made migrations.");
					}
				);
			} else {
				vscode.window.showErrorMessage("You're not inside a project folder!");
			}
		}
	); //TESTED

	let migrateCommand = vscode.commands.registerCommand("django-man.migrate", () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		if (currentDir && isDjangoProject(currentDir)) {
			child_process.exec(
				"python manage.py migrate",
				{ cwd: currentDir },
				(error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(
							`Error applying migrations: ${stderr}`
						);
						return;
					}
					vscode.window.showInformationMessage("Migrations applied.");
				}
			);
		} else {
			vscode.window.showErrorMessage("You're not inside a project folder!");
		}
	}); //TESTED

	let checkCommand = vscode.commands.registerCommand('django-man.check', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		if (currentDir && isDjangoProject(currentDir)) {
			child_process.exec(`python manage.py check`, { cwd: currentDir }, (error, stdout, stderr) => {
				if (error) {
					vscode.window.showErrorMessage(`Error checking project: ${stderr}`);
				} else {
					vscode.window.showInformationMessage(stdout);
				}
			});
		}
	}); //TESTED

	let createSuperUserCommand = vscode.commands.registerCommand('django-man.createsuperuser', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		if (currentDir && isDjangoProject(currentDir)) {
			const projectName = path.basename(currentDir);

			injectPythonCommand(currentDir, projectName, "createsuperuser");

			addAppToInstalledApps(currentDir, projectName);

			// Now, get the username and password, and call the custom command
			vscode.window.showInputBox({ prompt: 'Enter the username for the superuser:' }).then(username => {
				if (username) {
					vscode.window.showInputBox({ prompt: 'Enter the password for the superuser:', password: true }).then(password => {
						if (password) {
							child_process.exec(`python manage.py djmcsu --username "${username}" --password "${password}"`, { cwd: currentDir }, (error, stdout, stderr) => {
								if (error) {
									vscode.window.showErrorMessage(`Error creating superuser: ${stderr}`);
								} else {
									vscode.window.showInformationMessage('Superuser created successfully!');
								}
							});
						} else {
							vscode.window.showErrorMessage('Please provide a password.');
						}
					});
				} else {
					vscode.window.showErrorMessage('Please provide a username.');
				}
			});
		}
	}); //TESTED

	let dumpDataCommand = vscode.commands.registerCommand('django-man-dumpdata', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		// Ask for format (json, xml, yaml)
		vscode.window.showQuickPick(['json', 'xml', 'yaml'], { placeHolder: 'Choose a format' }).then(format => {
			if (format) {
				child_process.exec(`python manage.py dumpdata --format=${format} > data.${format}`, { cwd: currentDir }, (error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(`Error dumping data: ${stderr}`);
					} else {
						vscode.window.showInformationMessage('Data dumped successfully!');
					}
				});
			}
		});
	}); //TESTED

	let loadDataCommand = vscode.commands.registerCommand('django-man-loaddata', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		// Ask for the file path
		vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Data Files': ['json', 'xml', 'yaml'] } }).then(fileUri => {
			if (fileUri && fileUri[0]) {
				const filePath = fileUri[0].fsPath;
				child_process.exec(`python manage.py loaddata ${filePath}`, { cwd: currentDir }, (error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(`Error loading data: ${stderr}`);
					} else {
						vscode.window.showInformationMessage('Data loaded successfully!');
					}
				});
			}
		});
	}); //TESTED

	let shellCommand = vscode.commands.registerCommand('django-man-shell', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		const terminal = vscode.window.createTerminal('Django Shell');
		terminal.show();
		terminal.sendText(`cd "${currentDir}" && python manage.py shell`);
	}); // TESTED

	let dbShellCommand = vscode.commands.registerCommand('django-man-dbshell', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		const terminal = vscode.window.createTerminal('Database Shell');
		terminal.show();
		terminal.sendText(`cd "${currentDir}" && python manage.py dbshell`);
	}); // TESTED

	let flushCommand = vscode.commands.registerCommand('django-man-flush', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		vscode.window.showWarningMessage('Are you sure you want to reset the database?', 'Yes', 'No').then(selection => {
			if (selection === 'Yes') {
				child_process.exec(`python manage.py flush --noinput`, { cwd: currentDir }, (error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(`Error resetting the database: ${stderr}`);
					} else {
						vscode.window.showInformationMessage('Database reset successfully!');
					}
				});
			}
		});
	}); //TESTED

	let sendTestEmailCommand = vscode.commands.registerCommand('django-man-sendtestemail', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

		vscode.window.showInputBox({ prompt: 'Enter email addresses (comma-separated):' }).then(emails => {
			if (emails) {
				child_process.exec(`python manage.py sendtestemail "${emails.split(',').join(' ')}"`, { cwd: currentDir }, (error, stdout, stderr) => {
					if (error) {
						const detailedErrorMessage =
							`Error sending test email. Possible issues:
						
						1. SMTP Server Not Running: Ensure it's running and listening on the expected port.
						2. SMTP Configuration: Check your Django project's settings for the email configurations.
						3. Firewall or Network Issues: Ensure there are no firewall rules or network issues preventing the connection.
						4. Use a Dummy Backend for Development: Consider using Django's dummy email backend.
						5. Credentials: Ensure EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are set correctly.
						6. Use a Third-Party Service: Consider using services like Mailtrap for testing email sending in development.
						
						For more details, check the terminal or logs.`;
						vscode.window.showErrorMessage(detailedErrorMessage);
					} else {
						vscode.window.showInformationMessage('Test email sent successfully!');
					}
				});
			}
		});
	}); //TESTED

	let showMigrationsCommand = vscode.commands.registerCommand('django-man-showmigrations', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		child_process.exec(`python manage.py showmigrations`, { cwd: currentDir }, (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error showing migrations: ${stderr}`);
			} else {
				vscode.window.showInformationMessage(stdout);
			}
		});
	}); // TESTED

	let collectStaticCommand = vscode.commands.registerCommand('django-man-collectstatic', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		child_process.exec(`python manage.py collectstatic --noinput`, { cwd: currentDir }, (error, stdout, stderr) => {
			if (error) {
				const staticFilesErrorMessage = `
Error collecting static files. Possible issues and fixes:

1. Ensure you have STATIC_URL defined in your settings. E.g., STATIC_URL = '/static/'
2. If you're using the collectstatic command, ensure you have STATIC_ROOT defined. This should be the absolute path to the directory where collectstatic will collect static files for deployment. E.g., STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
3. Ensure 'django.contrib.staticfiles' is in the INSTALLED_APPS list in your settings.
4. Ensure 'django.middleware.static.StaticFilesMiddleware' is in the MIDDLEWARE list in your settings.
5. Check file permissions. The user running the Django management command should have the necessary permissions to read, write, and execute within the directories.
6. If using a custom storage backend for static files, ensure it's correctly configured.

Check your Django project settings and permissions, then try again.
`;

				// Later in the code, when the error occurs:
				vscode.window.showErrorMessage(staticFilesErrorMessage);

			} else {
				vscode.window.showInformationMessage('Static files collected successfully!');
			}
		});
	}); // TESTED

	let clearSessionsCommand = vscode.commands.registerCommand('django-man-clearsessions', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		child_process.exec(`python manage.py clearsessions`, { cwd: currentDir }, (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error clearing sessions: ${stderr}`);
			} else {
				vscode.window.showInformationMessage('Sessions cleared successfully!');
			}
		});
	}); // TESTED

	let changePasswordCommand = vscode.commands.registerCommand('django-man-changepassword', () => {
		const currentDir = vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
		vscode.window.showInputBox({ prompt: 'Enter the username:' }).then(username => {
			if (username && currentDir) {
				const projectName = path.basename(currentDir);
				injectPythonCommand(currentDir, projectName, "changeuserpassword");

				vscode.window.showInputBox({ prompt: 'Enter the new password:', password: true }).then(password => {
					if (password) {
						child_process.exec(`python manage.py djmcp --username "${username}" --password "${password}"`, { cwd: currentDir }, (error, stdout, stderr) => {
							if (error) {
								vscode.window.showErrorMessage(`Error changing password: ${stderr}`);
							} else {
								vscode.window.showInformationMessage('Password changed successfully!');
							}
						});
					}
				});
			}
		});
	}); // TESTED

	let adminifyModels = vscode.commands.registerCommand('django-man.adminifyModels', () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage("No workspace is currently opened.");
			return;
		}

		const currentDir = workspaceFolders[0].uri.fsPath;
		fs.readdir(currentDir, { withFileTypes: true }, (err, items) => {
			if (err) {
				vscode.window.showErrorMessage("Error reading the directory.");
				return;
			}

			const folders = items.filter(item => item.isDirectory()).map(folder => folder.name);

			vscode.window.showQuickPick(folders, { placeHolder: 'Select a folder' }).then(folderName => {
				if (folderName) {
					const adminFilePath = path.join(currentDir, folderName, 'admin.py');

					// Backup existing admin.py
					if (fs.existsSync(adminFilePath)) {
						fs.renameSync(adminFilePath, path.join(currentDir, folderName, 'admin-backup.py'));
					}

					// Write the new admin.py
					const adminContent = `from django.contrib import admin
from django.apps import apps
[admin.site.register(model) for model in apps.get_app_config('${folderName}').get_models()]`;

					fs.writeFileSync(adminFilePath, adminContent);
					vscode.window.showInformationMessage('admin.py has been generated successfully!');
				}
			});
		});
	}); // TESTED

	context.subscriptions.push(startProjectCommand,
		startAppCommand,
		runServerCommand,
		makeMigrationsCommand,
		migrateCommand,
		dumpDataCommand,
		loadDataCommand,
		dbShellCommand,
		shellCommand,
		stopServerCommand,
		checkCommand,
		createSuperUserCommand,
		flushCommand,
		sendTestEmailCommand,
		showMigrationsCommand,
		collectStaticCommand,
		clearSessionsCommand,
		changePasswordCommand,
		adminifyModels);
}

// This method is called when your extension is deactivated
export function deactivate() { }
