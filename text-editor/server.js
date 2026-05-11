const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const matter = require('gray-matter');

const app = express();
const PORT = 3000;

const KINETIC_PATH = path.join(__dirname, '..', 'Kinethics-main');

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Helper function to find all text content
async function scanTextContent() {
  const textContent = {};
  
  // Scan markdown files
  const contentDir = path.join(KINETIC_PATH, 'content');
  if (await fs.pathExists(contentDir)) {
    const markdownFiles = await findFiles(contentDir, '.md');
    textContent.markdown = {};
    
    for (const file of markdownFiles) {
      const relativePath = path.relative(contentDir, file);
      const content = await fs.readFile(file, 'utf8');
      const parsed = matter(content);
      
      textContent.markdown[relativePath] = {
        path: file,
        frontmatter: parsed.data,
        content: parsed.content,
        originalTitle: parsed.data.title || path.basename(file, '.md')
      };
    }
  }
  
  // Scan hugo.yaml configuration
  const hugoConfigPath = path.join(KINETIC_PATH, 'hugo.yaml');
  if (await fs.pathExists(hugoConfigPath)) {
    const hugoContent = await fs.readFile(hugoConfigPath, 'utf8');
    const hugoConfig = yaml.load(hugoContent);
    textContent.config = {
      path: hugoConfigPath,
      data: hugoConfig,
      extractedTexts: extractTextsFromConfig(hugoConfig)
    };
  }
  
  // Scan HTML template files
  const templatesDir = path.join(KINETIC_PATH, 'themes', 'tailbliss', 'layouts');
  if (await fs.pathExists(templatesDir)) {
    const htmlFiles = await findFiles(templatesDir, '.html');
    textContent.templates = {};
    
    for (const file of htmlFiles) {
      const relativePath = path.relative(templatesDir, file);
      const content = await fs.readFile(file, 'utf8');
      const extractedTexts = extractTextFromHTML(content);
      
      textContent.templates[relativePath] = {
        path: file,
        content: content,
        extractedTexts: extractedTexts
      };
    }
  }
  
  return textContent;
}

// Helper function to recursively find files with specific extension
async function findFiles(dir, ext) {
  const files = [];
  const items = await fs.readdir(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...await findFiles(fullPath, ext));
    } else if (path.extname(item) === ext) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract text from Hugo config (params section mainly)
function extractTextsFromConfig(config) {
  const texts = [];
  
  function extractRecursive(obj, keyPath = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (typeof value === 'string' && value.length > 2) {
        texts.push({
          path: currentPath,
          value: value,
          type: 'config'
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        extractRecursive(value, currentPath);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string' && item.length > 2) {
            texts.push({
              path: `${currentPath}[${index}]`,
              value: item,
              type: 'config'
            });
          } else if (typeof item === 'object' && item !== null) {
            extractRecursive(item, `${currentPath}[${index}]`);
          }
        });
      }
    }
  }
  
  extractRecursive(config);
  return texts;
}

// Extract text from HTML templates
function extractTextFromHTML(content) {
  const texts = [];
  
  // Simple regex to find text between HTML tags (excluding template syntax)
  const textRegex = />([^<>{]*[a-zA-Z][^<>{}]*)</g;
  let match;
  
  while ((match = textRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 2 && !text.includes('{{') && !text.includes('}}')) {
      texts.push({
        original: match[0],
        text: text,
        type: 'html'
      });
    }
  }
  
  return texts;
}

// API Routes
app.get('/api/scan', async (req, res) => {
  try {
    const textContent = await scanTextContent();
    res.json(textContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-markdown', async (req, res) => {
  try {
    const { filePath, frontmatter, content } = req.body;
    
    const newContent = matter.stringify(content, frontmatter);
    await fs.writeFile(filePath, newContent);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-config', async (req, res) => {
  try {
    const { filePath, config } = req.body;
    
    const yamlContent = yaml.dump(config, { 
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });
    
    await fs.writeFile(filePath, yamlContent);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-template', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    
    await fs.writeFile(filePath, content);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Kinetic Text Editor running at http://localhost:${PORT}`);
  console.log(`📁 Scanning Kinetic app at: ${KINETIC_PATH}`);
});