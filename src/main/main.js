//=================================================================================================
// main.js
// Electron 메인 프로세스 진입점. 메인 윈도우 생성, 시스템 트레이 상주, IPC 핸들러 등록을 담당한다.
//=================================================================================================

const System = globalThis;
const nodePath = require("node:path");
const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage } = require("electron");
const agentManager = require("./agentManager");
const agentStore = require("./agentStore");
const envFile = require("./envFile");
const gitClone = require("./gitClone");

const GOOGLE_API_KEY_NAME = "GOOGLE_API_KEY";

let mainWindow = null;
let tray = null;
let isQuitting = false;

// 별도 창으로 분리된 에이전트. (agentId → BrowserWindow)
const agentWindows = new System.Map();

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
// 메인 창에 분리 창 목록이 바뀌었음을 알린다.
//=================================================================================================
function notifyDetachedChanged()
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
    mainWindow.webContents.send("agent:detached-changed");
}

//=================================================================================================
// 에이전트를 별도 창으로 분리한다. (이미 분리되어 있으면 그 창을 포커스)
//=================================================================================================
function openAgentWindow(agentId, agentName)
{
    const existingWindow = agentWindows.get(agentId);
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
        title: agentName,
        webPreferences:
        {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    };
    const agentWindow = new BrowserWindow(windowOptions);
    agentWindow.setMenuBarVisibility(false);

    const indexHtmlPath = nodePath.join(__dirname, "..", "renderer", "index.html");
    const loadOptions =
    {
        hash: "agent=" + agentId
    };
    agentWindow.loadFile(indexHtmlPath, loadOptions);

    agentWindows.set(agentId, agentWindow);
    agentWindow.on("closed", function ()
    {
        agentWindows.delete(agentId);
        notifyDetachedChanged();
    });
    notifyDetachedChanged();
}

//=================================================================================================
// 분리된 에이전트 창을 닫아 메인 창으로 결합한다.
//=================================================================================================
function closeAgentWindow(agentId)
{
    const agentWindow = agentWindows.get(agentId);
    if (agentWindow === undefined)
    {
        return false;
    }
    agentWindows.delete(agentId);
    const isDestroyed = agentWindow.isDestroyed();
    if (isDestroyed === false)
    {
        agentWindow.close();
    }
    notifyDetachedChanged();
    return true;
}

