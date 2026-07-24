//=================================================================================================
// app.js
// 렌더러 진입점. 셸(메뉴바 / 프로젝트영역 / 컨텐트영역 / 상태바)을 구성하고 뷰 전환과
// 프로젝트 열기/생성 흐름을 관리한다.
//=================================================================================================

import { createMenubar } from "./menubar.js";
import { createProjectPanel } from "./projectPanel.js";
import { renderStatusBar } from "./statusBar.js";
import { dashboardView } from "./views/dashboard.js";
import { repositoryView } from "./views/repository.js";
import { devToolsView } from "./views/devTools.js";
import { rulesView } from "./views/rules.js";
import { tasksView } from "./views/tasks.js";
import { historyView } from "./views/history.js";
import { pipelineView } from "./views/pipeline.js";
import { agentsView } from "./views/agents.js";
import { settingsView } from "./views/settings.js";
import { createStubView } from "./views/stub.js";
import { initializeTerminalStore } from "./terminalStore.js";
import { initializeSplitter } from "./splitter.js";
import { initializeTheme } from "./themeManager.js";
import { t } from "./locale.js";

const System = globalThis;

const vanilla = window.vanilla;

const applicationState =
{
    projectPath: null,
    projectData: null,
    currentViewId: "dashboard",
    sidebarCollapsed: false
};

//=================================================================================================
// 프로젝트 영역에 나열될 뷰 목록. (위에서 아래 순서, 맨 아래는 항상 에이전트 목록)
//=================================================================================================
const projectView = createStubView("project");
const platformView = createStubView("platform");
const releaseView = createStubView("release");

const views =
[
    dashboardView,
    projectView,
    repositoryView,
    platformView,
    releaseView,
    pipelineView,
    rulesView,
    tasksView,
    historyView,
    agentsView,
    devToolsView
];

//=================================================================================================
// 각 뷰의 사이드바 아이콘(16x16 인라인 SVG, currentColor 스트로크).
//=================================================================================================
const viewIcons =
{
    dashboard: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"></rect></svg>",
    project: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"></path></svg>",
    platform: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"12 2 2 7 12 12 22 7 12 2\"></polygon><polyline points=\"2 17 12 22 22 17\"></polyline><polyline points=\"2 12 12 17 22 12\"></polyline></svg>",
    release: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"16 16 12 12 8 16\"></polyline><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"21\"></line><path d=\"M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3\"></path></svg>",
    repository: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"6\" y1=\"3\" x2=\"6\" y2=\"15\"></line><circle cx=\"18\" cy=\"6\" r=\"3\"></circle><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><path d=\"M18 9a9 9 0 0 1-9 9\"></path></svg>",
    "dev-tools": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"></path></svg>",
    pipeline: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"18\" r=\"3\"></circle><circle cx=\"6\" cy=\"6\" r=\"3\"></circle><path d=\"M6 21V9a9 9 0 0 0 9 9\"></path></svg>",
    rules: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"></path><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\" ry=\"1\"></rect></svg>",
    tasks: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"9 11 12 14 22 4\"></polyline><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"></path></svg>",
    history: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg>",
    agents: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"4 17 10 11 4 5\"></polyline><line x1=\"12\" y1=\"19\" x2=\"20\" y2=\"19\"></line></svg>"
};

for (const view of views)
{
    const viewIcon = viewIcons[view.id];
    view.icon = viewIcon;
}

// 사이드바에는 없지만 메뉴로 진입 가능한 뷰(설정)를 포함한 전체 뷰 목록.
const allViews = views.concat([settingsView]);

const applicationElement = document.getElementById("application");
const menubarElement = document.getElementById("menubar");
const projectPanelElement = document.getElementById("project-panel");
const splitterElement = document.getElementById("panel-splitter");
const contentElement = document.getElementById("content-area");
const statusBarElement = document.getElementById("status-bar");

//=================================================================================================
// 경로 문자열에서 마지막 폴더 이름을 추출한다.
//=================================================================================================
function getBaseName(pathString)
{
    const normalizedPath = pathString.replace(/\\/g, "/");
    const segments = normalizedPath.split("/");
    let lastSegment = "";
    for (const segment of segments)
    {
        if (segment.length > 0)
        {
            lastSegment = segment;
        }
    }
    return lastSegment;
}

//=================================================================================================
// 뷰 아이디로 뷰 객체를 찾는다. (없으면 null)
//=================================================================================================
function getViewById(viewId)
{
    for (const view of allViews)
    {
        if (view.id === viewId)
        {
            return view;
        }
    }
    return null;
}

