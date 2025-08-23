'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminalContext } from '../lib/contexts/TerminalContext';
import { useTheme as useDefaultTheme } from '../lib/hooks/useTheme';
import TerminalInput from './TerminalInput';
import CRTEffect from './CRTEffect';
import TypewriterText from './TypewriterText';
import VimMode from './VimMode';
import AudioMode from './AudioMode';
import Modeselektor from './Modeselektor';
import { useBootSequence } from '../lib/hooks/useBootSequence';
import { useCommandHistory } from '../lib/hooks/useCommandHistory';
import { useCommandExecutor } from '../lib/hooks/useCommandExecutor';
import { useTerminalChat } from '../lib/hooks/useTerminalChat';
import { useKeyboardShortcuts } from '../lib/hooks/useKeyboardShortcuts';
import { useGeolocation } from '../lib/hooks/useGeolocation';

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { 
    config,
    history, 
    setHistory, 
    hasInteracted, 
    setHasInteracted,
    input,
    setInput,
    isWaitingForResponse,
    setIsWaitingForResponse,
    vimModeActive,
    setVimModeActive,
    browserStates,
    setBrowserState,
    activeBrowser,
    setActiveBrowser,
  } = useTerminalContext();
  
  const useTheme = config.useTheme || useDefaultTheme;
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Detect if mobile and set initial mode
  const getInitialMode = () => {
    if (typeof window === 'undefined') return 'text';
    const isMobile = window.innerWidth < 768;
    return isMobile ? 'audio' : 'text';
  };
  
  const [mode, setMode] = useState<'text' | 'audio'>(getInitialMode());
  
  // Get user city for boot sequence
  const userCity = useGeolocation();

  // Initialize boot sequence if enabled
  const bootComplete = useBootSequence(
    config.showBootSequence ?? true,
    (entries) => setHistory(prev => [...prev, ...entries]),
    config.bootMessages || (userCity ? [
      '> connection established',
      '> you\'ve found the terminal',
      `> another visitor from ${userCity}`,
      '> speak'
    ] : undefined)
  );

  // Command history navigation
  const { handleKeyDown: handleHistoryKeyDown } = useCommandHistory(
    history.filter(h => h.type === 'input').map(h => h.content),
    setInput
  );

  // Terminal chat for AI
  const { messages, sendMessage, initializeWithHistory } = useTerminalChat({
    onMessage: (content, isAI) => {
      // Don't add AI messages to history - they're displayed from messages array
      if (!isAI) {
        setHistory(prev => [...prev, { 
          type: 'output', 
          content,
          typewriter: false 
        }]);
      }
      setIsWaitingForResponse(false);
    },
    onLoading: setIsLoading,
  });

  // Command executor - use custom hook if provided
  const defaultCommandExecutor = useCommandExecutor(
    setHistory,
    config.enableThemes ? setTheme : undefined,
    config.aiEnabled ? sendMessage : undefined
  );
  
  const customCommandExecutor = config.useCommandExecutor?.(
    setHistory,
    config.enableThemes ? setTheme : undefined,
    config.aiEnabled ? sendMessage : undefined
  );
  
  const { executeCommand, replaceLastHistory } = customCommandExecutor || defaultCommandExecutor;

  // Browser management
  const closeBrowser = useCallback((browserId: string) => {
    setBrowserState(browserId, { active: false, visible: false });
    setActiveBrowser(null);
  }, [setBrowserState, setActiveBrowser]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !vimModeActive && bootComplete && hasInteracted,
    onClear: () => setHistory([]),
  });
  
  // Terminal navigation - use custom hook if provided
  const customNavigation = config.useTerminalNavigation?.(
    setHistory,
    executeCommand,
    replaceLastHistory,
    setTheme,
    inputRef,
    !bootComplete
  );
  
  // Simple browser navigation handler (used if no custom navigation provided)
  const handleBrowserNavigation = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeBrowser || !browserStates[activeBrowser]?.active) return false;
    
    const state = browserStates[activeBrowser];
    const browserConfig = config.browsers?.find(b => b.id === activeBrowser);
    if (!browserConfig) return false;
    
    const maxItems = browserConfig.maxItems || 10;
    let handled = false;
    
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      const newIndex = Math.max(0, (state.selectedIndex || 0) - 1);
      setBrowserState(activeBrowser, { ...state, selectedIndex: newIndex });
      
      // Update display if formatter exists
      if (browserConfig.formatter) {
        const formattedContent = browserConfig.formatter(newIndex);
        setHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { type: 'output', content: formattedContent };
          }
          return newHistory;
        });
      }
      handled = true;
    } else if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      const newIndex = Math.min(maxItems - 1, (state.selectedIndex || 0) + 1);
      setBrowserState(activeBrowser, { ...state, selectedIndex: newIndex });
      
      // Update display if formatter exists
      if (browserConfig.formatter) {
        const formattedContent = browserConfig.formatter(newIndex);
        setHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { type: 'output', content: formattedContent };
          }
          return newHistory;
        });
      }
      handled = true;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setBrowserState(activeBrowser, { ...state, visible: true });
      if (browserConfig.onSelect) {
        browserConfig.onSelect(state.selectedIndex || 0);
      }
      handled = true;
    } else if (e.key === 'q' || e.key === 'Escape') {
      e.preventDefault();
      closeBrowser(activeBrowser);
      setHistory(prev => [...prev, { type: 'output', content: '> Closed.' }]);
      handled = true;
    } else if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < maxItems) {
        setBrowserState(activeBrowser, { ...state, selectedIndex: index, visible: true });
        if (browserConfig.onSelect) {
          browserConfig.onSelect(index);
        }
        handled = true;
      }
    }
    
    return handled;
  }, [activeBrowser, browserStates, setBrowserState, closeBrowser, setHistory, config.browsers]);

  // Handle command submission
  const handleSubmit = (command: string) => {
    if (!bootComplete || command.trim() === '') return;

    setHasInteracted(true);
    setHistory(prev => [...prev, { type: 'input', content: `> ${command}` }]);

    // AI chat commands
    // Try to execute the command first
    const output = executeCommand(command);
    
    if (output !== null) {
      // Command was handled
      if (output === 'BROWSER_ACTIVATED') {
        // Browser was activated, history already updated by executeCommand
        // Don't add any additional output
      } else if (typeof output === 'string') {
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: output,
          typewriter: false 
        }]);
      } else if (typeof output === 'object' && 'content' in output) {
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: output.content,
          typewriter: output.typewriter || false 
        }]);
      }
    } else if (config.aiEnabled) {
      // No command found, send to AI if enabled
      setIsWaitingForResponse(true);
      sendMessage({ text: command });
    } else {
      // No AI, show error
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Command not found: ${command}`,
        typewriter: false 
      }]);
    }

    setInput('');
  };

  // Initialize AI chat with history on mount
  useEffect(() => {
    if (config.aiEnabled) {
      initializeWithHistory(history);
    }
  }, []);


  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Auto-focus input when boot completes
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bootComplete]);

  // Keep focus on input when clicking in terminal
  const handleTerminalClick = useCallback(() => {
    if (bootComplete && inputRef.current && !vimModeActive) {
      inputRef.current.focus();
    }
  }, [bootComplete, vimModeActive]);

  // Render active browser if any
  const activeBrowserConfig = config.browsers?.find(b => b.id === activeBrowser);

  return (
    <CRTEffect>
      {/* Modeselektor */}
      <Modeselektor mode={mode} onModeChange={setMode} />
      
      {/* Render based on mode */}
      {mode === 'audio' ? (
        <AudioMode 
          onSendMessage={(text) => sendMessage({ text })} 
          messages={messages.map(msg => ({
            role: msg.role,
            content: (msg.parts && msg.parts.map((p: any) => p.text).join('')) || (msg as any).content || '',
            id: msg.id
          }))}
          isLoading={isLoading || isWaitingForResponse}
        />
      ) : (
        <div className="w-full h-full bg-black text-green-400 font-mono p-2 sm:p-4 overflow-hidden text-xs sm:text-sm" onClick={handleTerminalClick}>
          <div 
            ref={terminalRef}
            className="h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide focus-blur"
          >
          {/* Welcome message */}
          {bootComplete && !hasInteracted && (
            <div className="whitespace-pre-wrap mb-1 text-green-400">
              {config.welcomeMessage || `Welcome to ${config.projectName}. Type /help to start.`}
            </div>
          )}

          {/* All messages in chronological order */}
          {(() => {
            const combinedMessages = [];
            let historyIndex = 0;
            let aiMessageIndex = 0;
            
            // Get all AI messages from the SDK
            const aiMessages = messages.filter(m => m.role === 'assistant');
            
            // Merge history and AI messages based on order
            while (historyIndex < history.length || aiMessageIndex < aiMessages.length) {
              // Add all history entries until we hit where the next AI message should go
              while (historyIndex < history.length && history[historyIndex].type === 'input') {
                combinedMessages.push({
                  type: 'history',
                  content: history[historyIndex].content,
                  isTypewriter: history[historyIndex].typewriter,
                  key: `history-${historyIndex}`
                });
                historyIndex++;
                
                // After each user input, check if there's a corresponding AI response
                if (aiMessageIndex < aiMessages.length) {
                  const aiMsg = aiMessages[aiMessageIndex];
                  const content = (aiMsg as any).content || ((aiMsg as any).parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '');
                  combinedMessages.push({
                    type: 'ai',
                    content: content,
                    key: `ai-${aiMsg.id}`
                  });
                  aiMessageIndex++;
                }
              }
              
              // Add any remaining history entries (non-input commands)
              if (historyIndex < history.length && history[historyIndex].type !== 'input') {
                combinedMessages.push({
                  type: 'history',
                  content: history[historyIndex].content,
                  isTypewriter: history[historyIndex].typewriter,
                  key: `history-${historyIndex}`
                });
                historyIndex++;
              }
            }
            
            return combinedMessages.map(msg => (
              <div key={msg.key} className="whitespace-pre-wrap mb-1 text-green-400">
                {msg.isTypewriter ? (
                  <TypewriterText text={msg.content} onComplete={() => {}} />
                ) : (
                  msg.content
                )}
              </div>
            ));
          })()}




          {/* Active browser */}
          {activeBrowserConfig && activeBrowser && browserStates[activeBrowser]?.visible && (
            <div className="mt-4">
              {React.createElement(activeBrowserConfig.component, {
                isActive: browserStates[activeBrowser]?.active || false,
                selectedIndex: browserStates[activeBrowser]?.selectedIndex || 0,
                onClose: () => closeBrowser(activeBrowser),
                setHistory
              })}
            </div>
          )}

          {/* Input */}
          {bootComplete && (
            <TerminalInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onKeyDown={(e) => {
                // Try custom navigation if provided
                if (customNavigation?.handleNavigation(e)) {
                  return;
                }
                
                // Try browser navigation
                if (handleBrowserNavigation(e)) return;
                
                if (e.key === 'Enter') {
                  handleSubmit(input);
                } else {
                  handleHistoryKeyDown(e);
                }
              }}
              disabled={isLoading || isWaitingForResponse || vimModeActive}
              showPlaceholder={!hasInteracted}
              onVoiceInput={(text) => {
                setInput(text);
                handleSubmit(text);
              }}
            />
          )}

          {/* Vim mode indicator */}
          {vimModeActive && config.enableVimMode && (
            <VimMode 
              isActive={vimModeActive}
              onClose={() => setVimModeActive(false)}
            />
          )}
        </div>
      </div>
      )}
    </CRTEffect>
  );
}