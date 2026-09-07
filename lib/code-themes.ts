export type CodeThemeId =
  | 'github-light'
  | 'github-dark'
  | 'vscode-dark'
  | 'one-dark'
  | 'dracula'
  | 'monokai'
  | 'tokyo-night'
  | 'nord'
  | 'solarized-light'
  | 'solarized-dark';

export type CodeTheme = {
  name: string;
  mode: 'light' | 'dark';
  background: string;
  foreground: string;
  border: string;
  gutter: string;
  tokens: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    function: string;
    type: string;
    variable: string;
    property: string;
    meta: string;
    addition: string;
    deletion: string;
  };
};

export const codeThemes: Record<CodeThemeId, CodeTheme> = {
  'github-light': {
    name: 'GitHub Light', mode: 'light', background: '#f6f8fa', foreground: '#24292f', border: '#d0d7de', gutter: '#6e7781',
    tokens: { comment: '#6e7781', keyword: '#cf222e', string: '#0a3069', number: '#0550ae', function: '#8250df', type: '#953800', variable: '#953800', property: '#0550ae', meta: '#116329', addition: '#116329', deletion: '#82071e' },
  },
  'github-dark': {
    name: 'GitHub Dark', mode: 'dark', background: '#0d1117', foreground: '#c9d1d9', border: '#30363d', gutter: '#8b949e',
    tokens: { comment: '#8b949e', keyword: '#ff7b72', string: '#a5d6ff', number: '#79c0ff', function: '#d2a8ff', type: '#ffa657', variable: '#ffa657', property: '#79c0ff', meta: '#7ee787', addition: '#7ee787', deletion: '#ffa198' },
  },
  'vscode-dark': {
    name: 'VS Code Dark+', mode: 'dark', background: '#1e1e1e', foreground: '#d4d4d4', border: '#343434', gutter: '#858585',
    tokens: { comment: '#6a9955', keyword: '#c586c0', string: '#ce9178', number: '#b5cea8', function: '#dcdcaa', type: '#4ec9b0', variable: '#9cdcfe', property: '#9cdcfe', meta: '#569cd6', addition: '#b5cea8', deletion: '#f48771' },
  },
  'one-dark': {
    name: 'One Dark', mode: 'dark', background: '#282c34', foreground: '#abb2bf', border: '#3e4451', gutter: '#636d83',
    tokens: { comment: '#5c6370', keyword: '#c678dd', string: '#98c379', number: '#d19a66', function: '#61afef', type: '#e5c07b', variable: '#e06c75', property: '#56b6c2', meta: '#61afef', addition: '#98c379', deletion: '#e06c75' },
  },
  dracula: {
    name: 'Dracula', mode: 'dark', background: '#282a36', foreground: '#f8f8f2', border: '#44475a', gutter: '#6272a4',
    tokens: { comment: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', function: '#50fa7b', type: '#8be9fd', variable: '#f8f8f2', property: '#8be9fd', meta: '#ffb86c', addition: '#50fa7b', deletion: '#ff5555' },
  },
  monokai: {
    name: 'Monokai', mode: 'dark', background: '#272822', foreground: '#f8f8f2', border: '#49483e', gutter: '#75715e',
    tokens: { comment: '#75715e', keyword: '#f92672', string: '#e6db74', number: '#ae81ff', function: '#a6e22e', type: '#66d9ef', variable: '#fd971f', property: '#a6e22e', meta: '#66d9ef', addition: '#a6e22e', deletion: '#f92672' },
  },
  'tokyo-night': {
    name: 'Tokyo Night', mode: 'dark', background: '#1a1b26', foreground: '#c0caf5', border: '#292e42', gutter: '#565f89',
    tokens: { comment: '#565f89', keyword: '#bb9af7', string: '#9ece6a', number: '#ff9e64', function: '#7aa2f7', type: '#2ac3de', variable: '#c0caf5', property: '#73daca', meta: '#e0af68', addition: '#9ece6a', deletion: '#f7768e' },
  },
  nord: {
    name: 'Nord', mode: 'dark', background: '#2e3440', foreground: '#d8dee9', border: '#4c566a', gutter: '#616e88',
    tokens: { comment: '#616e88', keyword: '#81a1c1', string: '#a3be8c', number: '#b48ead', function: '#88c0d0', type: '#8fbcbb', variable: '#d8dee9', property: '#88c0d0', meta: '#ebcb8b', addition: '#a3be8c', deletion: '#bf616a' },
  },
  'solarized-light': {
    name: 'Solarized Light', mode: 'light', background: '#fdf6e3', foreground: '#657b83', border: '#eee8d5', gutter: '#93a1a1',
    tokens: { comment: '#93a1a1', keyword: '#859900', string: '#2aa198', number: '#d33682', function: '#268bd2', type: '#b58900', variable: '#cb4b16', property: '#268bd2', meta: '#6c71c4', addition: '#859900', deletion: '#dc322f' },
  },
  'solarized-dark': {
    name: 'Solarized Dark', mode: 'dark', background: '#002b36', foreground: '#839496', border: '#073642', gutter: '#586e75',
    tokens: { comment: '#586e75', keyword: '#859900', string: '#2aa198', number: '#d33682', function: '#268bd2', type: '#b58900', variable: '#cb4b16', property: '#268bd2', meta: '#6c71c4', addition: '#859900', deletion: '#dc322f' },
  },
};
