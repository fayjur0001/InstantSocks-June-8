const fs = require('fs');
const path = require('path');

function removeComments(content) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inRegex = false;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && (i === 0 || content[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
        result += char;
        i++;
        continue;
      } else if (char === stringChar) {
        inString = false;
        result += char;
        i++;
        continue;
      }
    }

    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Handle single-line comments
    if (char === '/' && nextChar === '/') {
      // Skip until end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      if (content[i] === '\n') {
        result += '\n';
        i++;
      }
      continue;
    }

    // Handle multi-line comments
    if (char === '/' && nextChar === '*') {
      // Skip until */
      i += 2;
      while (i < content.length) {
        if (content[i] === '*' && content[i + 1] === '/') {
          i += 2;
          break;
        }
        if (content[i] === '\n') {
          result += '\n';
        }
        i++;
      }
      continue;
    }

    result += char;
    i++;
  }

  // Clean up multiple blank lines
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    // Skip node_modules, dist, and other unnecessary directories
    if (['node_modules', 'dist', '.next', '.git', 'public'].includes(file.name)) {
      continue;
    }

    if (file.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.name.match(/\.(ts|tsx|js|mjs)$/)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const cleaned = removeComments(content);
        fs.writeFileSync(fullPath, cleaned, 'utf8');
        console.log(`✓ Processed: ${fullPath}`);
      } catch (error) {
        console.error(`✗ Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

const projectRoot = path.join(__dirname);
console.log('Starting comment removal...\n');

// Process client folder
const clientPath = path.join(projectRoot, 'client');
if (fs.existsSync(clientPath)) {
  console.log('Processing client folder...');
  processDirectory(clientPath);
}

// Process server folder
const serverPath = path.join(projectRoot, 'server');
if (fs.existsSync(serverPath)) {
  console.log('\nProcessing server folder...');
  processDirectory(serverPath);
}

console.log('\n✓ Comment removal complete!');
