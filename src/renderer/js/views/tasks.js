//=================================================================================================
// views/tasks.js
// 작업 목록 뷰. 에이전트에게 요청하는 작업을 생성/기록한다.
// 새 작업 요청 시 특정 에이전트를 지정하거나 자동 할당하며, 지정된 에이전트 터미널에 작업 내용을
// 전달하고 히스토리에 처리 기록을 남긴다. (.vanilla/tasks.json, .vanilla/history.json)
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";
import { logSystem } from "../historyLog.js";
import { showToast } from "../toast.js";

const tasksViewState =
{
    projectPath: null,
    contentElement: null
};

//=================================================================================================
// ISO 문자열을 읽기 좋은 형식으로 변환한다.
//=================================================================================================
function formatDateTime(isoString)
{
    if (isoString === undefined)
    {
        return "-";
    }
    const dateValue = new System.Date(isoString);
    const formattedValue = dateValue.toLocaleString();
    return formattedValue;
}

//=================================================================================================
// 선택 값에 따라 담당 에이전트를 결정한다. (자동 할당 또는 특정 인스턴스, 없으면 새로 생성)
//=================================================================================================
async function resolveAgent(agentSelectValue)
{
    const vanilla = window.vanilla;
    const projectPath = tasksViewState.projectPath;
    const agents = await vanilla.listAgents();

    if (agentSelectValue === "auto")
    {
        if (agents.length > 0)
        {
            const firstAgent = agents[0];
            return firstAgent;
        }
        const createdAgent = await vanilla.createAgent(projectPath);
        return createdAgent;
    }

    const targetAgentId = System.Number(agentSelectValue);
    for (const agent of agents)
    {
        if (agent.id === targetAgentId)
        {
            return agent;
        }
    }
    const newAgent = await vanilla.createAgent(projectPath);
    return newAgent;
}

//=================================================================================================
// 새 작업을 요청한다.
//=================================================================================================
async function requestTask(titleValue, contentValue, agentSelectValue)
{
    if (titleValue.length === 0)
    {
        return;
    }
    const vanilla = window.vanilla;
    const projectPath = tasksViewState.projectPath;

    const agent = await resolveAgent(agentSelectValue);
    const agentId = agent.id;
    const agentTitle = agent.title;

    if (contentValue.length > 0)
    {
        vanilla.writeToAgent(agentId, contentValue);
    }

    const currentDate = new System.Date();
    const nowIsoString = currentDate.toISOString();

    const taskItem =
    {
        title: titleValue,
        content: contentValue,
        status: "in-progress",
        assignedAgentId: agentId,
        assignedAgentTitle: agentTitle,
        createdAt: nowIsoString
    };
    const savedTask = await vanilla.saveTask(projectPath, taskItem);

    const historyItem =
    {
        source: "agent",
        taskId: savedTask.id,
        taskTitle: titleValue,
        title: titleValue,
        detail: contentValue,
        agentId: agentId,
        agentTitle: agentTitle,
        status: "in-progress",
        createdAt: nowIsoString
    };
    await vanilla.appendHistory(projectPath, historyItem);
    showToast(titleValue);

    loadAndRender();
}

//=================================================================================================
// 작업 상태를 완료로 변경한다.
//=================================================================================================
async function completeTask(task)
{
    const vanilla = window.vanilla;
    const projectPath = tasksViewState.projectPath;
    const updatedTask =
    {
        id: task.id,
        title: task.title,
        content: task.content,
        status: "done",
        assignedAgentId: task.assignedAgentId,
        assignedAgentTitle: task.assignedAgentTitle,
        createdAt: task.createdAt
    };
    await vanilla.saveTask(projectPath, updatedTask);
    await logSystem(projectPath, t("history.completedTask"), task.title);
    loadAndRender();
}

//=================================================================================================
// 작업을 삭제한다.
//=================================================================================================
async function deleteTask(taskId)
{
    const vanilla = window.vanilla;
    const projectPath = tasksViewState.projectPath;
    await vanilla.deleteTask(projectPath, taskId);
    await logSystem(projectPath, t("history.deletedTask"), "");
    loadAndRender();
}

//=================================================================================================
// 새 작업 요청 폼을 만든다. (제목 / 내용 / 담당 에이전트 선택)
//=================================================================================================
function createRequestForm(agents)
{
    const formElement = document.createElement("div");
    formElement.className = "form-card";

    const titleInputElement = document.createElement("input");
    titleInputElement.className = "text-input";
    titleInputElement.type = "text";
    titleInputElement.placeholder = t("tasks.titlePlaceholder");
    formElement.appendChild(titleInputElement);

    const contentInputElement = document.createElement("textarea");
    contentInputElement.className = "text-area";
    contentInputElement.placeholder = t("tasks.contentPlaceholder");
    formElement.appendChild(contentInputElement);

    const controlRowElement = document.createElement("div");
    controlRowElement.className = "form-control-row";

    const selectElement = document.createElement("select");
    selectElement.className = "select-input";

    const autoOptionElement = document.createElement("option");
    autoOptionElement.value = "auto";
    autoOptionElement.textContent = t("tasks.autoAssign");
    selectElement.appendChild(autoOptionElement);

    for (const agent of agents)
    {
        const optionElement = document.createElement("option");
        const agentId = agent.id;
        optionElement.value = String(agentId);
        optionElement.textContent = agent.title;
        selectElement.appendChild(optionElement);
    }
    controlRowElement.appendChild(selectElement);

    const requestButtonElement = document.createElement("button");
    requestButtonElement.className = "primary-button";
    requestButtonElement.textContent = t("tasks.request");
    requestButtonElement.addEventListener("click", function (requestClickEvent)
    {
        const titleValue = titleInputElement.value;
        const contentValue = contentInputElement.value;
        const agentSelectValue = selectElement.value;
        requestTask(titleValue, contentValue, agentSelectValue);
    });
    controlRowElement.appendChild(requestButtonElement);

    formElement.appendChild(controlRowElement);
    return formElement;
}

