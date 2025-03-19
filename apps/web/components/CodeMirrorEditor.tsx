"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { EditorState, Extension, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType, keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";
import { lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { history, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import axios from "axios";
// Import react-icons
import { FiPlay, FiX, FiTrash2, FiUser, FiUsers, FiCode, FiTerminal, FiCheckCircle, FiAlertCircle, FiCornerDownRight, FiCpu } from "react-icons/fi";
import { IoMdCode } from "react-icons/io";
import { BiLogoJavascript, BiLogoHtml5, BiLogoCss3, BiLogoTypescript } from "react-icons/bi";
import { MdOutlineRoom, MdOutlineKeyboard, MdContentCopy, MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";
import { TbWorldWww } from "react-icons/tb";
import { HiOutlineStatusOnline, HiOutlineStatusOffline } from "react-icons/hi";

// Import the ChatPanel component
import ChatPanel from "./ChatPanel";
import languageMap from "@/lib/judge0";

// Define a simplified user object that can be safely serialized
interface SerializableUser {
  id: string;
  name: string;
  email: string;
}

interface CodeMirrorEditorProps {
  roomId: string;
  initialCode: string;
  language: string;
  currentUser: SerializableUser;
  onCodeChange?: (code: string) => void;
  roomName: string;
  roomDescription?: string | null;
  roomOwner: string;
}

interface RemoteUser {
  id: string;
  name: string;
  color: string;
  position: {
    lineNumber: number;
    column: number;
  } | null;
}

interface AISuggestion {
  text: string;
  isLoading: boolean;
  error: string | null;
}

// Generate a random color for each user
const getRandomColor = () => {
  const colors = [
    "#7C3AED", "#6366F1", "#3B82F6", "#0EA5E9", "#06B6D4", 
    "#14B8A6", "#10B981", "#84CC16", "#EAB308", "#F59E0B", 
    "#F97316", "#EF4444", "#EC4899", "#D946EF", "#8B5CF6"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Get language extension based on language string
const getLanguageExtension = (language: string) => {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      return javascript();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'json':
      return json();
    default:
      return javascript(); // Default to JavaScript
  }
};

// Add a function to get language icon
const getLanguageIcon = (language: string) => {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      return <BiLogoJavascript className="text-yellow-400" />;
    case 'html':
      return <BiLogoHtml5 className="text-orange-500" />;
    case 'css':
      return <BiLogoCss3 className="text-blue-500" />;
    case 'typescript':
    case 'ts':
      return <BiLogoTypescript className="text-blue-600" />;
    case 'json':
      return <IoMdCode className="text-gray-500" />;
    default:
      return <IoMdCode className="text-gray-500" />;
  }
};

// Add this class before the CodeMirrorEditor component
class CursorWidget extends WidgetType {
  constructor(readonly username: string, readonly color: string) {
    super();
  }

  toDOM() {
    const dom = document.createElement('span');
    dom.className = 'cm-cursor-label';
    dom.style.backgroundColor = this.color;
    dom.style.color = 'white';
    dom.style.padding = '2px 8px';
    dom.style.borderRadius = '4px';
    dom.style.fontSize = '12px';
    dom.style.fontWeight = '600';
    dom.style.position = 'absolute';
    dom.style.transform = 'translateY(-100%)';
    dom.style.zIndex = '999';
    dom.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    dom.style.transition = 'opacity 0.2s ease';
    dom.textContent = this.username;
    return dom;
  }

  eq(other: CursorWidget) {
    return other.username === this.username && other.color === this.color;
  }
}

function cursorExtension(provider: WebsocketProvider) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      
      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        // Update cursor position when the local user moves their cursor
        if (update.selectionSet) {
          const pos = update.state.selection.main;
          const line = update.state.doc.lineAt(pos.head);
          provider.awareness.setLocalState({
            ...provider.awareness.getLocalState(),
            position: {
              lineNumber: line.number,
              column: pos.head - line.from
            }
          });
        }

        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView) {
        const widgets: any[] = [];
        const states = provider.awareness.getStates();

        states.forEach((state: any, clientId: number) => {
          if (clientId !== provider.awareness.clientID && state.user && state.position) {
            const pos = state.position;
            if (pos) {
              try {
                const line = view.state.doc.line(pos.lineNumber);
                const linePos = line.from + Math.min(pos.column, line.length);
                const widget = Decoration.widget({
                  widget: new CursorWidget(state.user.name, state.user.color),
                  side: 1
                });
                widgets.push(widget.range(linePos));
              } catch (e) {
                console.warn("Error creating cursor decoration:", e);
              }
            }
          }
        });

        return Decoration.set(widgets);
      }
    },
    {
      decorations: v => v.decorations
    }
  );
}

