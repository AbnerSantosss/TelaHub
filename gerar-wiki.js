const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const VAULT_DIR = path.join(ROOT_DIR, 'tela-vaut');

// Configurações do Filtro de Ruído
const IGNORED_FOLDERS = [
  'node_modules',
  '.git',
  '.obsidian',
  'tela-vaut',
  'dist',
  'build',
  'public',
  'icones-do-sistema',
  'uploads'
];

const IGNORED_FILES = [
  '.env',
  '.env.example',
  'package-lock.json',
  '.gitignore',
  'docker-compose.yml',
  'Dockerfile',
  'nginx.conf',
  'vercel.json'
];

const VALID_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Função para garantir que uma pasta existe
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Função para ler as primeiras N linhas de um arquivo
function readFirstLines(filePath, maxLines = 50) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const sliced = lines.slice(0, maxLines);
    let result = sliced.join('\n');
    if (lines.length > maxLines) {
      result += '\n\n... (conteúdo ocultado para poupar espaço) ...';
    }
    return result;
  } catch (error) {
    return `Erro ao ler arquivo: ${error.message}`;
  }
}

// Função recursiva para varrer os diretórios
function processDirectory(currentDir) {
  const items = fs.readdirSync(currentDir);

  for (const item of items) {
    const fullPath = path.join(currentDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Ignora pastas do filtro de ruído
      if (IGNORED_FOLDERS.includes(item)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (stat.isFile()) {
      // Ignora arquivos do filtro de ruído
      if (IGNORED_FILES.includes(item)) {
        continue;
      }

      const ext = path.extname(item).toLowerCase();
      if (VALID_EXTENSIONS.includes(ext)) {
        // Encontra o caminho relativo à raiz do projeto
        const relativePath = path.relative(ROOT_DIR, fullPath);

        // Determina o caminho de destino no Vault (Obsidian)
        const targetDir = path.join(VAULT_DIR, path.dirname(relativePath));
        ensureDir(targetDir);

        // Define o nome do arquivo .md gerado (ex: App.tsx -> App.tsx.md)
        // Usamos [nome_original].md para preservar a extensão original no nome e evitar conflitos (ex: utils.ts e utils.json)
        const mdFileName = `${item}.md`;
        const mdFilePath = path.join(targetDir, mdFileName);

        // Lê o resumo do código
        const codeSummary = readFirstLines(fullPath, 50);

        // Prepara a linguagem para o bloco de markdown
        let lang = 'javascript';
        if (ext === '.ts' || ext === '.tsx') lang = 'typescript';
        if (ext === '.json') lang = 'json';

        // Gera o conteúdo Markdown
        const markdownContent = `# ${item}

**Caminho Original:** \`${relativePath.replace(/\\/g, '/')}\`

## Estrutura / Resumo do Código (Primeiras 50 linhas)

\`\`\`${lang}
${codeSummary}
\`\`\`
`;

        fs.writeFileSync(mdFilePath, markdownContent, 'utf-8');
        console.log(`Documentado: ${relativePath} -> tela-vaut/${relativePath.replace(/\\/g, '/')}.md`);
      }
    }
  }
}

// Limpa o cofre anterior para evitar resíduos, se ele existir
function cleanVault() {
  if (fs.existsSync(VAULT_DIR)) {
    console.log('Limpando cofre existente para evitar conflitos...');
    // Remove recursivamente mas preserva o .obsidian
    const items = fs.readdirSync(VAULT_DIR);
    for (const item of items) {
      if (item === '.obsidian') continue;
      const fullPath = path.join(VAULT_DIR, item);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  } else {
    ensureDir(VAULT_DIR);
  }
}

console.log('Iniciando geração de Wiki para o Obsidian...');
cleanVault();

// Processa as pastas do projeto
const sourceFolders = ['frontend', 'backend'];
for (const folder of sourceFolders) {
  const folderPath = path.join(ROOT_DIR, folder);
  if (fs.existsSync(folderPath)) {
    console.log(`Processando pasta: ${folder}...`);
    processDirectory(folderPath);
  }
}

console.log('Wiki gerada com sucesso na pasta tela-vaut!');
