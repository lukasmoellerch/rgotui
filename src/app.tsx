import { useState, useCallback, useEffect, useRef } from "react";
import { SyntaxStyle } from "@opentui/core";

// GitHub-dark inspired syntax theme
const syntaxStyle = SyntaxStyle.fromTheme([
  {
    scope: ["keyword", "storage", "storage.type"],
    style: { foreground: "#ff7b72" },
  },
  { scope: ["string", "string.quoted"], style: { foreground: "#a5d6ff" } },
  {
    scope: ["comment", "punctuation.definition.comment"],
    style: { foreground: "#8b949e", italic: true },
  },
  {
    scope: ["constant", "constant.numeric", "constant.language"],
    style: { foreground: "#79c0ff" },
  },
  {
    scope: ["variable", "variable.parameter"],
    style: { foreground: "#ffa657" },
  },
  {
    scope: ["entity.name.function", "support.function"],
    style: { foreground: "#d2a8ff" },
  },
  {
    scope: [
      "entity.name.type",
      "entity.name.class",
      "support.type",
      "support.class",
    ],
    style: { foreground: "#ffa657" },
  },
  { scope: ["punctuation", "meta.brace"], style: { foreground: "#c9d1d9" } },
  { scope: ["entity.name.tag"], style: { foreground: "#7ee787" } },
  { scope: ["entity.other.attribute-name"], style: { foreground: "#79c0ff" } },
  {
    scope: ["meta.decorator", "punctuation.decorator"],
    style: { foreground: "#d2a8ff" },
  },
  { scope: ["markup.heading"], style: { foreground: "#79c0ff", bold: true } },
  { scope: ["markup.bold"], style: { bold: true } },
  { scope: ["markup.italic"], style: { italic: true } },
  {
    scope: ["markup.inline.raw", "markup.fenced_code"],
    style: { foreground: "#a5d6ff" },
  },
]);

interface SearchMatch {
  lineNumber: number;
  content: string;
}

interface FileResult {
  path: string;
  matches: SearchMatch[];
}

interface SearchResultProps {
  result: FileResult;
  expanded: boolean;
  onToggle: () => void;
}

// GitHub language colors
const languageColors: Record<string, string> = {
  typescript: "#3178c6",
  tsx: "#3178c6",
  javascript: "#f1e05a",
  jsx: "#f1e05a",
  python: "#3572A5",
  ruby: "#701516",
  rust: "#dea584",
  go: "#00ADD8",
  java: "#b07219",
  c: "#555555",
  cpp: "#f34b7d",
  csharp: "#178600",
  swift: "#F05138",
  kotlin: "#A97BFF",
  scala: "#c22d40",
  php: "#4F5D95",
  bash: "#89e051",
  sql: "#e38c00",
  html: "#e34c26",
  css: "#563d7c",
  scss: "#c6538c",
  less: "#1d365d",
  json: "#292929",
  yaml: "#cb171e",
  toml: "#9c4221",
  xml: "#0060ac",
  markdown: "#083fa1",
  lua: "#000080",
  vim: "#199f4b",
  elixir: "#6e4a7e",
  erlang: "#B83998",
  haskell: "#5e5086",
  ocaml: "#3be133",
  clojure: "#db5855",
  lisp: "#3fb68b",
  r: "#198CE7",
  matlab: "#e16737",
  perl: "#0298c3",
  zig: "#ec915c",
  nim: "#ffc200",
  v: "#4f87c4",
  d: "#ba595e",
  dart: "#00B4AB",
  vue: "#41b883",
  svelte: "#ff3e00",
  fish: "#4aae47",
  powershell: "#012456",
};

// Map file extensions to language identifiers for syntax highlighting
function getFiletype(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "fish",
    ps1: "powershell",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    lua: "lua",
    vim: "vim",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    hs: "haskell",
    ml: "ocaml",
    clj: "clojure",
    lisp: "lisp",
    r: "r",
    m: "matlab",
    pl: "perl",
    zig: "zig",
    nim: "nim",
    v: "v",
    d: "d",
    dart: "dart",
    vue: "vue",
    svelte: "svelte",
  };
  return ext ? extMap[ext] : undefined;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
    proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
    return true;
  } catch {
    return false;
  }
}