export default function CodeMirrorEditor({
  roomId,
  initialCode,
  language,
  currentUser,
  onCodeChange,
  roomName,
  roomDescription,
  roomOwner,
}: CodeMirrorEditorProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stdin, setStdin] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<AISuggestion>({ text: '', isLoading: false, error: null });
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ lineNumber: number, column: number } | null>(null);
  const [showTestCase, setShowTestCase] = useState(false);
  
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  
  // Stable reference to onCodeChange callback
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);
  
  const userColor = useRef(getRandomColor());
  
  // Create a stable reference to current user
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  
  // Memoize language extension to prevent re-creation
  const languageExtension = useMemo(() => getLanguageExtension(language), [language]);
  
  // Get the language icon
  const languageIcon = useMemo(() => getLanguageIcon(language), [language]);
  
  // Memoize custom keymap to prevent re-creation
  const customKeymap = useMemo(() => keymap.of([
    {
      key: "Enter",
      run: (view) => {
        const transaction = view.state.update({
          changes: {
            from: view.state.selection.main.head,
            insert: "\n"
          },
          selection: { anchor: view.state.selection.main.head + 1 }
        });
        view.dispatch(transaction);
        return true;
      }
    },
    {
      key: "Mod-z",
      run: (view) => {
        if (yDocRef.current && undoManagerRef.current) {
          undoManagerRef.current.undo();
          return true;
        }
        return false;
      }
    },
    {
      key: "Mod-y",
      mac: "Mod-Shift-z",
      run: (view) => {
        if (yDocRef.current && undoManagerRef.current) {
          undoManagerRef.current.redo();
          return true;
        }
        return false;
      }
    },
    ...defaultKeymap.filter(k => k.key !== "Mod-z" && k.key !== "Mod-y" && k.key !== "Mod-Shift-z"),
    indentWithTab
  ]), []);
  
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Clean up previous editor instance and connections
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }
    
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }
    
    if (yDocRef.current) {
      yDocRef.current.destroy();
      yDocRef.current = null;
    }
    
    // Create a fresh Yjs document
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    
    // Connect to WebSocket server
    const provider = new WebsocketProvider(
      `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/yjs` || "ws://localhost:1234/yjs",
      `code-collab-${roomId}`,
      yDoc,
      { connect: true }
    );
    providerRef.current = provider;
    
    // Set up awareness (for cursor positions)
    const awareness = provider.awareness;
    
    // Set local user state
    awareness.setLocalState({
      user: {
        id: currentUserRef.current.id,
        name: currentUserRef.current.name,
        color: userColor.current,
      },
      position: null
    });
    
    // Handle remote user updates
    const handleAwarenessUpdate = () => {
      const states = awareness.getStates();
      const userMap = new Map<string, RemoteUser>();
      
      states.forEach((state: any, clientId: number) => {
        if (clientId !== awareness.clientID && state.user && state.user.id) {
          // Use the user ID as the key to prevent duplicates
          userMap.set(state.user.id, {
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            position: state.position,
          });
        }
      });
      
      // Convert map to array for rendering
      const uniqueUsers = Array.from(userMap.values());
      console.log(`Remote users (${uniqueUsers.length}):`, uniqueUsers);
      setRemoteUsers(uniqueUsers);
    };
    
    // Make sure to clean all previous listeners before adding new ones
    awareness.off("update", handleAwarenessUpdate);
    awareness.on("update", handleAwarenessUpdate);
    
    // Force an initial awareness update to populate the users
    handleAwarenessUpdate();
    
    // Handle connection status
    const handleStatus = ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
    };

    const handleError = (event: any) => {
      setError("Connection error: " + (event.message || "Unknown error"));
    };
    
    provider.on("status", handleStatus);
    provider.on("connection-error", handleError);
    
    // Get the Yjs text type
    const yText = yDoc.getText("codemirror");
    
    // If the document is empty, initialize it with the initial code
    if (yText.toString() === "" && initialCode) {
      yText.insert(0, initialCode);
    }
    
    // Create undo manager
    const undoManager = new Y.UndoManager(yText);
    undoManagerRef.current = undoManager;
    
    // Create a simpler editor setup with all necessary extensions for key handling
    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        EditorState.lineSeparator.of("\n"),
        languageExtension,
        oneDark,
        EditorView.lineWrapping,
        EditorView.theme({
          ".cm-content, .cm-gutter": {
            minHeight: "calc(20 * 1.5em)"
          }
        }),
        customKeymap,
        yCollab(yText, provider.awareness, { undoManager }),
        cursorExtension(provider),
        EditorView.updateListener.of(update => {
          if (update.docChanged && onCodeChangeRef.current) {
            onCodeChangeRef.current(update.state.doc.toString());
          }
        })
      ]
    });
    
    // Create and mount the editor
    const view = new EditorView({
      state,
      parent: editorRef.current
    });
    
    editorViewRef.current = view;
    
    return () => {
      // Clean up properly when component unmounts
      if (editorViewRef.current) {
        awareness.off("update", handleAwarenessUpdate);
        provider.off("status", handleStatus);
        provider.off("connection-error", handleError);
        view.destroy();
        provider.disconnect();
        yDoc.destroy();
        yDocRef.current = null;
        providerRef.current = null;
        editorViewRef.current = null;
      }
    };
  }, [roomId, initialCode, languageExtension, customKeymap]); // Reduced dependency array
  
  const submitCode = async () => {
    if (editorViewRef.current) {
      try {
        setIsExecuting(true);
        setOutput("Executing code...");
        
        const code = editorViewRef.current.state.doc.toString();
        onCodeChangeRef.current?.(code);
        const judge0Body = {
          source_code: code,
          language_id: languageMap[language as keyof typeof languageMap],
          stdin: stdin,
          expected_output: null,
        }
        
        const response = await axios.post(`${process.env.NEXT_PUBLIC_JUDGE0_URL}/submissions`, judge0Body);
        console.log(response.data);
        const submissionId = response.data.token;
        
        const interval = setInterval(async () => {
          try {
            const checkResponse = await axios.get(`${process.env.NEXT_PUBLIC_JUDGE0_URL}/submissions/${submissionId}`);
            console.log(checkResponse.data);
            
            if (checkResponse.data.status.id >= 3) { // Result is available
              clearInterval(interval);
              setIsExecuting(false);
              
              const result = checkResponse.data;
              let outputText = "";
              
              if (result.stdout) {
                outputText += result.stdout;
              }
              
              if (result.stderr) {
                outputText += "\nErrors:\n" + result.stderr;
              }
              
              if (result.compile_output) {
                outputText += "\nCompile Output:\n" + result.compile_output;
              }
              
              if (result.message) {
                outputText += "\nMessage:\n" + result.message;
              }
              
              setOutput(outputText || "No output");
            }
          } catch (error) {
            clearInterval(interval);
            setIsExecuting(false);
            setOutput("Error checking submission status");
            console.error("Error checking submission:", error);
          }
        }, 1500);
      } catch (error) {
        setIsExecuting(false);
        setOutput("Error submitting code");
        console.error("Error submitting code:", error);
      }
    }
  }

  // Function to handle AI suggestions
  const getAISuggestion = async () => {
    if (!editorViewRef.current) return;
    
    setAISuggestion({ text: '', isLoading: true, error: null });
    setShowSuggestion(true);
    
    try {
      const code = editorViewRef.current.state.doc.toString();
      const response = await axios.post('/api/ai/suggestions', {
        code,
        language,
        cursorPosition,
        context: 'User is working in a collaborative coding environment'
      });
      
      // Make sure we're only getting the actual code, not markdown
      const suggestion = response.data.suggestion || '';
      
      setAISuggestion({ 
        text: suggestion, 
        isLoading: false, 
        error: null 
      });
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      setAISuggestion({ 
        text: '', 
        isLoading: false, 
        error: 'Failed to get AI suggestion. Please try again.' 
      });
    }
  };

  // Function to apply AI suggestion to the editor
  const applyAISuggestion = () => {
    if (!editorViewRef.current || !aiSuggestion.text) return;
    
    const view = editorViewRef.current;
    const { state } = view;
    
    if (cursorPosition) {
      // Get the current position in the document
      const pos = state.doc.line(cursorPosition.lineNumber).from + cursorPosition.column - 1;
      
      // Insert the suggestion at the cursor position
      view.dispatch({
        changes: { from: pos, insert: aiSuggestion.text }
      });
    }
    
    // Hide the suggestion panel
    setShowSuggestion(false);
    setAISuggestion({ text: '', isLoading: false, error: null });
  };

  // Track cursor position
  useEffect(() => {
    if (!editorViewRef.current) return;

    const updateCursorPosition = (view: EditorView) => {
      const { state } = view;
      const selection = state.selection.main;
      const pos = selection.head;
      const line = state.doc.lineAt(pos);
      
      setCursorPosition({
        lineNumber: line.number,
        column: pos - line.from + 1
      });
    };

    const view = editorViewRef.current;
    updateCursorPosition(view);

    const listener = EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        updateCursorPosition(update.view);
      }
    });

    view.dispatch({
      effects: StateEffect.appendConfig.of(listener)
    });

    return () => {
      // Cleanup is handled by the editor destroy in the main useEffect
    };
  }, [editorViewRef.current]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-150px)] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex flex-col w-full lg:w-[60%]  bg-gray-50 dark:bg-gray-900 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
        <style jsx global>{`
          .remote-cursor {
            position: relative;
            padding-left: 1px;
          }
          .cm-cursor-label {
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
            opacity: 0.9;
            transform: translateY(-100%) translateX(-10px);
          }
          .cm-editor {
            height: 100%;
            width: 100%;
            font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Menlo', monospace;
            font-size: 14px;
          }
          .cm-scroller {
            overflow: auto !important;
            height: 100% !important;
          }
          .cm-content {
            min-height: 100%;
            white-space: pre !important;
            padding: 0.75rem 0;
          }
          .cm-line {
            white-space: pre !important;
            padding: 0 0.75rem 0 0;
          }
          .cm-lineWrapping {
            white-space: pre-wrap !important;
          }
          .cm-gutters {
            height: 100%;
            border-right: 1px solid #e5e7eb;
            background-color: rgba(249, 250, 251, 0.9);
          }
          .dark .cm-gutters {
            border-right: 1px solid #374151;
            background-color: rgba(31, 41, 55, 0.9);
          }
          /* Customize scrollbar */
          .cm-scroller::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .cm-scroller::-webkit-scrollbar-track {
            background: transparent;
          }
          .cm-scroller::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.15);
            border-radius: 8px;
          }
          .dark .cm-scroller::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.15);
          }
          .cm-scroller::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.25);
          }
          .dark .cm-scroller::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255, 255, 255, 0.25);
          }
          /* Improve active line highlight */
          .cm-activeLine {
            background-color: rgba(224, 231, 255, 0.35) !important;
          }
          .dark .cm-activeLine {
            background-color: rgba(55, 65, 81, 0.6) !important;
          }
          
          /* Terminal styling */
          .terminal-input {
            background-color: #0d1117;
            color: #e6edf3;
            font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
            border: 1px solid #30363d;
            resize: none;
            position: relative;
            padding-left: 1.5rem !important;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          
          .terminal-input:focus {
            box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.4) !important;
            border-color: #58a6ff !important;
          }
          
          .terminal-input::before {
            content: '';
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          
          .terminal-prompt {
            position: absolute;
            left: 0.6rem;
            top: 0.5rem;
            color: #58a6ff;
            user-select: none;
            pointer-events: none;
            font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
          }
          
          .terminal-wrapper {
            position: relative;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .terminal-header {
            background-color: #161b22;
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .window-controls {
            display: flex;
            gap: 0.4rem;
          }
          
          .window-control {
            width: 0.75rem;
            height: 0.75rem;
            border-radius: 50%;
            display: inline-block;
            transition: opacity 0.2s;
          }
          
          .window-control:hover {
            opacity: 0.8;
          }
          
          .window-control.close {
            background-color: #f85149;
          }
          
          .window-control.minimize {
            background-color: #f0883e;
          }
          
          .window-control.maximize {
            background-color: #3fb950;
          }
          
          .terminal-title {
            color: #8b949e;
            font-size: 0.75rem;
            margin-left: -3rem;
            width: 100%;
            text-align: center;
            user-select: none;
          }
          
          /* Ensure editor takes full height */
          .editor-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }
          
          .cm-editor {
            height: 100%;
            width: 100%;
            font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Menlo', monospace;
            font-size: 14px;
          }
          
          .cm-scroller {
            overflow: auto !important;
            height: 100% !important;
          }
          
          /* Make sure the main content area fills available space */
          .editor-content-area {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          /* Animate transitions */
          .transition-all {
            transition-property: all;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
          }
          
          /* Animation for notifications */
          @keyframes slideInFromTop {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          .notification-animate {
            animation: slideInFromTop 0.3s ease-out forwards;
          }
          
          /* User avatar styling */
          .user-avatar {
            transition: transform 0.2s ease;
          }
          
          .user-avatar:hover {
            transform: scale(1.1);
          }
          
          /* Button hover effects */
          .btn-hover-effect {
            transition: all 0.2s ease;
          }
          
          .btn-hover-effect:hover:not(:disabled) {
            transform: translateY(-1px);
          }
          
          .btn-hover-effect:active:not(:disabled) {
            transform: translateY(0px);
          }
          
          /* Focus styles for accessibility */
          .focus-ring:focus {
            outline: none;
            ring: 2px;
            ring-offset: 2px;
            ring-color: rgba(59, 130, 246, 0.5);
          }
        `}</style>
        
        {error && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 m-3 rounded shadow-md notification-animate">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button 
                className="ml-auto text-red-500 hover:text-red-700 transition-colors"
                onClick={() => setError(null)}
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {isConnected ? (
                  <div className="flex items-center space-x-1">
                    <HiOutlineStatusOnline className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Connected
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 animate-pulse">
                    <HiOutlineStatusOffline className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Disconnected
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <MdOutlineRoom className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Room:</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{roomId}</span>
            </div>
            
            <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <span className="text-lg">{languageIcon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Language:</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{language}</span>
            </div>
            
            <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
            
            {/* AI Suggestion Button */}
            <div className="flex items-center space-x-2">
              <button
                onClick={getAISuggestion}
                className="flex items-center space-x-1 text-sm font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors btn-hover-effect focus-ring"
                title="Get AI code suggestion"
              >
                <FiCpu className="h-4 w-4" />
                <span>AI Suggest</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {remoteUsers.length > 0 && (
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 py-1 px-2 rounded-full text-xs">
                <FiUsers className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {remoteUsers.length} {remoteUsers.length === 1 ? 'user' : 'users'} online
                </span>
              </div>
            )}
            
            <div className="flex items-center -space-x-2">
              {remoteUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="user-avatar h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm border-2 border-white dark:border-gray-800" 
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              
              <div
                className="user-avatar h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm border-2 border-white dark:border-gray-800 relative"
                style={{ backgroundColor: userColor.current }}
                title={currentUser.name + " (You)"}
              >
                {currentUser.name.charAt(0).toUpperCase()}
                <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add the AI Suggestion panel after the toolbar */}
        {showSuggestion && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-auto shadow-inner">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <FiCpu className="text-blue-500 mr-2" size={18} />
                <span className="font-medium text-gray-800 dark:text-gray-200">AI Suggestion</span>
              </div>
              <button 
                onClick={() => setShowSuggestion(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>
            
            {aiSuggestion.isLoading ? (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Generating suggestion...</span>
              </div>
            ) : aiSuggestion.error ? (
              <div className="text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm border border-red-200 dark:border-red-800/50">
                {aiSuggestion.error}
              </div>
            ) : (
              <div className="flex flex-col">
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md font-mono text-sm overflow-x-auto border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-inner">
                  {aiSuggestion.text}
                </pre>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={applyAISuggestion}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 transition-colors shadow btn-hover-effect focus-ring flex items-center space-x-1"
                  >
                    <FiCheckCircle className="h-4 w-4" />
                    <span>Apply Suggestion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="editor-content-area">
          <div 
            ref={editorRef} 
            className="flex-1 h-full w-full overflow-hidden border-gray-200 dark:border-gray-700"
            onFocus={() => setFocused(true)} 
            onBlur={() => setFocused(false)}
          />
        </div>
        
        <div className="flex flex-col space-y-4 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTestCase(!showTestCase)}
                className={`px-3 py-2 rounded-md transition-colors flex items-center space-x-2 btn-hover-effect focus-ring ${
                  showTestCase 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <FiTerminal className="w-4 h-4" />
                <span>{showTestCase ? 'Hide Test Case' : 'Add Test Case'}</span>
              </button>
              
              <button
                onClick={submitCode}
                disabled={isExecuting}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 shadow-sm btn-hover-effect focus-ring ${
                  isExecuting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <FiPlay className="w-4 h-4" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  if (editorViewRef.current) {
                    const code = editorViewRef.current.state.doc.toString();
                    navigator.clipboard.writeText(code);
                    setCopiedToClipboard(true);
                    setTimeout(() => setCopiedToClipboard(false), 2000);
                  }
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors flex items-center space-x-2 focus-ring"
              >
                <MdContentCopy className="w-4 h-4" />
                <span>{copiedToClipboard ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            
            {cursorPosition && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                Line {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </div>
            )}
          </div>

          {showTestCase && (
            <div className="space-y-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <label htmlFor="stdin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <FiCornerDownRight className="mr-1 text-gray-500" />
                Test Case Input
              </label>
              <div className="relative">
                <textarea
                  id="stdin"
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Enter your test case input here..."
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-300 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {output && (
            <div className="space-y-3">
              <div className="flex items-center">
                <FiTerminal className="mr-2 text-gray-700 dark:text-gray-300" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Output</h3>
              </div>
              <div className="terminal-wrapper rounded-md overflow-hidden">
                <div className="terminal-header">
                  <div className="window-controls">
                    <span className="window-control close"></span>
                    <span className="window-control minimize"></span>
                    <span className="window-control maximize"></span>
                  </div>
                  <div className="terminal-title">Terminal</div>
                </div>
                <pre className="bg-[#0d1117] text-[#e6edf3] p-4 rounded-b-md overflow-x-auto overflow-y-auto h-40 font-mono text-sm">
                  {output}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat window space (40%) */}
      <div className="w-full lg:w-[40%] h-full lg:h-full border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
        <ChatPanel 
          roomName={roomName}
          roomDescription={roomDescription}
          roomOwner={roomOwner}
          language={language}
          languageIcon={languageIcon}
          remoteUsers={remoteUsers}
          roomId={roomId}
          codeContent={yDocRef.current ? yDocRef.current.getText("codemirror").toString() : initialCode}
        />
      </div>
    </div>
  );
}