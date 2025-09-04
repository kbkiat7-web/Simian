// ollama-manager.js - Auto-start Ollama when needed
const { spawn, exec } = require('child_process');
const { platform } = require('os');
const path = require('path');

class OllamaManager {
    constructor() {
        this.ollamaProcess = null;
        this.isStarting = false;
        this.defaultPort = 11434;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
    }

    // Check if Ollama is already running
    async isOllamaRunning(port = this.defaultPort) {
        return new Promise((resolve) => {
            const testUrl = `http://localhost:${port}/api/tags`;
            
            // Use fetch if available, otherwise fall back to a simple check
            if (typeof fetch !== 'undefined') {
                fetch(testUrl, { 
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                })
                .then(response => resolve(response.ok))
                .catch(() => resolve(false));
            } else {
                // For Node.js environment
                const http = require('http');
                const req = http.get(`http://localhost:${port}/api/tags`, {
                    timeout: 3000
                }, (res) => {
                    resolve(res.statusCode === 200);
                });
                
                req.on('error', () => resolve(false));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });
            }
        });
    }

    // Find Ollama executable path
    getOllamaPath() {
        const os = platform();
        
        if (os === 'win32') {
            // Windows paths
            const possiblePaths = [
                'ollama.exe',
                'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Ollama\\ollama.exe',
                'C:\\Program Files\\Ollama\\ollama.exe',
                'C:\\Program Files (x86)\\Ollama\\ollama.exe'
            ];
            return possiblePaths;
        } else if (os === 'darwin') {
            // macOS paths
            return [
                '/usr/local/bin/ollama',
                '/opt/homebrew/bin/ollama',
                '~/Applications/Ollama.app/Contents/Resources/ollama'
            ];
        } else {
            // Linux/Unix paths
            return [
                '/usr/local/bin/ollama',
                '/usr/bin/ollama',
                '~/.local/bin/ollama',
                './ollama'
            ];
        }
    }

    // Start Ollama server
    async startOllama() {
        if (this.isStarting) {
            console.log('Ollama is already starting...');
            return;
        }

        if (await this.isOllamaRunning()) {
            console.log('Ollama is already running');
            return true;
        }

        this.isStarting = true;
        console.log('Starting Ollama server...');

        return new Promise((resolve, reject) => {
            const paths = this.getOllamaPath();
            let pathIndex = 0;

            const tryNextPath = () => {
                if (pathIndex >= paths.length) {
                    this.isStarting = false;
                    reject(new Error('Ollama executable not found. Please install Ollama first.'));
                    return;
                }

                const ollamaPath = paths[pathIndex++];
                console.log(`Trying to start Ollama at: ${ollamaPath}`);

                // Test if the path exists first
                exec(`"${ollamaPath}" --version`, (error) => {
                    if (error) {
                        console.log(`Path ${ollamaPath} not found, trying next...`);
                        tryNextPath();
                        return;
                    }

                    // Start Ollama serve
                    this.ollamaProcess = spawn(ollamaPath, ['serve'], {
                        detached: true,
                        stdio: ['ignore', 'pipe', 'pipe']
                    });

                    this.ollamaProcess.stdout.on('data', (data) => {
                        console.log(`Ollama: ${data}`);
                    });

                    this.ollamaProcess.stderr.on('data', (data) => {
                        console.log(`Ollama stderr: ${data}`);
                    });

                    this.ollamaProcess.on('error', (error) => {
                        console.error('Failed to start Ollama:', error.message);
                        this.isStarting = false;
                        tryNextPath();
                    });

                    this.ollamaProcess.on('exit', (code) => {
                        console.log(`Ollama process exited with code ${code}`);
                        this.ollamaProcess = null;
                        this.isStarting = false;
                    });

                    // Wait a bit and check if it's running
                    setTimeout(async () => {
                        this.isStarting = false;
                        if (await this.isOllamaRunning()) {
                            console.log('✅ Ollama started successfully!');
                            resolve(true);
                        } else {
                            console.log('Failed to start Ollama, trying next path...');
                            if (this.ollamaProcess) {
                                this.ollamaProcess.kill();
                                this.ollamaProcess = null;
                            }
                            tryNextPath();
                        }
                    }, 3000);
                });
            };

            tryNextPath();
        });
    }

    // Ensure Ollama is running (start if not)
    async ensureOllamaRunning() {
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                if (await this.isOllamaRunning()) {
                    return true;
                }
                
                console.log(`Attempt ${retries + 1}/${this.maxRetries} to start Ollama...`);
                await this.startOllama();
                
                // Wait a bit more and verify
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                
                if (await this.isOllamaRunning()) {
                    return true;
                }
                
                retries++;
            } catch (error) {
                console.error(`Start attempt ${retries + 1} failed:`, error.message);
                retries++;
                
                if (retries < this.maxRetries) {
                    console.log(`Waiting ${this.retryDelay/1000}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        
        throw new Error(`Failed to start Ollama after ${this.maxRetries} attempts`);
    }

    // Stop Ollama (if we started it)
    stopOllama() {
        if (this.ollamaProcess) {
            console.log('Stopping Ollama...');
            this.ollamaProcess.kill('SIGTERM');
            this.ollamaProcess = null;
        }
    }

    // Auto-pull a default model if none exist
    async ensureModel(modelName = 'llama2') {
        try {
            // Check if any models are available
            const response = await fetch('http://localhost:11434/api/tags');
            const data = await response.json();
            
            if (!data.models || data.models.length === 0) {
                console.log(`No models found. Pulling ${modelName}...`);
                
                return new Promise((resolve, reject) => {
                    const paths = this.getOllamaPath();
                    const ollamaPath = paths[0]; // Use first available path
                    
                    const pullProcess = spawn(ollamaPath, ['pull', modelName], {
                        stdio: 'inherit'
                    });
                    
                    pullProcess.on('exit', (code) => {
                        if (code === 0) {
                            console.log(`✅ Successfully pulled ${modelName}`);
                            resolve(true);
                        } else {
                            reject(new Error(`Failed to pull ${modelName}`));
                        }
                    });
                    
                    pullProcess.on('error', (error) => {
                        reject(new Error(`Error pulling ${modelName}: ${error.message}`));
                    });
                });
            }
            
            return true;
        } catch (error) {
            console.warn('Could not check/pull models:', error.message);
            return false;
        }
    }
}

// Export for use in other files
module.exports = OllamaManager;

// Browser-compatible version for web interface
if (typeof window !== 'undefined') {
    window.OllamaManager = class BrowserOllamaManager {
        constructor() {
            this.defaultPort = 11434;
            this.maxRetries = 3;
            this.retryDelay = 2000;
        }

        async isOllamaRunning(port = this.defaultPort) {
            try {
                const response = await fetch(`http://localhost:${port}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });
                return response.ok;
            } catch {
                return false;
            }
        }

        async startOllamaInstructions() {
            const os = navigator.platform.toLowerCase();
            let instructions = 'To start Ollama manually:\n\n';
            
            if (os.includes('win')) {
                instructions += '1. Open Command Prompt or PowerShell\n2. Run: ollama serve\n3. Or start Ollama from the Start Menu';
            } else if (os.includes('mac')) {
                instructions += '1. Open Terminal\n2. Run: ollama serve\n3. Or start Ollama.app from Applications';
            } else {
                instructions += '1. Open Terminal\n2. Run: ollama serve\n3. Make sure Ollama is installed first';
            }
            
            return instructions;
        }

        async ensureOllamaRunning() {
            if (await this.isOllamaRunning()) {
                return true;
            }
            
            // Can't auto-start in browser, show instructions
            const instructions = await this.startOllamaInstructions();
            throw new Error(`Ollama not running.\n\n${instructions}`);
        }
    };
}

// If running directly, start Ollama
if (require.main === module) {
    const manager = new OllamaManager();
    
    manager.ensureOllamaRunning()
        .then(() => {
            console.log('🎉 Ollama is ready!');
            return manager.ensureModel('llama2');
        })
        .then(() => {
            console.log('🚀 All set! Ollama is running with models available.');
            
            // Keep the process alive
            process.on('SIGINT', () => {
                manager.stopOllama();
                process.exit(0);
            });
        })
        .catch(error => {
            console.error('❌ Failed to setup Ollama:', error.message);
            process.exit(1);
        });
}