//=================================================================================================
// 현재 분리되어 있는 에이전트 아이디 목록을 반환한다.
//=================================================================================================
function listDetachedAgentIds()
{
    const detachedAgentIds = [];
    for (const entry of agentWindows.entries())
    {
        const agentId = entry[0];
        const agentWindow = entry[1];
        if (agentWindow.isDestroyed() === false)
        {
            detachedAgentIds.push(agentId);
        }
    }
    return detachedAgentIds;
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
    ipcMain.handle("dialog:select-directory", async function ()
    {
        const dialogOptions =
        {
            title: "에이전트 폴더 선택",
            properties: ["openDirectory", "createDirectory"]
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

    ipcMain.handle("git:clone", async function (ipcEvent, repositoryUrl, parentDirectoryPath)
    {
        const cloneResult = await gitClone.cloneRepository(repositoryUrl, parentDirectoryPath);
        return cloneResult;
    });

    ipcMain.handle("agent:list", async function ()
    {
        const agentList = await agentStore.listAgents();
        for (const agent of agentList)
        {
            const agentId = agent.id;
            const isRunning = agentManager.isAgentRunning(agentId);
            agent.running = isRunning;
        }
        return agentList;
    });

    ipcMain.handle("agent:add", async function (ipcEvent, agentDirectoryPath, agentName, agentKind)
    {
        const addResult = await agentStore.addAgent(agentDirectoryPath, agentName, agentKind);
        if (addResult.ok === false)
        {
            return addResult;
        }
        // .env 에는 비밀 값이 들어가므로 등록과 동시에 반드시 .gitignore 로 제외한다.
        const ignoreResult = await envFile.ensureEnvIgnored(agentDirectoryPath);
        if (ignoreResult.ok === false)
        {
            addResult.gitignoreFailed = true;
        }
        return addResult;
    });

    ipcMain.handle("agent:update", async function (ipcEvent, agentDirectoryPath, agentName, agentKind)
    {
        const updateResult = await agentStore.updateAgent(agentDirectoryPath, agentName, agentKind);
        return updateResult;
    });

    ipcMain.handle("agent:remove", async function (ipcEvent, agentId, agentDirectoryPath)
    {
        closeAgentWindow(agentId);
        agentManager.stopAgent(agentId);
        const removeResult = await agentStore.removeAgent(agentDirectoryPath);
        return removeResult;
    });

    ipcMain.handle("agent:get-google-api-key", async function (ipcEvent, agentDirectoryPath)
    {
        const apiKey = await envFile.readValue(agentDirectoryPath, GOOGLE_API_KEY_NAME);
        return apiKey;
    });

    ipcMain.handle("agent:set-google-api-key", async function (ipcEvent, agentDirectoryPath, apiKey)
    {
        const ignoreResult = await envFile.ensureEnvIgnored(agentDirectoryPath);
        const writeResult = await envFile.writeValue(agentDirectoryPath, GOOGLE_API_KEY_NAME, apiKey);
        if (writeResult.ok === true && ignoreResult.ok === false)
        {
            writeResult.gitignoreFailed = true;
        }
        return writeResult;
    });

    ipcMain.handle("agent:start", async function (ipcEvent, agentId, agentDirectoryPath, agentKind)
    {
        const startResult = agentManager.startAgent(agentId, agentDirectoryPath, agentKind);
        return startResult;
    });

    ipcMain.handle("agent:stop", async function (ipcEvent, agentId)
    {
        const stopResult = agentManager.stopAgent(agentId);
        return stopResult;
    });

    ipcMain.handle("agent:output", async function (ipcEvent, agentId)
    {
        const agentOutput = agentManager.getAgentOutput(agentId);
        return agentOutput;
    });

    ipcMain.handle("agent:detach", async function (ipcEvent, agentId, agentName)
    {
        openAgentWindow(agentId, agentName);
        return true;
    });

    ipcMain.handle("agent:attach", async function (ipcEvent, agentId)
    {
        const closeResult = closeAgentWindow(agentId);
        return closeResult;
    });

    ipcMain.handle("agent:list-detached", async function ()
    {
        const detachedAgentIds = listDetachedAgentIds();
        return detachedAgentIds;
    });

    ipcMain.on("agent:write", function (ipcEvent, agentId, data)
    {
        agentManager.writeToAgent(agentId, data);
    });

    ipcMain.on("agent:resize", function (ipcEvent, agentId, columns, rows)
    {
        agentManager.resizeAgent(agentId, columns, rows);
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
}

//=================================================================================================
// 메인 창과 모든 분리 창에 에이전트 이벤트를 전달한다.
//=================================================================================================
function broadcastToWindows(channelName, payload)
{
    if (mainWindow !== null && mainWindow.isDestroyed() === false)
    {
        mainWindow.webContents.send(channelName, payload);
    }
    for (const agentWindow of agentWindows.values())
    {
        if (agentWindow.isDestroyed() === false)
        {
            agentWindow.webContents.send(channelName, payload);
        }
    }
}

//=================================================================================================
// 에이전트 pty 출력/종료 이벤트를 렌더러로 전달하도록 리스너를 등록한다.
//=================================================================================================
function registerAgentForwarders()
{
    agentManager.setDataListener(function (agentId, data)
    {
        const payload =
        {
            id: agentId,
            data: data
        };
        broadcastToWindows("agent:data", payload);
    });

    agentManager.setExitListener(function (agentId, exitInfo)
    {
        const payload =
        {
            id: agentId,
            exitCode: exitInfo.exitCode
        };
        broadcastToWindows("agent:exit", payload);
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
    agentManager.stopAllAgents();
});

// 창을 모두 닫아도 트레이에 상주해야 하므로 종료하지 않는다.
app.on("window-all-closed", function ()
{
    // 의도적으로 비워둔다. 완전 종료는 트레이 메뉴 또는 app.quit() 으로만 수행한다.
});
