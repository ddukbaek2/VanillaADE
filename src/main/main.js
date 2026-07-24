//=================================================================================================
// main.js
// Electron 메인 프로세스 진입점. 메인 윈도우 생성, 시스템 트레이 상주, IPC 핸들러 등록을 담당한다.
//=================================================================================================

const System = globalThis;
const nodePath = require("node:path");
const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, shell } = require("electron");
const project = require("./project");
const store = require("./store");
const agentManager = require("./agentManager");
const repository = require("./repository");
const devTools = require("./devTools");
const collection = require("./collection");

const RULES_FILE_NAME = "rules.json";
const TASKS_FILE_NAME = "tasks.json";
const HISTORY_FILE_NAME = "history.json";
const PIPELINES_FILE_NAME = "pipelines.json";
const ACTIONS_FILE_NAME = "actions.json";

let mainWindow = null;
let tray = null;
let isQuitting = false;
const viewWindows = new System.Map();

// GPU 가속이 불필요하고, 가상화/원격 환경에서 GPU 초기화 실패로 렌더러가 죽는 것을 방지한다.
app.disableHardwareAcceleration();

// 가상화/원격 데스크톱 등 샌드박스·GPU 초기화가 불가능한 환경에서만 관련 기능을 끈다.
// 기본값(일반 데스크톱)에서는 샌드박스를 유지한다.
if (process.env.VANILLA_DISABLE_SANDBOX === "1")
{
    app.commandLine.appendSwitch("no-sandbox");
    app.commandLine.appendSwitch("disable-gpu");
    app.commandLine.appendSwitch("disable-gpu-compositing");
    app.commandLine.appendSwitch("disable-software-rasterizer");
    app.commandLine.appendSwitch("disable-dev-shm-usage");
}