function SearchResult({ result, expanded, onToggle }: SearchResultProps) {
  const [copied, setCopied] = useState(false);
  const matchCount = result.matches.length;
  const filetype = getFiletype(result.path);

  // Combine all matches into a single code block with line numbers
  const codeContent = result.matches.map((m) => m.content).join("\n");
  const lineNumbers = new Map(result.matches.map((m, i) => [i, m.lineNumber]));

  const handleCopy = useCallback(
    async (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      const success = await copyToClipboard(result.path);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    },
    [result.path]
  );

  return (
    <box flexDirection="column" marginBottom={1}>
      {/* File header */}
      <box
        flexDirection="row"
        backgroundColor="#1d1f29"
        paddingLeft={1}
        paddingRight={1}
        onMouseDown={onToggle}
      >
        <text>
          <span fg="#7d8590">{expanded ? "▼ " : "▶ "}</span>
          <span fg="#58a6ff">{result.path}</span>
        </text>
        <box onMouseDown={handleCopy} marginLeft={1}>
          <text>
            <span fg={copied ? "#3fb950" : "#7d8590"}>
              {copied ? "✓" : "⧉"}
            </span>
          </text>
        </box>
        <text flexGrow={1}></text>
        {filetype && (
          <box flexDirection="row" alignItems="center">
            <text>
              <span fg={languageColors[filetype] || "#7d8590"}>●</span>
              <span fg="#7d8590"> {filetype}</span>
            </text>
            <text>
              <span fg="#7d8590"> {String(matchCount).padStart(2, " ")}</span>
            </text>
          </box>
        )}
      </box>

      {/* Matches with syntax highlighting */}
      {expanded && (
        <box flexDirection="column" backgroundColor="#161b22">
          <line-number
            lineNumbers={lineNumbers}
            fg="#7d8590"
            minWidth={4}
            paddingRight={1}
          >
            <code
              content={codeContent}
              filetype={filetype}
              syntaxStyle={syntaxStyle}
              wrapMode="none"
              selectable
            />
          </line-number>
        </box>
      )}
    </box>
  );
}

async function runRipgrep(
  query: string,
  cwd: string,
  signal?: AbortSignal
): Promise<FileResult[]> {
  if (!query.trim()) return [];

  try {
    const proc = Bun.spawn(["rg", "--json", "--max-count", "50", query], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Kill the process if the signal is aborted
    const onAbort = () => proc.kill();
    signal?.addEventListener("abort", onAbort);

    try {
      const output = await new Response(proc.stdout as ReadableStream).text();
      await proc.exited;

      // Discard results if search was cancelled
      if (signal?.aborted) {
        return [];
      }

      const results = new Map<string, FileResult>();

      for (const line of output.split("\n")) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          if (data.type === "match") {
            const path = data.data.path.text;
            const lineNumber = data.data.line_number;
            const content = data.data.lines.text.replace(/\n$/, "");

            if (!results.has(path)) {
              results.set(path, { path, matches: [] });
            }

            results.get(path)!.matches.push({ lineNumber, content });
          }
        } catch {
          // Skip non-JSON lines
        }
      }

      return Array.from(results.values());
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  } catch (error) {
    if (!signal?.aborted) {
      console.error("Ripgrep error:", error);
    }
    return [];
  }
}

function SearchStats({
  results,
  duration,
}: {
  results: FileResult[];
  duration: number;
}) {
  const fileCount = results.length;
  const matchCount = results.reduce((sum, r) => sum + r.matches.length, 0);

  if (fileCount === 0) return null;

  return (
    <box paddingLeft={1} paddingBottom={0}>
      <text>
        <span fg="#7d8590">
          {matchCount} result{matchCount !== 1 ? "s" : ""} in {fileCount} file
          {fileCount !== 1 ? "s" : ""} ({duration}ms)
        </span>
      </text>
    </box>
  );
}

