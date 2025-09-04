// extension.js - Main extension file with auto Ollama support
const vscode = require('vscode');
const OllamaManager = require('./ollama-manager');

class MonkeyAI {
    constructor() {
        this.ollamaManager = new OllamaManager();
        this.isInitialized = false;
    }

    getApiKey() {
        const config = vscode.workspace.getConfiguration('monkeyAI');
        return config.get('apiKey', '');
    }

    getModel() {
        const config = vscode.workspace.getConfiguration('monkeyAI');
        return config.get('model', 'gpt-3.5-turbo');
    }

    getOllamaModel() {
        const config = vscode.workspace.getConfiguration('monkeyAI');
        return config.get('ollamaModel', 'llama2');
    }

    getUseOllama() {
        const config = vscode.workspace.getConfiguration('monkeyAI');
        return config.get('useOllama', true);
    }

    async ensureOllamaReady() {
        if (!this.getUseOllama()) {
            return true;
        }

        if (this.isInitialized && await this.ollamaManager.isOllamaRunning()) {
            return true;
        }

        try {
            vscode.window.showInformationMessage('🐵 Starting Ollama... This might take a moment.');
            
            await this.ollamaManager.ensureOllamaRunning();
            await this.ollamaManager.ensureModel(this.getOllamaModel());
            
            this.isInitialized = true;
            vscode.window.showInformationMessage('✅ Ollama is ready!');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start Ollama: ${error.message}`);
            
            // Offer to switch to API mode
            const choice = await vscode.window.showWarningMessage(
                'Unable to start Ollama. Would you like to use OpenAI API instead?',
                'Use API', 'Try Again', 'Cancel'
            );
            
            if (choice === 'Use API') {
                await vscode.workspace.getConfiguration('monkeyAI').update('useOllama', false, true);
                vscode.window.showInformationMessage('Switched to API mode. Please set your API key in settings.');
                return true;
            } else if (choice === 'Try Again') {
                return this.ensureOllamaReady();
            }
            
            return false;
        }
    }

    async askQuestionOllama(question) {
        const https = require('https');
        const http = require('http');
        
        const data = JSON.stringify({
            model: this.getOllamaModel(),
            prompt: `You are Monkey, a helpful coding assistant. Keep responses concise.\n\nUser: ${question}\n\nAssistant:`,
            stream: false,
            options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: 300
            }
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = http.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.response) {
                            resolve(parsed.response.trim());
                        } else {
                            reject(new Error('Invalid Ollama response'));
                        }
                    } catch (error) {
                        reject(new Error('Failed to parse Ollama response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Ollama request failed: ${error.message}`));
            });

            req.write(data);
            req.end();
        });
    }

    async askQuestion(question) {
        if (this.getUseOllama()) {
            if (!(await this.ensureOllamaReady())) {
                throw new Error('Ollama is not available');
            }
            return this.askQuestionOllama(question);
        } else {
            return this.askQuestionAPI(question);
        }
    }

    async askQuestionAPI(question) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Please set your API key in settings (MonkeyAI: API Key)');
        }

        const https = require('https');
        
        const data = JSON.stringify({
            model: this.getModel(),
            messages: [
                { role: 'system', content: 'You are Monkey, a helpful coding assistant. Keep responses concise.' },
                { role: 'user', content: question }
            ],
            max_tokens: 150
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.choices && parsed.choices[0]) {
                            resolve(parsed.choices[0].message.content);
                        } else {
                            reject(new Error('Invalid API response'));
                        }
                    } catch (error) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`API request failed: ${error.message}`));
            });

            req.write(data);
            req.end();
        });
    }

    async explainCode(code) {
        const prompt = `Explain this code in simple terms:\n\n${code}`;
        return this.askQuestion(prompt);
    }
}

function activate(context) {
    const monkeyAI = new MonkeyAI();

    // Command: Ask Monkey AI
    let askCommand = vscode.commands.registerCommand('monkey.askQuestion', async () => {
        const question = await vscode.window.showInputBox({
            prompt: 'What would you like to ask Monkey AI?',
            placeHolder: 'Enter your question here...'
        });

        if (question) {
            try {
                vscode.window.showInformationMessage('🐵 Monkey is thinking...');
                const answer = await monkeyAI.askQuestion(question);
                
                // Show answer in a new document for better readability
                const doc = await vscode.workspace.openTextDocument({
                    content: `Monkey's Answer:\n\n${answer}\n\nYour Question:\n${question}`,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc);
                
            } catch (error) {
                vscode.window.showErrorMessage(`Monkey error: ${error.message}`);
            }
        }
    });

    // Command: Explain selected code
    let explainCommand = vscode.commands.registerCommand('monkey.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            vscode.window.showWarningMessage('No code selected');
            return;
        }

        try {
            vscode.window.showInformationMessage('🐵 Monkey is analyzing your code...');
            const explanation = await monkeyAI.explainCode(selectedText);
            
            // Show explanation in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `Monkey's Code Explanation:\n\n${explanation}\n\nOriginal Code:\n${selectedText}`,
                language: 'markdown'
            });
            vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Monkey error: ${error.message}`);
        }
    });

    // Command: Toggle between Ollama and API
    let toggleCommand = vscode.commands.registerCommand('monkey.toggleMode', async () => {
        const currentMode = monkeyAI.getUseOllama() ? 'Ollama (Local)' : 'API (Cloud)';
        const choice = await vscode.window.showQuickPick(
            ['Ollama (Local)', 'API (Cloud)'],
            {
                placeHolder: `Currently using: ${currentMode}. Select mode:`
            }
        );

        if (choice) {
            const useOllama = choice === 'Ollama (Local)';
            await vscode.workspace.getConfiguration('monkeyAI').update('useOllama', useOllama, true);
            vscode.window.showInformationMessage(`Switched to ${choice} mode`);
        }
    });

    // Command: Start Ollama manually
    let startOllamaCommand = vscode.commands.registerCommand('monkey.startOllama', async () => {
        try {
            vscode.window.showInformationMessage('🐵 Starting Ollama...');
            await monkeyAI.ensureOllamaReady();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start Ollama: ${error.message}`);
        }
    });

    context.subscriptions.push(askCommand, explainCommand, toggleCommand, startOllamaCommand);

    // Auto-start Ollama if using local mode
    if (monkeyAI.getUseOllama()) {
        setTimeout(() => {
            monkeyAI.ensureOllamaReady().catch(() => {
                // Silently fail on startup, user can manually trigger later
            });
        }, 2000);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};