//=================================================================================================
// views/agentTerminal.js
// 에이전트 대화 화면. 선택된 에이전트의 터미널(= Claude Code 세션)을 컨텐트 영역에 표시한다.
// 터미널은 백그라운드에 상주하므로(terminalStore), 화면을 다시 그려도 이전 대화가 유지된다.
//=================================================================================================

const System = globalThis;

import { getOrCreateTerminal, fitTerminal } from "../terminalStore.js";
import { getAgentKindLabel } from "../agentDialog.js";
import { t } from "../locale.js";

//=================================================================================================
// 에이전트가 선택되지 않았을 때의 안내 화면을 만든다.
//=================================================================================================
function createEmptyView()
{
    const emptyElement = document.createElement("div");
    emptyElement.className = "agent-terminal-empty";

    const messageElement = document.createElement("p");
    messageElement.className = "agent-terminal-empty-message";
    messageElement.textContent = t("agent.selectHint");
    emptyElement.appendChild(messageElement);

    return emptyElement;
}

//=================================================================================================
// 에이전트 정보와 실행 제어 버튼이 있는 상단 헤더를 만든다.
//=================================================================================================
function createHeader(agent, viewContext)
{
    const headerElement = document.createElement("div");
    headerElement.className = "agent-terminal-header";

    const titleRowElement = document.createElement("div");
    titleRowElement.className = "agent-terminal-title-row";

    const titleElement = document.createElement("h1");
    titleElement.className = "agent-terminal-title";
    titleElement.textContent = agent.name;
    titleRowElement.appendChild(titleElement);

    const statusBadgeElement = document.createElement("span");
    statusBadgeElement.className = "status-badge";
    const isRunning = agent.running;
    if (isRunning === true)
    {
        statusBadgeElement.classList.add("running");
        statusBadgeElement.textContent = t("agent.statusRunning");
    }
    else
    {
        statusBadgeElement.classList.add("stopped");
        statusBadgeElement.textContent = t("agent.statusStopped");
    }
    titleRowElement.appendChild(statusBadgeElement);

    const kindElement = document.createElement("span");
    kindElement.className = "agent-terminal-kind";
    const kindLabel = getAgentKindLabel(agent.kind);
    kindElement.textContent = kindLabel;
    titleRowElement.appendChild(kindElement);

    const actionsElement = document.createElement("div");
    actionsElement.className = "agent-terminal-actions";

    const agentId = agent.id;
    if (isRunning === true)
    {
        const stopButtonElement = document.createElement("button");
        stopButtonElement.className = "secondary-button";
        stopButtonElement.textContent = t("agent.stop");
        const onStopAgent = viewContext.onStopAgent;
        stopButtonElement.addEventListener("click", function (stopClickEvent)
        {
            onStopAgent(agentId);
        });
        actionsElement.appendChild(stopButtonElement);
    }
    else
    {
        const startButtonElement = document.createElement("button");
        startButtonElement.className = "primary-button";
        startButtonElement.textContent = t("agent.start");
        const onStartAgent = viewContext.onStartAgent;
        startButtonElement.addEventListener("click", function (startClickEvent)
        {
            onStartAgent(agentId);
        });
        actionsElement.appendChild(startButtonElement);
    }
    titleRowElement.appendChild(actionsElement);

    headerElement.appendChild(titleRowElement);

    const directoryElement = document.createElement("div");
    directoryElement.className = "agent-terminal-directory";
    directoryElement.textContent = agent.directory;
    headerElement.appendChild(directoryElement);

    return headerElement;
}

export const agentTerminalView =
{
    id: "agent-terminal",
    render: function (contentElement, viewContext)
    {
        contentElement.replaceChildren();

        const agent = viewContext.agent;
        if (agent === null)
        {
            const emptyElement = createEmptyView();
            contentElement.appendChild(emptyElement);
            return;
        }

        const rootElement = document.createElement("div");
        rootElement.className = "agent-terminal-root";

        const headerElement = createHeader(agent, viewContext);
        rootElement.appendChild(headerElement);

        const terminalContainerElement = document.createElement("div");
        terminalContainerElement.className = "agent-terminal-container";

        const agentId = agent.id;
        const terminalEntry = getOrCreateTerminal(agentId);
        const terminalElement = terminalEntry.element;
        terminalContainerElement.appendChild(terminalElement);
        rootElement.appendChild(terminalContainerElement);

        contentElement.appendChild(rootElement);

        window.requestAnimationFrame(function ()
        {
            fitTerminal(agentId);
        });
    }
};