function EmptyState({
  query,
  isSearching,
}: {
  query: string;
  isSearching: boolean;
}) {
  if (isSearching) {
    return (
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <text>
          <span fg="#7d8590">Searching...</span>
        </text>
      </box>
    );
  }

  if (!query) {
    return (
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
        gap={1}
      >
        <text>
          <span fg="#58a6ff">rg</span>
          <span fg="#7d8590"> - ripgrep TUI</span>
        </text>
        <text>
          <span fg="#7d8590">Start typing to search</span>
        </text>
        <box marginTop={1} flexDirection="column" gap={0}>
          <text>
            <span fg="#484f58">Tips:</span>
          </text>
          <text>
            <span fg="#7d8590"> • Use regex patterns for advanced search</span>
          </text>
          <text>
            <span fg="#7d8590"> • Click on file names to expand/collapse</span>
          </text>
          <text>
            <span fg="#7d8590">
              {" "}
              • Results are limited to 50 matches per file
            </span>
          </text>
        </box>
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <text>
        <span fg="#7d8590">No results found for "</span>
        <span fg="#e6edf3">{query}</span>
        <span fg="#7d8590">"</span>
      </text>
    </box>
  );
}

const DEBOUNCE_MS = 150;

export function App() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<FileResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchDuration, setSearchDuration] = useState(0);
  const [lastQuery, setLastQuery] = useState("");
  const [cwd] = useState(() => process.cwd());

  // Refs for debouncing and cancellation
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const executeSearch = useCallback(
    async (query: string) => {
      // Cancel any in-flight search
      abortController.current?.abort();

      if (!query.trim()) {
        setResults([]);
        setLastQuery("");
        setIsSearching(false);
        return;
      }

      // Create new controller for this search
      const controller = new AbortController();
      abortController.current = controller;

      setIsSearching(true);
      setLastQuery(query);
      const start = Date.now();

      try {
        const searchResults = await runRipgrep(query, cwd, controller.signal);

        // Only update state if this search wasn't aborted
        if (!controller.signal.aborted) {
          setResults(searchResults);
          setSearchDuration(Date.now() - start);

          // Auto-expand first 3 files
          const autoExpand = new Set(
            searchResults.slice(0, 3).map((r) => r.path)
          );
          setExpandedFiles(autoExpand);
          setIsSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [cwd]
  );

  // Debounced search on input change
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Show searching state immediately when typing
    if (input.trim()) {
      setIsSearching(true);
    }

    // Debounce the actual search
    debounceTimer.current = setTimeout(() => {
      executeSearch(input);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [input, executeSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortController.current?.abort();
    };
  }, []);

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor="#0d1117"
    >
      {/* Header */}
      <box flexDirection="column" flexShrink={0}>
        {/* Title bar */}
        <box
          flexDirection="row"
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <text>
            <b>
              <span fg="#58a6ff">rg</span>
            </b>
            <span fg="#7d8590"> · </span>
            <span fg="#7d8590">{cwd}</span>
          </text>
        </box>

        {/* Search input */}
        <box
          paddingLeft={1}
          paddingRight={1}
          borderColor="#30363d"
          borderStyle="single"
          border={["bottom", "top"]}
          flexDirection="row"
          alignItems="center"
        >
          <text fg="#7d8590" paddingRight={1}>
            ⌕
          </text>
          <input
            flexGrow={1}
            placeholder="Search code..."
            backgroundColor="transparent"
            focusedBackgroundColor="transparent"
            value={input}
            onInput={setInput}
            minHeight={1}
            paddingLeft={1}
            paddingRight={1}
            focused
          />
        </box>
      </box>

      {/* Results area */}
      {results.length > 0 ? (
        <>
          <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
            <box paddingBottom={1}>
              <SearchStats results={results} duration={searchDuration} />
            </box>
            {results.map((result) => (
              <SearchResult
                key={result.path}
                result={result}
                expanded={expandedFiles.has(result.path)}
                onToggle={() => toggleFile(result.path)}
              />
            ))}
          </scrollbox>
        </>
      ) : (
        <EmptyState query={lastQuery} isSearching={isSearching} />
      )}

      {/* Footer */}
      <box
        paddingLeft={1}
        paddingRight={1}
        paddingBottom={0}
        borderColor="#30363d"
        borderStyle="single"
        border={["top"]}
        flexShrink={0}
      >
        <text>
          <span fg="#484f58">Type</span>
          <span fg="#7d8590"> to search </span>
          <span fg="#484f58">↑↓</span>
          <span fg="#7d8590"> scroll </span>
          <span fg="#484f58">Click</span>
          <span fg="#7d8590"> expand/collapse</span>
        </text>
      </box>
    </box>
  );
}
