//=================================================================================================
// terminalStore.js
// 에이전트별 xterm 터미널 인스턴스를 앱 전역에서 보관한다. 뷰가 바뀌어도 터미널은 살아있고
// pty 출력은 계속 버퍼에 기록되므로, 다시 표시할 때 이전 내용이 유지된다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";
import { getStoredTheme, getThemeColors } from "./themeManager.js";
import { openContextMenuAt } from "./contextMenu.js";

const TerminalConstructor = window.Terminal;
const FitAddonNamespace = window.FitAddon;

const terminalEntries = new System.Map();

//=================================================================================================
// 현재 테마(theme.json)의 터미널 색을 xterm 테마 객체로 만든다.
//=================================================================================================
function buildTerminalTheme()
{
    const themeName = getStoredTheme();
    const colorSet = getThemeColors(themeName);
    const terminalTheme =
    {
        background: colorSet["terminal-background"],
        foreground: colorSet["terminal-foreground"],
        cursor: colorSet["terminal-cursor"],
        selectionBackground: colorSet["terminal-selection"]
    };
    return terminalTheme;
}

//=================================================================================================
// pty 출력 데이터를 해당 터미널에 기록한다.
//=================================================================================================
function handleAgentData(payload)
{
    const agentId = payload.id;
    const entry = terminalEntries.get(agentId);
    if (entry === undefined)
    {
        return;
    }
    const terminal = entry.terminal;
    const data = payload.data;
    terminal.write(data);
}

//=================================================================================================
// 에이전트 종료를 해당 터미널에 표시한다.
//=================================================================================================
function handleAgentExit(payload)
{
    const agentId = payload.id;
    const entry = terminalEntries.get(agentId);
    if (entry === undefined)
    {
        return;
    }
    const terminal = entry.terminal;
    const escapeCharacter = String.fromCharCode(27);
    const exitedMessage = t("terminal.processExited");
    terminal.write("\r\n" + escapeCharacter + "[90m" + exitedMessage + escapeCharacter + "[0m\r\n");
    entry.exited = true;
}

//=================================================================================================
// 살아있는 모든 터미널에 현재 테마 색을 다시 적용한다.
//=================================================================================================
function applyThemeToTerminals()
{
    const terminalTheme = buildTerminalTheme();
    for (const entry of terminalEntries.values())
    {
        const terminal = entry.terminal;
        terminal.options.theme = terminalTheme;
    }
}

//=================================================================================================
// 전역 이벤트 구독을 초기화한다. (앱 시작 시 1회 호출)
// 테마 전환(<html> 의 data-theme 변경)은 이미 만들어진 터미널에도 반영한다.
//=================================================================================================
export function initializeTerminalStore()
{
    const vanilla = window.vanilla;
    vanilla.onAgentData(handleAgentData);
    vanilla.onAgentExit(handleAgentExit);

    const rootElement = document.documentElement;
    const themeObserver = new window.MutationObserver(function (mutationRecords)
    {
        applyThemeToTerminals();
    });
    const observerOptions =
    {
        attributes: true,
        attributeFilter: ["data-theme"]
    };
    themeObserver.observe(rootElement, observerOptions);
}

//=================================================================================================
// 터미널에서 선택된 텍스트를 클립보드에 복사한다.
//=================================================================================================
function copySelection(terminal)
{
    const selectedText = terminal.getSelection();
    if (selectedText.length === 0)
    {
        return;
    }
    const vanilla = window.vanilla;
    vanilla.writeClipboardText(selectedText);
}

//=================================================================================================
// 클립보드의 텍스트를 터미널(에이전트)에 입력한다.
//=================================================================================================
function pasteFromClipboard(agentId)
{
    const vanilla = window.vanilla;
    const clipboardText = vanilla.readClipboardText();
    if (clipboardText.length === 0)
    {
        return;
    }
    vanilla.writeToAgent(agentId, clipboardText);
}

//=================================================================================================
// 터미널 우클릭 시 복사 / 붙여넣기 컨텍스트 메뉴를 띄운다.
//=================================================================================================
function handleTerminalContextMenu(contextMenuEvent, agentId, terminal)
{
    contextMenuEvent.preventDefault();

    const menuItems = [];
    const selectedText = terminal.getSelection();
    if (selectedText.length > 0)
    {
        const copyItem =
        {
            label: t("terminal.copy"),
            action: function ()
            {
                copySelection(terminal);
            }
        };
        menuItems.push(copyItem);
    }

    const pasteItem =
    {
        label: t("terminal.paste"),
        action: function ()
        {
            pasteFromClipboard(agentId);
            terminal.focus();
        }
    };
    menuItems.push(pasteItem);

    const clientX = contextMenuEvent.clientX;
    const clientY = contextMenuEvent.clientY;
    openContextMenuAt(clientX, clientY, menuItems);
}