//=================================================================================================
// 뷰에 전달할 컨텍스트를 생성한다.
//=================================================================================================
function createViewContext()
{
    const viewContext =
    {
        projectPath: applicationState.projectPath,
        projectData: applicationState.projectData,
        openProject: openProject,
        selectView: selectView
    };
    return viewContext;
}

//=================================================================================================
// 현재 선택된 뷰를 컨텐트 영역에 렌더링한다.
//=================================================================================================
function renderContent()
{
    const currentViewId = applicationState.currentViewId;
    const currentView = getViewById(currentViewId);
    if (currentView === null)
    {
        return;
    }
    const viewContext = createViewContext();
    currentView.render(contentElement, viewContext);
}

//=================================================================================================
// 프로젝트 패널을 렌더링한다.
//=================================================================================================
function renderProjectPanel()
{
    const activeViewId = applicationState.currentViewId;
    const headerLabel = t("nav.header");
    const isCollapsed = applicationState.sidebarCollapsed;
    createProjectPanel(projectPanelElement, headerLabel, views, activeViewId, selectView, isCollapsed, toggleSidebar, openDetachedView);
}

//=================================================================================================
// 지정한 뷰를 별도 창으로 연다.
//=================================================================================================
function openDetachedView(viewId)
{
    vanilla.openViewWindow(viewId);
}

//=================================================================================================
// 프로젝트 영역(사이드바)을 아이콘만 보기로 접거나 편다.
//=================================================================================================
function toggleSidebar()
{
    const nextCollapsed = applicationState.sidebarCollapsed === false;
    applicationState.sidebarCollapsed = nextCollapsed;
    if (nextCollapsed === true)
    {
        applicationElement.classList.add("sidebar-collapsed");
    }
    else
    {
        applicationElement.classList.remove("sidebar-collapsed");
    }
    renderProjectPanel();
}

//=================================================================================================
// 상태바를 렌더링한다.
//=================================================================================================
function renderStatus()
{
    const statusContext =
    {
        projectPath: applicationState.projectPath,
        projectData: applicationState.projectData
    };
    renderStatusBar(statusBarElement, statusContext);
}

//=================================================================================================
// 패널 / 상태바 / 컨텐트를 모두 다시 그린다.
//=================================================================================================
function renderAll()
{
    renderProjectPanel();
    renderStatus();
    renderContent();
}

//=================================================================================================
// 뷰를 전환한다.
//=================================================================================================
function selectView(viewId)
{
    applicationState.currentViewId = viewId;
    renderProjectPanel();
    renderContent();
}

//=================================================================================================
// 불러온 프로젝트를 상태에 반영하고 화면을 갱신한다.
//=================================================================================================
function applyProject(loadResult)
{
    applicationState.projectPath = loadResult.path;
    applicationState.projectData = loadResult.data;
    renderAll();
}

//=================================================================================================
// 지정한 경로의 프로젝트를 연다. (없으면 생성 여부를 묻는다)
//=================================================================================================
async function openProjectByPath(projectDirectoryPath)
{
    const loadResult = await vanilla.loadProject(projectDirectoryPath);
    if (loadResult.exists === false)
    {
        const shouldInitialize = window.confirm(t("app.confirmCreateProject"));
        if (shouldInitialize === false)
        {
            return;
        }
        const projectName = getBaseName(projectDirectoryPath);
        const initializeResult = await vanilla.initializeProject(projectDirectoryPath, projectName);
        applyProject(initializeResult);
        await vanilla.setLastProjectPath(projectDirectoryPath);
        return;
    }
    applyProject(loadResult);
    await vanilla.setLastProjectPath(projectDirectoryPath);
}

//=================================================================================================
// 폴더 선택 다이얼로그로 프로젝트를 연다.
//=================================================================================================
async function openProject()
{
    const selectedPath = await vanilla.openProjectDialog();
    if (selectedPath === null)
    {
        return;
    }
    await openProjectByPath(selectedPath);
}

//=================================================================================================
// 현재 프로젝트를 닫는다. (열린 프로젝트 없음 상태로 전환)
//=================================================================================================
async function closeProject()
{
    applicationState.projectPath = null;
    applicationState.projectData = null;
    applicationState.currentViewId = "dashboard";
    renderAll();
    await vanilla.setLastProjectPath(null);
}

//=================================================================================================
// 설정 화면을 연다.
//=================================================================================================
function openSettings()
{
    selectView("settings");
}