//=================================================================================================
// 작업 카드를 만든다.
//=================================================================================================
function createTaskCard(task)
{
    const cardElement = document.createElement("div");
    cardElement.className = "record-card";

    const headerRowElement = document.createElement("div");
    headerRowElement.className = "record-card-header";

    const titleElement = document.createElement("div");
    titleElement.className = "record-card-title";
    titleElement.textContent = task.title;
    headerRowElement.appendChild(titleElement);

    const badgeElement = document.createElement("span");
    badgeElement.className = "status-badge";
    const taskStatus = task.status;
    if (taskStatus === "done")
    {
        badgeElement.classList.add("connected");
    }
    else
    {
        badgeElement.classList.add("in-progress");
    }
    const taskStatusKey = "taskStatus." + taskStatus;
    badgeElement.textContent = t(taskStatusKey);
    headerRowElement.appendChild(badgeElement);

    cardElement.appendChild(headerRowElement);

    const contentValue = task.content;
    if (contentValue !== undefined && contentValue.length > 0)
    {
        const contentElement = document.createElement("div");
        contentElement.className = "record-card-content";
        contentElement.textContent = contentValue;
        cardElement.appendChild(contentElement);
    }

    const metaElement = document.createElement("div");
    metaElement.className = "record-card-meta";
    const assignedTitle = task.assignedAgentTitle;
    const createdText = formatDateTime(task.createdAt);
    metaElement.textContent = t("common.assignedMeta", [assignedTitle, createdText]);
    cardElement.appendChild(metaElement);

    const actionsElement = document.createElement("div");
    actionsElement.className = "card-actions";

    if (taskStatus !== "done")
    {
        const completeButtonElement = document.createElement("button");
        completeButtonElement.className = "secondary-button";
        completeButtonElement.textContent = t("tasks.complete");
        completeButtonElement.addEventListener("click", function (completeClickEvent)
        {
            completeTask(task);
        });
        actionsElement.appendChild(completeButtonElement);
    }

    const deleteButtonElement = document.createElement("button");
    deleteButtonElement.className = "danger-button";
    deleteButtonElement.textContent = t("common.delete");
    const taskId = task.id;
    deleteButtonElement.addEventListener("click", function (deleteClickEvent)
    {
        deleteTask(taskId);
    });
    actionsElement.appendChild(deleteButtonElement);

    cardElement.appendChild(actionsElement);
    return cardElement;
}

//=================================================================================================
// 현재 상태를 다시 그린다.
//=================================================================================================
async function loadAndRender()
{
    const contentElement = tasksViewState.contentElement;
    if (contentElement === null)
    {
        return;
    }
    contentElement.replaceChildren();

    const projectPath = tasksViewState.projectPath;
    if (projectPath === null)
    {
        const messageElement = document.createElement("p");
        messageElement.className = "dashboard-empty-message";
        messageElement.textContent = t("common.noProject");
        contentElement.appendChild(messageElement);
        return;
    }

    const headerElement = document.createElement("div");
    headerElement.className = "dashboard-header";
    const titleElement = document.createElement("h1");
    titleElement.className = "dashboard-title";
    titleElement.textContent = t("nav.tasks");
    headerElement.appendChild(titleElement);
    const descriptionElement = document.createElement("p");
    descriptionElement.className = "dashboard-description";
    descriptionElement.textContent = t("tasks.description");
    headerElement.appendChild(descriptionElement);
    contentElement.appendChild(headerElement);

    const vanilla = window.vanilla;
    const agents = await vanilla.listAgents();
    const formElement = createRequestForm(agents);
    contentElement.appendChild(formElement);

    const tasks = await vanilla.listTasks(projectPath);
    if (tasks.length === 0)
    {
        const emptyElement = document.createElement("p");
        emptyElement.className = "dashboard-empty-message";
        emptyElement.textContent = t("tasks.empty");
        contentElement.appendChild(emptyElement);
        return;
    }

    const listElement = document.createElement("div");
    listElement.className = "record-list";
    let taskIndex = tasks.length - 1;
    while (taskIndex >= 0)
    {
        const task = tasks[taskIndex];
        const cardElement = createTaskCard(task);
        listElement.appendChild(cardElement);
        taskIndex -= 1;
    }
    contentElement.appendChild(listElement);
}

export const tasksView =
{
    id: "tasks",
    label: "작업 목록",
    render: function (contentElement, viewContext)
    {
        tasksViewState.projectPath = viewContext.projectPath;
        tasksViewState.contentElement = contentElement;
        loadAndRender();
    }
};
