//=================================================================================================
// views/dashboard.js
// 대시보드 뷰. 프로젝트 개요(히어로) + 각 메뉴를 축소·섹션화한 카드 그리드를 보여주는 인덱스 페이지.
// 카드를 누르면 해당 메뉴로 이동한다. (App Store Connect / Play Console 앱 대시보드 느낌)
//=================================================================================================

const System = globalThis;

import { t } from "../locale.js";

//=================================================================================================
// 섹션 아이콘(16x16 인라인 SVG, currentColor 스트로크).
//=================================================================================================
const SECTION_ICONS =
{
    repository: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"6\" y1=\"3\" x2=\"6\" y2=\"15\"></line><circle cx=\"18\" cy=\"6\" r=\"3\"></circle><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><path d=\"M18 9a9 9 0 0 1-9 9\"></path></svg>",
    devTools: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"></path></svg>",
    pipeline: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"18\" r=\"3\"></circle><circle cx=\"6\" cy=\"6\" r=\"3\"></circle><path d=\"M6 21V9a9 9 0 0 0 9 9\"></path></svg>",
    rules: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"></path><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\" ry=\"1\"></rect></svg>",
    tasks: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"9 11 12 14 22 4\"></polyline><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"></path></svg>",
    history: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg>",
    agents: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"4 17 10 11 4 5\"></polyline><line x1=\"12\" y1=\"19\" x2=\"20\" y2=\"19\"></line></svg>"
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
// 프로젝트가 열려있지 않을 때의 안내 화면을 렌더링한다.
//=================================================================================================
function renderEmptyState(contentElement, viewContext)
{
    const emptyElement = document.createElement("div");
    emptyElement.className = "dashboard-empty";

    const messageElement = document.createElement("p");
    messageElement.className = "dashboard-empty-message";
    messageElement.textContent = t("dashboard.emptyMessage");
    emptyElement.appendChild(messageElement);

    const openButtonElement = document.createElement("button");
    openButtonElement.className = "dashboard-open-button";
    openButtonElement.textContent = t("common.openProject");
    openButtonElement.addEventListener("click", function (openButtonClickEvent)
    {
        viewContext.openProject();
    });
    emptyElement.appendChild(openButtonElement);

    contentElement.appendChild(emptyElement);
}

//=================================================================================================
// 프로젝트 히어로(이름 · 설명 · 메타)를 만든다.
//=================================================================================================
function createHero(projectData, projectPath)
{
    const heroElement = document.createElement("div");
    heroElement.className = "dash-hero";

    const titleElement = document.createElement("h1");
    titleElement.className = "dash-hero-title";
    titleElement.textContent = projectData.name;
    heroElement.appendChild(titleElement);

    const descriptionText = projectData.description;
    if (descriptionText !== undefined && descriptionText.length > 0)
    {
        const descriptionElement = document.createElement("p");
        descriptionElement.className = "dash-hero-description";
        descriptionElement.textContent = descriptionText;
        heroElement.appendChild(descriptionElement);
    }

    const metaElement = document.createElement("div");
    metaElement.className = "dash-hero-meta";
    const updatedFormatted = formatDateTime(projectData.updatedAt);
    const versionText = t("dashboard.metaVersion") + " " + projectData.version;
    const updatedText = t("dashboard.metaUpdated") + " " + updatedFormatted;
    metaElement.textContent = versionText + "   ·   " + updatedText + "   ·   " + projectPath;
    heroElement.appendChild(metaElement);

    return heroElement;
}

//=================================================================================================
// 섹션 카드를 만든다. 클릭하면 대상 뷰로 이동한다.
// config: { viewId, title, iconKey, statText, chips, listItems, onNavigate }
//=================================================================================================
function createSectionCard(config)
{
    const cardElement = document.createElement("button");
    cardElement.className = "dash-card";

    const headerElement = document.createElement("div");
    headerElement.className = "dash-card-header";

    const iconElement = document.createElement("span");
    iconElement.className = "dash-card-icon";
    iconElement.innerHTML = SECTION_ICONS[config.iconKey];
    headerElement.appendChild(iconElement);

    const titleElement = document.createElement("span");
    titleElement.className = "dash-card-title";
    titleElement.textContent = config.title;
    headerElement.appendChild(titleElement);

    const arrowElement = document.createElement("span");
    arrowElement.className = "dash-card-arrow";
    arrowElement.textContent = "→";
    headerElement.appendChild(arrowElement);

    cardElement.appendChild(headerElement);

    const statElement = document.createElement("div");
    statElement.className = "dash-card-stat";
    statElement.textContent = config.statText;
    cardElement.appendChild(statElement);

    const chips = config.chips;
    if (chips !== undefined && chips.length > 0)
    {
        const chipsElement = document.createElement("div");
        chipsElement.className = "dash-chips";
        for (const chipText of chips)
        {
            const chipElement = document.createElement("span");
            chipElement.className = "dash-chip";
            chipElement.textContent = chipText;
            chipsElement.appendChild(chipElement);
        }
        cardElement.appendChild(chipsElement);
    }

    const listItems = config.listItems;
    if (listItems !== undefined && listItems.length > 0)
    {
        const listElement = document.createElement("div");
        listElement.className = "dash-mini-list";
        for (const listItemText of listItems)
        {
            const listItemElement = document.createElement("div");
            listItemElement.className = "dash-mini-item";
            listItemElement.textContent = listItemText;
            listElement.appendChild(listItemElement);
        }
        cardElement.appendChild(listElement);
    }

    const onNavigate = config.onNavigate;
    cardElement.addEventListener("click", function (cardClickEvent)
    {
        onNavigate();
    });

    return cardElement;
}

//=================================================================================================
// 저장소 카드 설정을 만든다.
//=================================================================================================
function buildRepositoryCard(repositoryInfo, viewContext)
{
    let statText = t("dashboard.repoNone");
    const listItems = [];
    if (repositoryInfo.isRepository === true)
    {
        if (repositoryInfo.hasRemote === true)
        {
            statText = t("dashboard.repoConnected");
        }
        else
        {
            statText = t("dashboard.repoLocal");
        }
        const branchName = repositoryInfo.branch;
        const branchLine = t("dashboard.branchLine", [branchName]);
        listItems.push(branchLine);
        const remotes = repositoryInfo.remotes;
        if (remotes.length > 0)
        {
            const firstRemote = remotes[0];
            listItems.push(firstRemote.url);
        }
    }
    const config =
    {
        viewId: "repository",
        title: t("nav.repository"),
        iconKey: "repository",
        statText: statText,
        listItems: listItems,
        onNavigate: function ()
        {
            viewContext.selectView("repository");
        }
    };
    return config;
}

//=================================================================================================
// 개발 도구 카드 설정을 만든다.
//=================================================================================================
function buildDevToolsCard(toolInfoList, viewContext)
{
    let installedCount = 0;
    const installedChips = [];
    for (const toolInfo of toolInfoList)
    {
        if (toolInfo.installed === true)
        {
            installedCount += 1;
            installedChips.push(toolInfo.name);
        }
    }
    const totalCount = toolInfoList.length;
    const statText = t("dashboard.installed", [installedCount, totalCount]);
    const config =
    {
        viewId: "dev-tools",
        title: t("nav.dev-tools"),
        iconKey: "devTools",
        statText: statText,
        chips: installedChips,
        onNavigate: function ()
        {
            viewContext.selectView("dev-tools");
        }
    };
    return config;
}

//=================================================================================================
// 파이프라인 카드 설정을 만든다.
//=================================================================================================
function buildPipelineCard(pipelines, viewContext)
{
    const statText = t("dashboard.countItems", [pipelines.length]);
    const listItems = [];
    let pipelineIndex = 0;
    while (pipelineIndex < pipelines.length && pipelineIndex < 3)
    {
        const pipeline = pipelines[pipelineIndex];
        listItems.push(pipeline.name);
        pipelineIndex += 1;
    }
    const config =
    {
        viewId: "pipeline",
        title: t("nav.pipeline"),
        iconKey: "pipeline",
        statText: statText,
        listItems: listItems,
        onNavigate: function ()
        {
            viewContext.selectView("pipeline");
        }
    };
    return config;
}

//=================================================================================================
// 규칙 목록 카드 설정을 만든다.
//=================================================================================================
function buildRulesCard(rules, viewContext)
{
    const statText = t("dashboard.countItems", [rules.length]);
    const listItems = [];
    let ruleIndex = 0;
    while (ruleIndex < rules.length && ruleIndex < 3)
    {
        const rule = rules[ruleIndex];
        listItems.push(rule.title);
        ruleIndex += 1;
    }
    const config =
    {
        viewId: "rules",
        title: t("nav.rules"),
        iconKey: "rules",
        statText: statText,
        listItems: listItems,
        onNavigate: function ()
        {
            viewContext.selectView("rules");
        }
    };
    return config;
}

//=================================================================================================
// 작업 목록 카드 설정을 만든다.
//=================================================================================================
function buildTasksCard(tasks, viewContext)
{
    let inProgressCount = 0;
    let doneCount = 0;
    for (const task of tasks)
    {
        if (task.status === "done")
        {
            doneCount += 1;
        }
        else
        {
            inProgressCount += 1;
        }
    }
    const statText = t("dashboard.tasksStat", [inProgressCount, doneCount]);
    const listItems = [];
    let taskIndex = tasks.length - 1;
    while (taskIndex >= 0 && listItems.length < 3)
    {
        const task = tasks[taskIndex];
        listItems.push(task.title);
        taskIndex -= 1;
    }
    const config =
    {
        viewId: "tasks",
        title: t("nav.tasks"),
        iconKey: "tasks",
        statText: statText,
        listItems: listItems,
        onNavigate: function ()
        {
            viewContext.selectView("tasks");
        }
    };
    return config;
}

//=================================================================================================
// 히스토리 목록 카드 설정을 만든다.
//=================================================================================================
function buildHistoryCard(historyItems, viewContext)
{
    const statText = t("dashboard.countRecords", [historyItems.length]);
    const listItems = [];
    let itemIndex = historyItems.length - 1;
    while (itemIndex >= 0 && listItems.length < 3)
    {
        const historyItem = historyItems[itemIndex];
        listItems.push(historyItem.taskTitle);
        itemIndex -= 1;
    }
    const config =
    {
        viewId: "history",
        title: t("nav.history"),
        iconKey: "history",
        statText: statText,
        listItems: listItems,
        onNavigate: function ()
        {
            viewContext.selectView("history");
        }
    };
    return config;
}

//=================================================================================================
// 에이전트 목록 카드 설정을 만든다.
//=================================================================================================
function buildAgentsCard(agents, viewContext)
{
    const statText = t("dashboard.agentsStat", [agents.length]);
    const chips = [];
    for (const agent of agents)
    {
        chips.push(agent.title);
    }
    const config =
    {
        viewId: "agents",
        title: t("nav.agents"),
        iconKey: "agents",
        statText: statText,
        chips: chips,
        onNavigate: function ()
        {
            viewContext.selectView("agents");
        }
    };
    return config;
}

//=================================================================================================
// 프로젝트 대시보드(히어로 + 섹션 카드 그리드)를 렌더링한다.
//=================================================================================================
async function renderProjectDashboard(contentElement, viewContext)
{
    const projectData = viewContext.projectData;
    const projectPath = viewContext.projectPath;

    const heroElement = createHero(projectData, projectPath);
    contentElement.appendChild(heroElement);

    const gridElement = document.createElement("div");
    gridElement.className = "dash-grid";
    contentElement.appendChild(gridElement);

    const vanilla = window.vanilla;
    const repositoryPromise = vanilla.getRepositoryInfo(projectPath);
    const devToolsPromise = vanilla.listDevTools();
    const pipelinesPromise = vanilla.listPipelines(projectPath);
    const rulesPromise = vanilla.listRules(projectPath);
    const tasksPromise = vanilla.listTasks(projectPath);
    const historyPromise = vanilla.listHistory(projectPath);
    const agentsPromise = vanilla.listAgents();

    const dashboardData = await System.Promise.all(
    [
        repositoryPromise,
        devToolsPromise,
        pipelinesPromise,
        rulesPromise,
        tasksPromise,
        historyPromise,
        agentsPromise
    ]);

    const repositoryInfo = dashboardData[0];
    const toolInfoList = dashboardData[1];
    const pipelines = dashboardData[2];
    const rules = dashboardData[3];
    const tasks = dashboardData[4];
    const historyItems = dashboardData[5];
    const agents = dashboardData[6];

    const cardConfigs =
    [
        buildRepositoryCard(repositoryInfo, viewContext),
        buildDevToolsCard(toolInfoList, viewContext),
        buildPipelineCard(pipelines, viewContext),
        buildRulesCard(rules, viewContext),
        buildTasksCard(tasks, viewContext),
        buildHistoryCard(historyItems, viewContext),
        buildAgentsCard(agents, viewContext)
    ];

    for (const cardConfig of cardConfigs)
    {
        const cardElement = createSectionCard(cardConfig);
        gridElement.appendChild(cardElement);
    }
}

export const dashboardView =
{
    id: "dashboard",
    label: "대시보드",
    render: function (contentElement, viewContext)
    {
        contentElement.replaceChildren();
        const projectPath = viewContext.projectPath;
        if (projectPath === null)
        {
            renderEmptyState(contentElement, viewContext);
        }
        else
        {
            renderProjectDashboard(contentElement, viewContext);
        }
    }
};
