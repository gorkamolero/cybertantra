import { ReactNode } from 'react';
import { UseThemeReturn } from '../hooks/useTheme';

export interface BrowserConfig {
  id: string;
  name: string;
  component: ReactNode;
  formatter?: (content: any) => ReactNode;
}

export interface TerminalConfig {
  // Project identity
  projectName: string;
  welcomeMessage?: string;
  
  // Available browsers/modes
  browsers?: BrowserConfig[];
  
  // Custom commands
  customCommands?: Record<string, (args: string[]) => ReactNode | string>;
  
  // Boot sequence
  showBootSequence?: boolean;
  bootMessages?: string[];
  
  // AI configuration
  aiEndpoint?: string;
  aiEnabled?: boolean;
  
  // Features
  enableVimMode?: boolean;
  enableThemes?: boolean;
  enableFileSystem?: boolean;
  
  // Theme hook provider
  useTheme?: () => UseThemeReturn;
  
  // Context providers (for project-specific contexts)
  contextWrapper?: (children: ReactNode) => ReactNode;
}