//=================================================================================================
// 메인 윈도우를 생성한다.
//=================================================================================================
function createMainWindow()
{
    const preloadPath = nodePath.join(__dirname, "preload.js");
    const iconPath = nodePath.join(__dirname, "..", "..", "assets", "icon-dark.png");
    const windowOptions =
    {
        width: 1920,
        height: 1080,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: "#2a2620",
        icon: iconPath,
        show: false,
        titleBarStyle: "hidden",
        titleBarOverlay:
        {
            color: "#38332b",
            symbolColor: "#fefaf1",
            height: 36
        },
        trafficLightPosition:
        {
            x: 12,
            y: 10
        },
        webPreferences:
        {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    };
    mainWindow = new BrowserWindow(windowOptions);

    Menu.setApplicationMenu(null);

    const indexHtmlPath = nodePath.join(__dirname, "..", "renderer", "index.html");
    mainWindow.loadFile(indexHtmlPath);

    mainWindow.once("ready-to-show", function ()
    {
        mainWindow.show();
    });

    // 창을 닫아도 완전 종료가 아니라 트레이로 숨긴다.
    mainWindow.on("close", function (closeEvent)
    {
        if (isQuitting === false)
        {
            closeEvent.preventDefault();
            mainWindow.hide();
        }
    });
}

//=================================================================================================
// 메인 윈도우를 화면에 표시하고 포커스한다. (없으면 재생성)
//=================================================================================================
function showMainWindow()
{
    if (mainWindow === null)
    {
        createMainWindow();
        return;
    }
    mainWindow.show();
    mainWindow.focus();
}

//=================================================================================================
// 특정 뷰를 별도 창으로 연다. (이미 열려있으면 포커스) — 다중 모니터 배치를 위한 창 분리.
//=================================================================================================
function openViewWindow(viewId)
{
    const existingWindow = viewWindows.get(viewId);
    if (existingWindow !== undefined && existingWindow.isDestroyed() === false)
    {
        existingWindow.focus();
        return;
    }

    const preloadPath = nodePath.join(__dirname, "preload.js");
    const iconPath = nodePath.join(__dirname, "..", "..", "assets", "icon-dark.png");
    const windowOptions =
    {
        width: 1100,
        height: 820,
        minWidth: 520,
        minHeight: 420,
        backgroundColor: "#2a2620",
        icon: iconPath,
        webPreferences:
        {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    };
    const viewWindow = new BrowserWindow(windowOptions);
    viewWindow.setMenuBarVisibility(false);

    const indexHtmlPath = nodePath.join(__dirname, "..", "renderer", "index.html");
    const loadOptions =
    {
        hash: "view=" + viewId
    };
    viewWindow.loadFile(indexHtmlPath, loadOptions);

    viewWindows.set(viewId, viewWindow);
    viewWindow.on("closed", function ()
    {
        viewWindows.delete(viewId);
    });
}

//=================================================================================================
// 시스템 트레이를 생성한다.
//=================================================================================================
function createTray()
{
    const iconPath = nodePath.join(__dirname, "..", "..", "assets", "tray-dark.png");
    const trayImage = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayImage);

    const contextMenuTemplate =
    [
        {
            label: "열기",
            click: function ()
            {
                showMainWindow();
            }
        },
        {
            type: "separator"
        },
        {
            label: "종료",
            click: function ()
            {
                isQuitting = true;
                app.quit();
            }
        }
    ];
    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    tray.setContextMenu(contextMenu);

    tray.on("click", function ()
    {
        showMainWindow();
    });
}

//=================================================================================================
// IPC 핸들러들을 등록한다.
//=================================================================================================
function registerIpcHandlers()
{
    ipcMain.handle("project:open-dialog", async function ()
    {
        const dialogOptions =
        {
            title: "프로젝트 폴더 선택",
            properties: ["openDirectory"]
        };
        const dialogResult = await dialog.showOpenDialog(mainWindow, dialogOptions);
        if (dialogResult.canceled === true)
        {
            return null;
        }
        const selectedPaths = dialogResult.filePaths;
        const selectedPath = selectedPaths[0];
        return selectedPath;
    });

    ipcMain.handle("project:load", async function (ipcEvent, projectDirectoryPath)
    {
        const projectExists = await project.hasVanillaProject(projectDirectoryPath);
        if (projectExists === false)
        {
            const notFoundResult =
            {
                exists: false,
                path: projectDirectoryPath
            };
            return notFoundResult;
        }
        const projectData = await project.readProject(projectDirectoryPath);
        const loadResult =
        {
            exists: true,
            path: projectDirectoryPath,
            data: projectData
        };
        return loadResult;
    });

    ipcMain.handle("project:initialize", async function (ipcEvent, projectDirectoryPath, projectName)
    {
        const projectData = await project.initializeProject(projectDirectoryPath, projectName);
        const initializeResult =
        {
            exists: true,
            path: projectDirectoryPath,
            data: projectData
        };
        return initializeResult;
    });

    ipcMain.handle("store:get-last-project", async function ()
    {
        const storeData = await store.readStore();
        const lastProjectPath = storeData.lastProjectPath;
        if (lastProjectPath === undefined)
        {
            return null;
        }
        return lastProjectPath;
    });

    ipcMain.handle("store:set-last-project", async function (ipcEvent, projectDirectoryPath)
    {
        const storeData = await store.readStore();
        storeData.lastProjectPath = projectDirectoryPath;
        await store.writeStore(storeData);
        return true;
    });

    ipcMain.handle("agent:create", async function (ipcEvent, workingDirectory)
    {
        const agentInfo = agentManager.createAgent(workingDirectory);
        return agentInfo;
    });

    ipcMain.on("agent:write", function (ipcEvent, agentId, data)
    {
        agentManager.writeToAgent(agentId, data);
    });

    ipcMain.on("agent:resize", function (ipcEvent, agentId, columns, rows)
    {
        agentManager.resizeAgent(agentId, columns, rows);
    });

    ipcMain.handle("agent:kill", async function (ipcEvent, agentId)
    {
        agentManager.killAgent(agentId);
        return true;
    });

    ipcMain.handle("agent:list", async function ()
    {
        const agentInfoList = agentManager.listAgents();
        return agentInfoList;
    });

    ipcMain.handle("repository:info", async function (ipcEvent, projectDirectoryPath)
    {
        const repositoryInfo = await repository.getRepositoryInfo(projectDirectoryPath);
        return repositoryInfo;
    });

    ipcMain.handle("dev-tools:list", async function ()
    {
        const toolInfoList = await devTools.listTools();
        return toolInfoList;
    });

    ipcMain.handle("window:open-view", async function (ipcEvent, viewId)
    {
        openViewWindow(viewId);
        return true;
    });

    ipcMain.handle("shell:open-external", async function (ipcEvent, externalUrl)
    {
        const isHttpUrl = externalUrl.indexOf("https://") === 0 || externalUrl.indexOf("http://") === 0;
        if (isHttpUrl === false)
        {
            return false;
        }
        await shell.openExternal(externalUrl);
        return true;
    });

    ipcMain.handle("window:theme-changed", async function (ipcEvent, themeName)
    {
        let windowIconFileName = "icon-light.png";
        let trayIconFileName = "tray-light.png";
        if (themeName === "dark")
        {
            windowIconFileName = "icon-dark.png";
            trayIconFileName = "tray-dark.png";
        }

        const windowIconPath = nodePath.join(__dirname, "..", "..", "assets", windowIconFileName);
        const windowIconImage = nativeImage.createFromPath(windowIconPath);
        if (process.platform === "darwin")
        {
            if (app.dock !== undefined)
            {
                app.dock.setIcon(windowIconImage);
            }
        }
        else
        {
            const senderWindow = BrowserWindow.fromWebContents(ipcEvent.sender);
            if (senderWindow !== null)
            {
                senderWindow.setIcon(windowIconImage);
            }
        }

        if (tray !== null)
        {
            const trayIconPath = nodePath.join(__dirname, "..", "..", "assets", trayIconFileName);
            const trayIconImage = nativeImage.createFromPath(trayIconPath);
            tray.setImage(trayIconImage);
        }
        return true;
    });

    ipcMain.handle("window:set-title-bar-overlay", async function (ipcEvent, overlayOptions)
    {
        if (mainWindow === null)
        {
            return false;
        }
        if (process.platform === "darwin")
        {
            return false;
        }
        try
        {
            mainWindow.setTitleBarOverlay(overlayOptions);
            return true;
        }
        catch (overlayError)
        {
            return false;
        }
    });

    ipcMain.handle("rules:list", async function (ipcEvent, projectDirectoryPath)
    {
        const items = await collection.listItems(projectDirectoryPath, RULES_FILE_NAME);
        return items;
    });

    ipcMain.handle("rules:save", async function (ipcEvent, projectDirectoryPath, ruleItem)
    {
        const savedItem = await collection.saveItem(projectDirectoryPath, RULES_FILE_NAME, ruleItem);
        return savedItem;
    });

    ipcMain.handle("rules:delete", async function (ipcEvent, projectDirectoryPath, ruleId)
    {
        const result = await collection.deleteItem(projectDirectoryPath, RULES_FILE_NAME, ruleId);
        return result;
    });

    ipcMain.handle("tasks:list", async function (ipcEvent, projectDirectoryPath)
    {
        const items = await collection.listItems(projectDirectoryPath, TASKS_FILE_NAME);
        return items;
    });

    ipcMain.handle("tasks:save", async function (ipcEvent, projectDirectoryPath, taskItem)
    {
        const savedItem = await collection.saveItem(projectDirectoryPath, TASKS_FILE_NAME, taskItem);
        return savedItem;
    });

    ipcMain.handle("tasks:delete", async function (ipcEvent, projectDirectoryPath, taskId)
    {
        const result = await collection.deleteItem(projectDirectoryPath, TASKS_FILE_NAME, taskId);
        return result;
    });

    ipcMain.handle("history:list", async function (ipcEvent, projectDirectoryPath)
    {
        const items = await collection.listItems(projectDirectoryPath, HISTORY_FILE_NAME);
        return items;
    });

    ipcMain.handle("history:append", async function (ipcEvent, projectDirectoryPath, historyItem)
    {
        const savedItem = await collection.saveItem(projectDirectoryPath, HISTORY_FILE_NAME, historyItem);
        return savedItem;
    });

    ipcMain.handle("history:delete", async function (ipcEvent, projectDirectoryPath, historyId)
    {
        const result = await collection.deleteItem(projectDirectoryPath, HISTORY_FILE_NAME, historyId);
        return result;
    });

    ipcMain.handle("pipelines:list", async function (ipcEvent, projectDirectoryPath)
    {
        const items = await collection.listItems(projectDirectoryPath, PIPELINES_FILE_NAME);
        return items;
    });

    ipcMain.handle("pipelines:save", async function (ipcEvent, projectDirectoryPath, pipelineItem)
    {
        const savedItem = await collection.saveItem(projectDirectoryPath, PIPELINES_FILE_NAME, pipelineItem);
        return savedItem;
    });

    ipcMain.handle("pipelines:delete", async function (ipcEvent, projectDirectoryPath, pipelineId)
    {
        const result = await collection.deleteItem(projectDirectoryPath, PIPELINES_FILE_NAME, pipelineId);
        return result;
    });

    ipcMain.handle("actions:list", async function (ipcEvent, projectDirectoryPath)
    {
        const items = await collection.listItems(projectDirectoryPath, ACTIONS_FILE_NAME);
        return items;
    });

    ipcMain.handle("actions:save", async function (ipcEvent, projectDirectoryPath, actionItem)
    {
        const savedItem = await collection.saveItem(projectDirectoryPath, ACTIONS_FILE_NAME, actionItem);
        return savedItem;
    });
}

//=================================================================================================
// 에이전트 pty 출력/종료 이벤트를 렌더러로 전달하도록 리스너를 등록한다.
//=================================================================================================
function registerAgentForwarders()
{
    agentManager.setDataListener(function (agentId, data)
    {
        if (mainWindow === null)
        {
            return;
        }
        const isDestroyed = mainWindow.isDestroyed();
        if (isDestroyed === true)
        {
            return;
        }
        const payload =
        {
            id: agentId,
            data: data
        };
        mainWindow.webContents.send("agent:data", payload);
    });

    agentManager.setExitListener(function (agentId, exitInfo)
    {
        if (mainWindow === null)
        {
            return;
        }
        const isDestroyed = mainWindow.isDestroyed();
        if (isDestroyed === true)
        {
            return;
        }
        const payload =
        {
            id: agentId,
            exitCode: exitInfo.exitCode
        };
        mainWindow.webContents.send("agent:exit", payload);
    });
}

app.whenReady().then(function ()
{
    if (process.platform === "win32")
    {
        app.setAppUserModelId("com.ddukbaek2.vanilla-ade");
    }
    registerIpcHandlers();
    registerAgentForwarders();
    createMainWindow();
    createTray();

    app.on("activate", function ()
    {
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length === 0)
        {
            createMainWindow();
        }
        else
        {
            showMainWindow();
        }
    });
});

app.on("before-quit", function ()
{
    isQuitting = true;
    agentManager.killAllAgents();
});

// 창을 모두 닫아도 트레이에 상주해야 하므로 종료하지 않는다.
app.on("window-all-closed", function ()
{
    // 의도적으로 비워둔다. 완전 종료는 트레이 메뉴 또는 app.quit() 으로만 수행한다.
});
