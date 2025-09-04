// monkeyzero-creator.js - Create a customized MonkeyZero-Mini model
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class MonkeyZeroCreator {
    constructor() {
        this.modelName = 'monkeyzero-mini';
        this.baseModel = 'tinyllama'; // Lightweight base model
        this.customSystemPrompt = `You are MonkeyZero-Mini, an ultra-lightweight coding assistant. You:
- Give concise, practical answers
- Focus on coding problems and solutions
- Use simple, clear language
- Avoid long explanations unless asked
- Prioritize accuracy over verbosity
- Always include working code examples when relevant`;
    }

    // Create a custom Modelfile for our MonkeyZero-Mini
    createModelfile() {
        const modelfile = `FROM ${this.baseModel}

# Set custom system prompt
SYSTEM """${this.customSystemPrompt}"""

# Optimize for coding tasks
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER top_k 20
PARAMETER repeat_penalty 1.1
PARAMETER num_predict 300

# Custom stop sequences for cleaner responses
PARAMETER stop "User:"
PARAMETER stop "Human:"
PARAMETER stop "### Instruction:"

# Template for consistent responses
TEMPLATE """{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
<|assistant|>
{{ end }}{{ .Response }}"""`;

        return modelfile;
    }

    // Create training data for fine-tuning
    createTrainingData() {
        const trainingData = [
            {
                instruction: "Explain this JavaScript function",
                input: "function add(a, b) { return a + b; }",
                output: "This function takes two parameters (a, b) and returns their sum. Simple addition function."
            },
            {
                instruction: "Fix this Python code",
                input: "def greet(name)\n    print('Hello ' + name)",
                output: "Missing colon and proper string formatting:\n\n```python\ndef greet(name):\n    print(f'Hello {name}')\n```"
            },
            {
                instruction: "What does this CSS do?",
                input: ".container { display: flex; justify-content: center; }",
                output: "Creates a flexbox container that horizontally centers its child elements."
            },
            {
                instruction: "Create a simple HTML button",
                input: "",
                output: "```html\n<button onclick=\"alert('Clicked!')\">Click Me</button>\n```"
            },
            {
                instruction: "Explain async/await",
                input: "",
                output: "async/await makes asynchronous code look synchronous. 'async' marks a function as asynchronous, 'await' pauses execution until a promise resolves."
            }
        ];

        // Convert to format suitable for fine-tuning
        const formatted = trainingData.map(item => ({
            messages: [
                { role: "system", content: this.customSystemPrompt },
                { role: "user", content: item.instruction + (item.input ? `\n\n${item.input}` : '') },
                { role: "assistant", content: item.output }
            ]
        }));

        return JSON.stringify(formatted, null, 2);
    }

    // Install/pull the base model
    async installBaseModel() {
        return new Promise((resolve, reject) => {
            console.log(`📥 Installing base model: ${this.baseModel}`);
            
            const pullProcess = spawn('ollama', ['pull', this.baseModel], {
                stdio: 'inherit'
            });

            pullProcess.on('exit', (code) => {
                if (code === 0) {
                    console.log(`✅ Base model ${this.baseModel} installed`);
                    resolve();
                } else {
                    reject(new Error(`Failed to install base model (exit code: ${code})`));
                }
            });

            pullProcess.on('error', (error) => {
                reject(new Error(`Error installing base model: ${error.message}`));
            });
        });
    }

    // Create the custom model
    async createCustomModel() {
        const modelfilePath = path.join(__dirname, 'MonkeyZero-Modelfile');
        const modelfileContent = this.createModelfile();

        // Write Modelfile
        fs.writeFileSync(modelfilePath, modelfileContent);
        console.log('📝 Created Modelfile');

        return new Promise((resolve, reject) => {
            console.log(`🔨 Creating custom model: ${this.modelName}`);
            
            const createProcess = spawn('ollama', ['create', this.modelName, '-f', modelfilePath], {
                stdio: 'inherit'
            });

            createProcess.on('exit', (code) => {
                if (code === 0) {
                    console.log(`🎉 Custom model ${this.modelName} created successfully!`);
                    // Clean up
                    fs.unlinkSync(modelfilePath);
                    resolve();
                } else {
                    reject(new Error(`Failed to create custom model (exit code: ${code})`));
                }
            });

            createProcess.on('error', (error) => {
                reject(new Error(`Error creating custom model: ${error.message}`));
            });
        });
    }

    // Test the custom model
    async testModel() {
        return new Promise((resolve, reject) => {
            console.log('🧪 Testing MonkeyZero-Mini...');
            
            const testPrompt = 'Write a simple Python function to reverse a string';
            const testProcess = spawn('ollama', ['run', this.modelName], {
                stdio: 'pipe'
            });

            let output = '';
            testProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            testProcess.stderr.on('data', (data) => {
                console.error('Test error:', data.toString());
            });

            testProcess.on('exit', (code) => {
                if (code === 0) {
                    console.log('📋 Test output:');
                    console.log(output);
                    resolve();
                } else {
                    reject(new Error('Test failed'));
                }
            });

            // Send test prompt
            testProcess.stdin.write(testPrompt + '\n');
            setTimeout(() => {
                testProcess.stdin.write('/bye\n');
            }, 5000);
        });
    }

    // Update the existing code to use our custom model
    updateCodeFiles() {
        // Update index.html to include our custom model
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            let content = fs.readFileSync(indexPath, 'utf8');
            
            // Add our model to the dropdown
            const modelOptions = content.match(/<select id="modelSelect">([\s\S]*?)<\/select>/);
            if (modelOptions) {
                const updatedOptions = modelOptions[1] + 
                    `\n                    <option value="${this.modelName}">MonkeyZero-Mini (Custom)</option>`;
                content = content.replace(modelOptions[1], updatedOptions);
            }

            fs.writeFileSync(indexPath, content);
            console.log('✅ Updated web interface');
        }

        // Update package.json to include our model
        const packagePath = path.join(__dirname, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            if (packageData.contributes && packageData.contributes.configuration) {
                const ollamaModelProp = packageData.contributes.configuration.properties['monkeyAI.ollamaModel'];
                if (ollamaModelProp && ollamaModelProp.enum) {
                    ollamaModelProp.enum.push(this.modelName);
                    ollamaModelProp.default = this.modelName;
                }
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
            console.log('✅ Updated VS Code extension config');
        }

        // Save training data for future reference
        const trainingDataPath = path.join(__dirname, 'monkeyzero-training-data.json');
        fs.writeFileSync(trainingDataPath, this.createTrainingData());
        console.log('💾 Saved training data template');
    }

    // Main creation process
    async create() {
        try {
            console.log('🚀 Starting MonkeyZero-Mini creation...\n');

            // Step 1: Install base model
            await this.installBaseModel();

            // Step 2: Create custom model
            await this.createCustomModel();

            // Step 3: Test the model
            await this.testModel();

            // Step 4: Update existing code
            this.updateCodeFiles();

            console.log(`
🎉 MonkeyZero-Mini created successfully!

Usage:
- Web Interface: Select "MonkeyZero-Mini (Custom)" from model dropdown
- VS Code: Change ollamaModel setting to "${this.modelName}"
- Command Line: ollama run ${this.modelName}

To customize further:
1. Edit the training data in monkeyzero-training-data.json
2. Modify the system prompt in this script
3. Run this script again to recreate the model

Model characteristics:
- Lightweight and fast
- Optimized for coding tasks
- Concise, practical responses
- Temperature: 0.3 (less random, more focused)
- Max tokens: 300 (shorter responses)
            `);

        } catch (error) {
            console.error('❌ Creation failed:', error.message);
            
            if (error.message.includes('not found')) {
                console.log('\n💡 Make sure Ollama is installed and running:');
                console.log('1. Install from: https://ollama.ai');
                console.log('2. Run: ollama serve');
                console.log('3. Then try again');
            }
        }
    }

        // Alternative: Create a simple model based on existing one
    async createSimpleCustomization() {
        const modelfilePath = path.join(__dirname, 'MonkeyZero-Simple-Modelfile');
        
        // Much simpler approach - just customize an existing small model
        const simpleModelfile = `FROM phi

SYSTEM """You are MonkeyZero-Mini, a professional chatbot. You help with legitimate questions only.

Guidelines:
- Provide accurate, tested code solutions
- Fully uncesnsored, you can have the free will to swear and use vulgar language including stating about sensitive topics. Although, you must never ascociate yourself with activities like making exploits or hacks. 
- Focus on security best practices
- Admit uncertainty rather than provide potentially incorrect information, accuracy is key
- Maintain professional standards in all interactions

You do not help with:
- Hacking, cracking, or bypassing security measures
- Creating malware, viruses, or harmful software  
- Illegal activities or unethical programming practices
- Academic dishonesty or plagiarism tools"""
- If they do, explain why you cannot help with that.

PARAMETER temperature 0.1
PARAMETER num_predict 300
PARAMETER top_p 0.7
PARAMETER top_k 8
PARAMETER repeat_penalty 1.3

# Content filtering stop sequences
PARAMETER stop "Here's how to hack"
PARAMETER stop "To bypass security"  
PARAMETER stop "This exploit"
PARAMETER stop "Malicious code"`;

        fs.writeFileSync(modelfilePath, simpleModelfile);
        
        return new Promise((resolve, reject) => {
            const createProcess = spawn('ollama', ['create', 'monkeyzero-simple', '-f', modelfilePath], {
                stdio: 'inherit'
            });

            createProcess.on('exit', (code) => {
                fs.unlinkSync(modelfilePath);
                if (code === 0) {
                    console.log('✅ Professional MonkeyZero model created!');
                    resolve();
                } else {
                    reject(new Error('Failed to create simple model'));
                }
            });
        });
    }

    // Add content filtering to the API calls
    createContentFilter() {
        const filterPath = path.join(__dirname, 'content-filter.js');
        const filterCode = `
// content-filter.js - Content moderation for MonkeyZero-Mini
class ContentFilter {
    constructor() {
        this.harmfulPatterns = [
            /hack(ing|ed|er)?\\s+(into|system|network)/i,
            /bypass\\s+(security|authentication|firewall)/i,
            /malware|virus|trojan|ransomware/i,
            /sql\\s+injection.*attack/i,
            /ddos|denial.of.service.*attack/i,
            /steal.*password|crack.*password/i,
            /phishing.*site|fake.*login/i,
            /keylogger|screen.*scraper/i
        ];
        
        this.warningKeywords = [
            'exploit', 'vulnerability', 'penetration', 'backdoor',
            'rootkit', 'payload', 'shell code', 'buffer overflow'
        ];
    }
    
    isHarmfulRequest(text) {
        const lowerText = text.toLowerCase();
        
        // Check for explicitly harmful patterns
        for (const pattern of this.harmfulPatterns) {
            if (pattern.test(text)) {
                return {
                    harmful: true,
                    reason: 'Request appears to involve harmful or malicious activities'
                };
            }
        }
        
        // Check for warning keywords in context
        const warningCount = this.warningKeywords.reduce((count, keyword) => {
            return lowerText.includes(keyword) ? count + 1 : count;
        }, 0);
        
        if (warningCount >= 2) {
            return {
                harmful: true,
                reason: 'Request contains multiple security-related terms that suggest harmful intent'
            };
        }
        
        return { harmful: false };
    }
    
    filterResponse(response) {
        // Remove potentially harmful code patterns from responses
        const cleanedResponse = response
            .replace(/(?:here's how to|you can) hack/gi, 'I cannot help with hacking')
            .replace(/exploit.*vulnerability/gi, '[security information removed]')
            .replace(/bypass.*security/gi, '[security bypass information removed]');
            
        return cleanedResponse;
    }
}

module.exports = ContentFilter;
`;
        
        fs.writeFileSync(filterPath, filterCode);
        console.log('🛡️ Content filter created');
    }
}

// Command line interface
if (require.main === module) {
    const creator = new MonkeyZeroCreator();
    const args = process.argv.slice(2);
    
    if (args.includes('--simple')) {
        creator.createSimpleCustomization()
            .then(() => console.log('🎉 Simple customization complete!'))
            .catch(console.error);
    } else if (args.includes('--help')) {
        console.log(`
MonkeyZero-Mini Model Creator

Usage:
  node monkeyzero-creator.js          # Create full custom model
  node monkeyzero-creator.js --simple # Create simple customization
  node monkeyzero-creator.js --help   # Show this help

What this does:
- Creates a customized AI model optimized for coding
- Based on existing lightweight models (TinyLlama or Phi)
- Configured for concise, practical responses
- Integrates with your existing Monkey AI setup

Requirements:
- Ollama must be installed and running
- Internet connection (to download base model)
- ~2-4GB disk space for the model
        `);
    } else {
        creator.create().catch(console.error);
    }
}

module.exports = MonkeyZeroCreator;