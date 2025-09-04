#!/usr/bin/env node
// start.js - One-click startup for Monkey AI

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(`
🐵 Monkey AI Startup
====================
`);

// Check what we have
const hasExtension = fs.existsSync('extension.js');
const hasWebInterface = fs.existsSync('index.html');
const hasOllamaManager = fs.existsSync('ollama-manager.js');

if (!hasOllamaManager) {
    console.error('❌ ollama-manager.js not found!');
    process.exit(1);
}

async function showMenu() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log('What would you like to do?\n');
        
        let options = [];
        let optionNum = 1;

        if (hasWebInterface) {
            console.log(`${optionNum}. Start Web Interface 🌐`);
            options[optionNum] = 'web';
            optionNum++;
        }

        if (hasExtension) {
            console.log(`${optionNum}. Install VS Code Extension 📦`);
            options[optionNum] = 'extension';
            optionNum++;
        }

        console.log(`${optionNum}. Just start Ollama 🚀`);
        options[optionNum] = 'ollama';
        optionNum++;

        console.log(`${optionNum}. Help & Info ℹ️`);
        options[optionNum] = 'help';

        console.log('\nEnter your choice (1-' + (optionNum) + '):');

        rl.question('> ', (answer) => {
            rl.close();
            const choice = options[parseInt(answer)];
            resolve(choice || 'help');
        });
    });
}

async function startWeb() {
    console.log('🌐 Starting web interface...\n');
    
    const webLauncher = require('./launch-web.js');
    // This will be handled by launch-web.js
}

async function installExtension() {
    console.log('📦 Installing VS Code extension...\n');
    
    const { exec } = require('child_process');
    
    // Package the extension
    exec('vsce package', (error, stdout, stderr) => {
        if (error) {
            console.log('Installing via development mode...');
            console.log('1. Open VS Code');
            console.log('2. Press F1 and type "Developer: Install Extension from Location"');
            console.log(`3. Select this folder: ${process.cwd()}`);
            console.log('\nOr run: code --install-extension .');
        } else {
            console.log('✅ Extension packaged!');
            console.log('Installing...');
            
            exec('code --install-extension *.vsix', (installError) => {
                if (installError) {
                    console.log('Please install manually:');
                    console.log('1. Open VS Code');
                    console.log('2. Go to Extensions (Ctrl+Shift+X)');
                    console.log('3. Click "..." → Install from VSIX');
                    console.log('4. Select the .vsix file in this folder');
                } else {
                    console.log('✅ Extension installed!');
                    console.log('Use Ctrl+Shift+M to ask Monkey AI questions');
                }
            });
        }
    });
}

async function startOllama() {
    console.log('🚀 Starting Ollama...\n');
    
    const OllamaManager = require('./ollama-manager');
    const manager = new OllamaManager();
    
    try {
        await manager.ensureOllamaRunning();
        await manager.ensureModel('llama2');
        
        console.log('✅ Ollama is ready!');
        console.log('🌐 API available at: http://localhost:11434');
        console.log('\nPress Ctrl+C to stop');
        
        // Keep running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping Ollama...');
            manager.stopOllama();
            process.exit(0);
        });
        
        // Keep the process alive
        setInterval(() => {}, 1000);
        
    } catch (error) {
        console.error('❌ Failed to start Ollama:', error.message);
        showHelp();
    }
}

function showHelp() {
    console.log(`
🐵 Monkey AI Help
================

What is this?
- A local AI assistant that runs on your computer
- Uses Ollama for privacy (no data sent to cloud)
- Works in VS Code and web browser

Setup Steps:
1. Install Ollama: https://ollama.ai
2. Run: ollama pull llama2
3. Run this script: node start.js

Available Models:
- llama2 (general purpose, recommended)
- codellama (better for coding)
- mistral (fast and efficient)
- deepseek-coder (excellent for code)

Troubleshooting:
- "Connection failed" → Install Ollama first
- "Model not found" → Run: ollama pull llama2
- "Port in use" → Change port in config
- Still issues? → Check https://ollama.ai/docs

Files in this project:
${hasExtension ? '✅' : '❌'} extension.js - VS Code extension
${hasWebInterface ? '✅' : '❌'} index.html - Web interface
✅ ollama-manager.js - Auto Ollama starter
✅ start.js - This startup script

Happy coding! 🚀
`);
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    if (args.includes('--web')) {
        if (hasWebInterface) {
            require('./launch-web.js');
        } else {
            console.log('❌ Web interface not found (index.html missing)');
        }
        return;
    }
    
    if (args.includes('--extension')) {
        await installExtension();
        return;
    }
    
    if (args.includes('--ollama')) {
        await startOllama();
        return;
    }
    
    // Interactive menu
    const choice = await showMenu();
    
    switch (choice) {
        case 'web':
            if (hasWebInterface) {
                require('./launch-web.js');
            } else {
                console.log('❌ Web interface not found');
            }
            break;
        case 'extension':
            await installExtension();
            break;
        case 'ollama':
            await startOllama();
            break;
        default:
            showHelp();
            break;
    }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('💥 Unexpected error:', error.message);
    console.log('\n🆘 Try running with --help for troubleshooting');
    process.exit(1);
});

main().catch(console.error);
