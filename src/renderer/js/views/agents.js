//=================================================================================================
// views/agents.js
// 에이전트 뷰. 단일/멀티 에이전트(= 터미널 세션)를 생성·선택·표시한다.
// 터미널은 백그라운드에 상주하며(terminalStore), 선택된 에이전트의 터미널만 화면에 표시한다.
//=================================================================================================

import { getOrCreateTerminal, fitTerminal } from "../terminalStore.js";
import { t } from "../locale.js";

const System = globalThis;

const agentsViewState =
{
    agents: [],
    selectedAgentId: null,
    contentElement: null,
    viewContext: null
};

//=================================================================================================
// 에이전트를 선택하고 다시 그린다.
//=================================================================================================
function selectAgent(agentId)
{
    agentsViewState.selectedAgentId = agentId;
    renderView();
}

//=================================================================================================
// 새 에이전트를 생성한다.
//=================================================================================================
async function createNewAgent()
{
    const viewContext = agentsViewState.viewContext;
    const workingDirectory = viewContext.projectPath;
    const vanilla = window.vanilla;
    const agentInfo = await vanilla.createAgent(workingDirectory);
    agentsViewState.agents.push(agentInfo);
    agentsViewState.selectedAgentId = agentInfo.id;
    renderView();
}

//=================================================================================================
// 상단 툴바(제목 + 새 에이전트 버튼)를 만든다.
//=================================================================================================
function createToolbar()
{
    const toolbarElement = document.createElement("div");
    toolbarElement.className = "agents-toolbar";

    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("nav.agents");
    toolbarElement.appendChild(titleElement);

    const createButtonElement = document.createElement("button");
    createButtonElement.className = "agents-create-button";
    createButtonElement.textContent = t("agents.new");
    createButtonElement.addEventListener("click", function (createClickEvent)
    {
        createNewAgent();
    });
    toolbarElement.appendChild(createButtonElement);

    return toolbarElement;
}

//=================================================================================================
// 에이전트 목록(세로 나열)을 만든다.
//=================================================================================================
function createAgentList()
{
    const listElement = document.createElement("div");
    listElement.className = "agents-list";

    const selectedAgentId = agentsViewState.selectedAgentId;
    for (const agent of agentsViewState.agents)
    {
        const itemElement = document.createElement("button");
        itemElement.className = "agents-list-item";
        if (agent.id === selectedAgentId)
        {
            itemElement.classList.add("active");
        }
        itemElement.textContent = agent.title;
        const agentId = agent.id;
        itemElement.addEventListener("click", function (itemClickEvent)
        {
            selectAgent(agentId);
        });
        listElement.appendChild(itemElement);
    }

    return listElement;
}

//=================================================================================================
// 현재 상태를 컨텐트 영역에 다시 그린다.
//=================================================================================================
function renderView()
{
    const contentElement = agentsViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const rootElement = document.createElement("div");
    rootElement.className = "agents-root";

    const toolbarElement = createToolbar();
    rootElement.appendChild(toolbarElement);

    const bodyElement = document.createElement("div");
    bodyElement.className = "agents-body";

    const agentCount = agentsViewState.agents.length;
    if (agentCount === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "agents-empty-message";
        emptyElement.textContent = t("agents.empty");
        bodyElement.appendChild(emptyElement);
    }
    else
    {
        const listElement = createAgentList();
        bodyElement.appendChild(listElement);

        const terminalContainerElement = document.createElement("div");
        terminalContainerElement.className = "agents-terminal-container";

        const selectedAgentId = agentsViewState.selectedAgentId;
        if (selectedAgentId !== null)
        {
            const entry = getOrCreateTerminal(selectedAgentId);
            const terminalElement = entry.element;
            terminalContainerElement.appendChild(terminalElement);
            window.requestAnimationFrame(function ()
            {
                fitTerminal(selectedAgentId);
            });
        }
        bodyElement.appendChild(terminalContainerElement);
    }

    rootElement.appendChild(bodyElement);
    contentElement.appendChild(rootElement);
}

export const agentsView =
{
    id: "agents",
    label: "에이전트 목록",
    render: function (contentElement, viewContext)
    {
        agentsViewState.contentElement = contentElement;
        agentsViewState.viewContext = viewContext;
        renderView();
    }
};
