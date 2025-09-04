// launch-web.js - Launch web interface with auto Ollama
const OllamaManager = require('./ollama-manager');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class WebLauncher {
    constructor() {
        this.ollamaManager = new OllamaManager();
        this.serverProcess = null;
    }

    async startServer() {
        const port = 3000;
        
        // Simple HTTP server for the web interface
        const http = require('http');
        const url = require('url');
        
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url);
            let filePath = path.join(__dirname, parsedUrl.pathname);
            
            // Serve index.html by default
            if (parsedUrl.pathname === '/') {
                filePath = path.join(__dirname, 'index.html');
            }
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('404 Not Found');
                return;
            }
            
            // Set content type based on file extension
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.ico': 'image/x-icon'
            };
            
            const contentType = contentTypes[ext] || 'text/plain';
            
            // Read and serve file
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('500 Internal Server Error');
                    return;
                }
                
                res.writeHead(200, { 
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(data);
            });
        });
        
        server.listen(port, () => {
            console.log(`🌐 Web interface running at http://localhost:${port}`);
        });
        
        return server;
    }

    async openBrowser() {
        const { exec } = require('child_process');
        const url = 'http://localhost:3000';
        
        let command;
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open ${url}`;
                break;
            case 'win32': // Windows
                command = `start ${url}`;
                break;
            default: // Linux
                command = `xdg-open ${url}`;
                break;
        }
        
        exec(command, (error) => {
            if (error) {
                console.log(`Please open ${url} in your browser`);
            } else {
                console.log(`🚀 Opened ${url} in your browser`);
            }
        });
    }

    async launch() {
        console.log('🐵 Starting Monkey AI Web Interface...\n');
        
        try {
            // Step 1: Start Ollama
            console.log('📡 Checking Ollama...');
            await this.ollamaManager.ensureOllamaRunning();
            console.log('✅ Ollama is running\n');
            
            // Step 2: Ensure we have a model
            console.log('🤖 Checking for models...');
            await this.ollamaManager.ensureModel('llama2');
            console.log('✅ Model is ready\n');
            
            // Step 3: Start web server
            console.log('🌐 Starting web server...');
            await this.startServer();
            
            // Step 4: Open browser
            setTimeout(() => {
                this.openBrowser();
            }, 1000);
            
            console.log('\n🎉 Everything is ready!');
            console.log('Press Ctrl+C to stop\n');
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down...');
                this.ollamaManager.stopOllama();
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ Failed to start:', error.message);
            
            if (error.message.includes('not found')) {
                console.log('\n💡 Installation help:');
                console.log('1. Download Ollama from: https://ollama.ai');
                console.log('2. Install and run: ollama pull llama2');
                console.log('3. Then run this script again');
            }
            
            process.exit(1);
        }
    }
}

// Create launcher with command line options
if (require.main === module) {
    const args = process.argv.slice(2);
    const launcher = new WebLauncher();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🐵 Monkey AI Web Launcher

Usage:
  node launch-web.js [options]

Options:
  --help, -h     Show this help message
  --no-browser   Don't auto-open browser
  --port PORT    Use custom port (default: 3000)

Examples:
  node launch-web.js              # Start with default settings
  node launch-web.js --no-browser # Start without opening browser
        `);
        process.exit(0);
    }
    
    launcher.launch();
}