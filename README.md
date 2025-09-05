 __  __             _                   _    ___ 
|  \/  | ___  _ __ | | _____ _   _     / \  |_ _|
| |\/| |/ _ \| '_ \| |/ / _ \ | | |   / _ \  | | 
| |  | | (_) | | | |   <  __/ |_| |  / ___ \ | | 
|_|  |_|\___/|_| |_|_|\_\___|\__, | /_/   \_\___|
                             |___/                

# Simian - Your Local Chatbot.

A smart, offline, privacy-first AI assistant that runs locally on your computer using Ollama. No data leaves your machine.

## Features

- ꗃ **100% Private** - Everything runs locally using Ollama
- 🖥 **VS Code Extension** - Integrated coding assistant 
- ᯤ **Web Interface** - Beautiful browser-based chat
- ⚡ **Multiple Models** - Support for LLaMA, CodeLlama, Mistral, and more

##  Quick Start

### One-Command Setup
```bash
node start.js
```

This interactive menu will:
- Auto-start Ollama
- Launch the web interface
- Install the VS Code extension
- Or just run Ollama in the background

### Direct Commands
```bash
node start.js --web        # Start web interface
node start.js --extension  # Install VS Code extension  
node start.js --ollama     # Just start Ollama
node start.js --help       # Show help
```

## 📦 Installation

### Prerequisites
1. **Install Ollama** from [https://ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull llama2`
3. **Install Node.js** (if you don't have it)

### Setup
1. Clone or download this project
2. Run `node start.js` in the project folder
3. Choose your preferred interface!

## Usage

### VS Code Extension
- **Ask Questions**: `Ctrl+Shift+M` (Cmd+Shift+M on Mac)
- **Explain Code**: Select code → `Ctrl+Shift+E` or right-click → "Explain Code"
- **Toggle Modes**: Command Palette → "Monkey: Toggle Local/Cloud Mode"

### Web Interface
- Open `http://localhost:3000` (auto-opens when using `node start.js --web`)
- Chat tab: Ask general questions
- Explain Code tab: Paste code for explanations
- Auto-connects to local Ollama

## Supported Models

### Recommended Models
- **llama2** - General purpose, great for conversations
- **codellama** - Specialized for coding tasks
- **deepseek-coder** - Excellent code understanding
- **mistral** - Fast and efficient
- **phi** - Lightweight option

### Install Models
```bash
ollama pull llama2          # General purpose
ollama pull codellama       # Coding specialist
ollama pull deepseek-coder  # Advanced coding
ollama pull mistral         # Fast responses
```

## 🛠️ Configuration

### VS Code Settings
- `monkeyAI.useOllama`: Use local Ollama (default: true)
- `monkeyAI.ollamaModel`: Which Ollama model to use
- `monkeyAI.apiKey`: API key for cloud mode
- `monkeyAI.autoStart`: Auto-start Ollama when needed

### Web Interface
- Change Ollama URL/port in the web interface
- Select different models from dropdown
- Adjust temperature for creativity

## 📁 Project Structure

```
monkey-ai/
├── 📄 start.js              # ⏻ Main launcher (run this!)
├── 📄 ollama-manager.js     # ⚡ Auto Ollama starter
├── 📄 launch-web.js         # 🌐 Web server launcher
├── 📄 extension.js          # 💻 VS Code extension
├── 📄 package.json          # 📦 Extension manifest
├── 📄 index.html            # 🎨 Web interface
└── 📄 README.md             # 📄 This file
```

## Advanced Usage

### Run Web Interface Only
```bash
node launch-web.js
```

### Run Ollama Manager Only
```bash
node ollama-manager.js
```

### VS Code Extension Development
```bash
# Package extension
vsce package

# Install locally
code --install-extension *.vsix
```

### Custom Ollama Port
If Ollama runs on a different port, update the web interface or extension settings.

## 🆘 Troubleshooting

### "Ollama not found"
- Install Ollama from [https://ollama.ai](https://ollama.ai)
- Make sure it's in your PATH
- Try running `ollama --version`

### "No models available"
- Pull a model: `ollama pull llama2`
- Check available models: `ollama list`

### "Connection failed"
- Check if Ollama is running: `ollama serve`
- Verify port (default: 11434)
- Check firewall settings

### "Extension not working"
- Reload VS Code window
- Check output panel for errors
- Try toggling between local/cloud mode

### Web interface issues
- Check console for errors (F12)
- Verify Ollama is running
- Try different browser

## 🔧 Development

### Adding New Models
1. Pull the model: `ollama pull model-name`
2. Add to the dropdown in `index.html`
3. Add to VS Code settings in `package.json`

### Custom Models
1. Open file monkeyzero-creator.js, this is a template for custom AI models.
2. Replace ${this.baseModel} with your chosen model. For lightweight models, I recommend tinyllama or phi. For any other ones, use gpt-oss, deepseek-r1, or mistral. 

### Customizing the Web Interface
- Edit `index.html` for UI changes
- Modify `launch-web.js` for server behavior
- Update `ollama-manager.js` for Ollama integration

### Extending VS Code Extension
- Add new commands in `package.json`
- Implement handlers in `extension.js`
- Use the `MonkeyAI` class methods

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test with `node start.js`
5. Submit a pull request

## 📜 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for making local AI accessible
- [LLaMA](https://ai.meta.com/llama/) and other model creators
- VS Code team for the excellent extension API

## 💡 Tips

- **Performance**: Larger models (13B) are slower but more capable
- **Privacy**: All processing happens locally, no internet required
- **Models**: Try different models for different tasks
- **Memory**: Monitor RAM usage with larger models
- **Speed**: Use smaller models (7B) for faster responses

---

**Happy coding with Simian!**
