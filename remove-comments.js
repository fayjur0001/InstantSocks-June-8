const fs = require('fs');
const path = require('path');

function removeComments(content) {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Check for single-line comment
    if (content[i] === '/' && content[i + 1] === '/') {
      // Skip until end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      // Keep the newline
      if (content[i] === '\n') {
        result += '\n';
        i++;
      }
      continue;
    }

    // Check for multi-line comment
    if (content[i] === '/' && content[i + 1] === '*') {
      // Skip until */
      i += 2;
      while (i < content.length) {
        if (content[i] === '*' && content[i + 1] === '/') {
          i += 2;
          break;
        }
        // Preserve newlines in multi-line comments
        if (content[i] === '\n') {
          result += '\n';
        }
        i++;
      }
      continue;
    }

    // Check for string literals to avoid removing // or /* */ inside strings
    if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
      const quote = content[i];
      result += content[i];
      i++;
      while (i < content.length) {
        result += content[i];
        if (content[i] === '\\') {
          // Handle escape sequences
          i++;
          if (i < content.length) {
            result += content[i];
            i++;
          }
        } else if (content[i] === quote) {
          i++;
          break;
        } else {
          i++;
        }
      }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = removeComments(content);
    fs.writeFileSync(filePath, cleanedContent, 'utf-8');
    console.log(`✓ Processed: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (file !== 'node_modules' && file !== 'dist' && file !== '.next') {
        walkDir(filePath, callback);
      }
    } else if (
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx') ||
      file.endsWith('.mjs')
    ) {
      callback(filePath);
    }
  });
}

// Process both client and server folders
const projectRoot = path.resolve(__dirname);
const clientDir = path.join(projectRoot, 'client');
const serverDir = path.join(projectRoot, 'server');

console.log('Starting comment removal process...\n');

if (fs.existsSync(clientDir)) {
  console.log('Processing client folder...');
  walkDir(clientDir, processFile);
}

if (fs.existsSync(serverDir)) {
  console.log('\nProcessing server folder...');
  walkDir(serverDir, processFile);
}

console.log('\n✓ Comment removal completed!');
