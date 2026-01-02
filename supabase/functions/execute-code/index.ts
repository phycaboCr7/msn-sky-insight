import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Piston API - Free code execution engine supporting 50+ languages
const PISTON_API = "https://emkc.org/api/v2/piston";

// Map common language names to Piston language identifiers
const languageMap: Record<string, { language: string; version: string }> = {
  'python': { language: 'python', version: '3.10.0' },
  'py': { language: 'python', version: '3.10.0' },
  'javascript': { language: 'javascript', version: '18.15.0' },
  'js': { language: 'javascript', version: '18.15.0' },
  'typescript': { language: 'typescript', version: '5.0.3' },
  'ts': { language: 'typescript', version: '5.0.3' },
  'java': { language: 'java', version: '15.0.2' },
  'c': { language: 'c', version: '10.2.0' },
  'cpp': { language: 'cpp', version: '10.2.0' },
  'c++': { language: 'cpp', version: '10.2.0' },
  'csharp': { language: 'csharp', version: '6.12.0' },
  'cs': { language: 'csharp', version: '6.12.0' },
  'go': { language: 'go', version: '1.16.2' },
  'golang': { language: 'go', version: '1.16.2' },
  'rust': { language: 'rust', version: '1.68.2' },
  'ruby': { language: 'ruby', version: '3.0.1' },
  'rb': { language: 'ruby', version: '3.0.1' },
  'php': { language: 'php', version: '8.2.3' },
  'swift': { language: 'swift', version: '5.3.3' },
  'kotlin': { language: 'kotlin', version: '1.8.20' },
  'r': { language: 'r', version: '4.1.1' },
  'perl': { language: 'perl', version: '5.36.0' },
  'lua': { language: 'lua', version: '5.4.4' },
  'bash': { language: 'bash', version: '5.2.0' },
  'sh': { language: 'bash', version: '5.2.0' },
  'sql': { language: 'sqlite3', version: '3.36.0' },
  'sqlite': { language: 'sqlite3', version: '3.36.0' },
  'scala': { language: 'scala', version: '3.2.2' },
  'haskell': { language: 'haskell', version: '9.0.1' },
  'elixir': { language: 'elixir', version: '1.14.3' },
  'dart': { language: 'dart', version: '2.19.6' },
  'julia': { language: 'julia', version: '1.8.5' },
  'clojure': { language: 'clojure', version: '1.10.3' },
  'fortran': { language: 'fortran', version: '10.2.0' },
  'cobol': { language: 'cobol', version: '3.1.2' },
  'pascal': { language: 'pascal', version: '3.2.2' },
  'lisp': { language: 'lisp', version: '2.1.2' },
  'prolog': { language: 'prolog', version: '8.2.4' },
  'brainfuck': { language: 'brainfuck', version: '2.7.3' },
  'bf': { language: 'brainfuck', version: '2.7.3' },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Code and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const langKey = language.toLowerCase();
    const langConfig = languageMap[langKey];

    if (!langConfig) {
      // Try to use the language directly if not in map
      console.log(`Language ${langKey} not in map, trying direct execution`);
    }

    const pistonLanguage = langConfig?.language || langKey;
    const pistonVersion = langConfig?.version || '*';

    console.log(`Executing ${pistonLanguage} (${pistonVersion}) code:`, code.substring(0, 100));

    const response = await fetch(`${PISTON_API}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: pistonLanguage,
        version: pistonVersion,
        files: [
          {
            name: `main.${getFileExtension(pistonLanguage)}`,
            content: code,
          },
        ],
        stdin: '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 5000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Piston API error:', errorText);
      throw new Error(`Execution failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Execution result:', result);

    // Combine compile and run output
    let output = '';
    let hasError = false;

    if (result.compile && result.compile.stderr) {
      output += `Compile Error:\n${result.compile.stderr}\n`;
      hasError = true;
    }

    if (result.run) {
      if (result.run.stdout) {
        output += result.run.stdout;
      }
      if (result.run.stderr) {
        output += (output ? '\n' : '') + `Error:\n${result.run.stderr}`;
        hasError = true;
      }
      if (result.run.signal) {
        output += (output ? '\n' : '') + `Process terminated with signal: ${result.run.signal}`;
        hasError = true;
      }
    }

    if (!output) {
      output = 'Code executed successfully (no output)';
    }

    return new Response(
      JSON.stringify({
        output: output.trim(),
        hasError,
        language: result.language,
        version: result.version,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error executing code:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to execute code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    swift: 'swift',
    kotlin: 'kt',
    r: 'r',
    perl: 'pl',
    lua: 'lua',
    bash: 'sh',
    sqlite3: 'sql',
    scala: 'scala',
    haskell: 'hs',
    elixir: 'ex',
    dart: 'dart',
    julia: 'jl',
    clojure: 'clj',
    fortran: 'f90',
    cobol: 'cob',
    pascal: 'pas',
    lisp: 'lisp',
    prolog: 'pl',
    brainfuck: 'bf',
  };
  return extensions[language] || 'txt';
}
