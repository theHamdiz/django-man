// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as child_process from "child_process";
import * as fs from "fs";

function isDjangoProject(dir: string): boolean {
	return fs.existsSync(`${dir}/manage.py`);
}

let serverProcess: child_process.ChildProcess | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, "django-man" is now active in your editor!');

	// This command starts a new django project only if you're not inside one.
	// And if the name of the project doesn't already exist!
	let startproject = vscode.commands.registerCommand(
		"django-man.startproject",
		() => {
			const currentDir = vscode.workspace.workspaceFolders
				? vscode.workspace.workspaceFolders[0].uri.fsPath
				: undefined;

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
	);

	let startapp = vscode.commands.registerCommand("django-man.startapp", () => {
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
	});

	let runserver = vscode.commands.registerCommand('django-man.runserver', async () => {

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
	});

	let stopserver = vscode.commands.registerCommand('django-man.stopserver', () => {
		console.log('Stopping server');
		if (serverProcess) {
			serverProcess.kill('SIGTERM');
			vscode.window.showInformationMessage('Django server stopped.');
			serverProcess = null;
		} else {
			vscode.window.showErrorMessage('Django server is not running.');
		}
	});

	let makemigrations = vscode.commands.registerCommand(
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
	);

	let migrate = vscode.commands.registerCommand("django-man.migrate", () => {
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
	});


	context.subscriptions.push(startproject);
	context.subscriptions.push(startapp);
	context.subscriptions.push(runserver);
	context.subscriptions.push(makemigrations);
	context.subscriptions.push(migrate);
	context.subscriptions.push(stopserver);
}

// This method is called when your extension is deactivated
export function deactivate() { }