//=================================================================================================
// 현재 언어에 맞춘 메뉴 정의를 생성한다.
//=================================================================================================
function buildMenuDefinitions()
{
    const menuDefinitions =
    [
        {
            label: t("menu.file"),
            mnemonic: "f",
            items:
            [
                {
                    label: t("menu.openProject"),
                    accelerator: "Ctrl+O",
                    action: openProject
                },
                {
                    label: t("menu.closeProject"),
                    accelerator: "Ctrl+W",
                    action: closeProject
                },
                {
                    label: t("menu.preferences"),
                    accelerator: "Ctrl+,",
                    action: openSettings
                },
                {
                    label: t("menu.quit"),
                    accelerator: "Ctrl+Q",
                    action: function ()
                    {
                        window.close();
                    }
                }
            ]
        },
        {
            label: t("menu.edit"),
            mnemonic: "e",
            items:
            [
                {
                    label: t("menu.undo"),
                    accelerator: "Ctrl+Z",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("undo");
                    }
                },
                {
                    label: t("menu.redo"),
                    accelerator: "Ctrl+Y",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("redo");
                    }
                },
                {
                    label: t("menu.cut"),
                    accelerator: "Ctrl+X",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("cut");
                    }
                },
                {
                    label: t("menu.copy"),
                    accelerator: "Ctrl+C",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("copy");
                    }
                },
                {
                    label: t("menu.paste"),
                    accelerator: "Ctrl+V",
                    bindGlobal: false,
                    action: function ()
                    {
                        document.execCommand("paste");
                    }
                }
            ]
        },
        {
            label: t("menu.view"),
            mnemonic: "v",
            items:
            [
                {
                    label: t("menu.dashboard"),
                    accelerator: "Ctrl+1",
                    action: function ()
                    {
                        selectView("dashboard");
                    }
                }
            ]
        },
        {
            label: t("menu.help"),
            mnemonic: "h",
            items:
            [
                {
                    label: t("menu.about"),
                    action: function ()
                    {
                        const aboutBody = t("menu.aboutBody");
                        window.alert(aboutBody);
                    }
                }
            ]
        }
    ];
    return menuDefinitions;
}

//=================================================================================================
// 애플리케이션을 초기화한다.
//=================================================================================================
async function initializeApplication()
{
    initializeTheme();
    initializeTerminalStore();
    const platform = vanilla.platform;
    if (platform === "darwin")
    {
        menubarElement.classList.add("platform-darwin");
    }
    const menuDefinitions = buildMenuDefinitions();
    createMenubar(menubarElement, "Vanilla ADE", menuDefinitions);
    initializeSplitter(splitterElement, applicationElement);
    renderAll();

    const lastProjectPath = await vanilla.getLastProjectPath();
    if (lastProjectPath !== null)
    {
        const loadResult = await vanilla.loadProject(lastProjectPath);
        if (loadResult.exists === true)
        {
            applyProject(loadResult);
        }
    }
}

//=================================================================================================
// URL 해시(#view=<id>)에서 분리 창으로 열린 뷰 아이디를 읽는다. (없으면 null)
//=================================================================================================
function getDetachedViewId()
{
    const hashText = window.location.hash;
    const prefix = "#view=";
    if (hashText.indexOf(prefix) !== 0)
    {
        return null;
    }
    const viewId = hashText.substring(prefix.length);
    if (viewId.length === 0)
    {
        return null;
    }
    return viewId;
}

//=================================================================================================
// 분리(별도) 창을 초기화한다. 셸(메뉴바/사이드바/상태바) 없이 지정한 뷰만 전체 화면으로 렌더한다.
//=================================================================================================
async function initializeDetachedWindow(viewId)
{
    applicationElement.classList.add("detached-mode");
    initializeTheme();
    initializeTerminalStore();
    applicationState.currentViewId = viewId;
    const navLabelKey = "nav." + viewId;
    document.title = t(navLabelKey) + " — Vanilla ADE";

    const lastProjectPath = await vanilla.getLastProjectPath();
    if (lastProjectPath !== null)
    {
        const loadResult = await vanilla.loadProject(lastProjectPath);
        if (loadResult.exists === true)
        {
            applicationState.projectPath = loadResult.path;
            applicationState.projectData = loadResult.data;
        }
    }
    renderContent();
}

const detachedViewId = getDetachedViewId();
if (detachedViewId === null)
{
    initializeApplication();
}
else
{
    initializeDetachedWindow(detachedViewId);
}
