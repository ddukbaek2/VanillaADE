//=================================================================================================
// terminalStore.js
// 에이전트별 xterm 터미널 인스턴스를 앱 전역에서 보관한다. 뷰가 바뀌어도 터미널은 살아있고
// pty 출력은 계속 버퍼에 기록되므로, 다시 표시할 때 이전 내용이 유지된다.
//=================================================================================================

const System = globalThis;

import { t } from "./locale.js";
import { getStoredTheme, getThemeColors } from "./themeManager.js";

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
// 전역 이벤트 구독을 초기화한다. (앱 시작 시 1회 호출)
//=================================================================================================
export function initializeTerminalStore()
{
    const vanilla = window.vanilla;
    vanilla.onAgentData(handleAgentData);
    vanilla.onAgentExit(handleAgentExit);
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