//=================================================================================================
// 복사 / 붙여넣기 단축키를 처리한다. 처리했으면 false 를 반환해 터미널 입력으로 넘기지 않는다.
// macOS 는 Cmd+C / Cmd+V, 그 외 플랫폼은 Ctrl+Shift+C / Ctrl+Shift+V 를 사용한다.
//=================================================================================================
function handleClipboardShortcut(keyboardEvent, agentId, terminal)
{
    if (keyboardEvent.type !== "keydown")
    {
        return true;
    }

    const vanilla = window.vanilla;
    const isMacintosh = vanilla.platform === "darwin";
    let isClipboardModifier = keyboardEvent.ctrlKey === true && keyboardEvent.shiftKey === true;
    if (isMacintosh === true)
    {
        isClipboardModifier = keyboardEvent.metaKey === true && keyboardEvent.shiftKey === false;
    }
    if (isClipboardModifier === false)
    {
        return true;
    }

    const pressedKey = keyboardEvent.key.toLowerCase();
    if (pressedKey === "c")
    {
        const selectedText = terminal.getSelection();
        // 선택 영역이 없으면 복사가 아니라 인터럽트(Ctrl+C)로 동작해야 한다.
        if (selectedText.length === 0)
        {
            return true;
        }
        copySelection(terminal);
        return false;
    }
    if (pressedKey === "v")
    {
        pasteFromClipboard(agentId);
        return false;
    }
    return true;
}

//=================================================================================================
// 에이전트 아이디에 해당하는 터미널 엔트리를 반환한다. 없으면 새로 만든다.
//=================================================================================================
export function getOrCreateTerminal(agentId)
{
    const existingEntry = terminalEntries.get(agentId);
    if (existingEntry !== undefined)
    {
        return existingEntry;
    }

    const elementWrapper = document.createElement("div");
    elementWrapper.className = "terminal-surface";

    const terminalTheme = buildTerminalTheme();
    const terminalOptions =
    {
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
        fontSize: 13,
        theme: terminalTheme
    };
    const terminal = new TerminalConstructor(terminalOptions);
    const fitAddon = new FitAddonNamespace.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(elementWrapper);

    elementWrapper.addEventListener("contextmenu", function (contextMenuEvent)
    {
        handleTerminalContextMenu(contextMenuEvent, agentId, terminal);
    });
    terminal.attachCustomKeyEventHandler(function (keyboardEvent)
    {
        const shouldPassToTerminal = handleClipboardShortcut(keyboardEvent, agentId, terminal);
        return shouldPassToTerminal;
    });

    const vanilla = window.vanilla;
    terminal.onData(function (data)
    {
        vanilla.writeToAgent(agentId, data);
    });
    terminal.onResize(function (sizeInfo)
    {
        const columns = sizeInfo.cols;
        const rows = sizeInfo.rows;
        vanilla.resizeAgent(agentId, columns, rows);
    });

    const entry =
    {
        agentId: agentId,
        terminal: terminal,
        fitAddon: fitAddon,
        element: elementWrapper,
        exited: false
    };
    terminalEntries.set(agentId, entry);

    // 창을 새로 열었거나 화면을 다시 만든 경우, 지금까지의 출력을 이어서 보여준다.
    vanilla.getAgentOutput(agentId).then(function (previousOutput)
    {
        if (previousOutput.length === 0)
        {
            return;
        }
        terminal.write(previousOutput);
    });

    return entry;
}

//=================================================================================================
// 터미널을 컨테이너 크기에 맞추고 입력 포커스를 준다.
//=================================================================================================
export function fitTerminal(agentId)
{
    const entry = terminalEntries.get(agentId);
    if (entry === undefined)
    {
        return;
    }
    const fitAddon = entry.fitAddon;
    fitAddon.fit();
    const terminal = entry.terminal;
    terminal.focus();
}

//=================================================================================================
// 터미널을 폐기한다.
//=================================================================================================
export function disposeTerminal(agentId)
{
    const entry = terminalEntries.get(agentId);
    if (entry === undefined)
    {
        return;
    }
    const terminal = entry.terminal;
    terminal.dispose();
    terminalEntries.delete(agentId);
}
