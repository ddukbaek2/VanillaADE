//=================================================================================================
// preload.js
// 렌더러(브라우저 컨텍스트)에 안전하게 노출되는 IPC 브릿지 API 를 정의한다.
//=================================================================================================

const System = globalThis;
const { contextBridge, ipcRenderer, clipboard } = require("electron");
const fileSystem = require("node:fs");
const nodePath = require("node:path");

//=================================================================================================
// 테마 컬러 테이블(theme.json)을 동기적으로 읽어 렌더러에 노출한다. (첫 페인트 전에 사용 가능)
//=================================================================================================
let themeColorTable =
{
    light: {},
    dark: {}
};
try
{
    const themeFilePath = nodePath.join(__dirname, "..", "..", "theme.json");
    const themeFileContent = fileSystem.readFileSync(themeFilePath, "utf-8");
    themeColorTable = System.JSON.parse(themeFileContent);
}
catch (themeReadError)
{
    themeColorTable = { light: {}, dark: {} };
}
contextBridge.exposeInMainWorld("theme", themeColorTable);

const vanillaApi =
{
    //=========================================================================================
    // 현재 실행 중인 운영체제 플랫폼 문자열. (예: "win32", "darwin")
    //=========================================================================================
    platform: process.platform,

    //=========================================================================================
    // 폴더 선택 다이얼로그를 띄우고 선택된 경로(또는 null)를 반환한다.
    //=========================================================================================
    selectDirectory: function ()
    {
        const resultPromise = ipcRenderer.invoke("dialog:select-directory");
        return resultPromise;
    },

    //=========================================================================================
    // git 저장소를 상위 폴더 아래로 클론하고 클론된 폴더 경로를 반환한다.
    //=========================================================================================
    cloneRepository: function (repositoryUrl, parentDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("git:clone", repositoryUrl, parentDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // vanilla.js 엔진 기반 게임 프로젝트를 새로 준비한다. (템플릿 · 엔진 · 의존성)
    //=========================================================================================
    setupGameProject: function (parentDirectoryPath, projectName)
    {
        const resultPromise = ipcRenderer.invoke("game:setup", parentDirectoryPath, projectName);
        return resultPromise;
    },

    //=========================================================================================
    // 게임 설정(game.config.js)을 읽는다.
    //=========================================================================================
    readGameConfig: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("game:read-config", projectDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 게임 설정을 기록한다. 진입 스크립트가 설정을 쓰도록 연결도 함께 확인한다.
    //=========================================================================================
    writeGameConfig: function (projectDirectoryPath, configData)
    {
        const resultPromise = ipcRenderer.invoke("game:write-config", projectDirectoryPath, configData);
        return resultPromise;
    },

    //=========================================================================================
    // 배포 대상(마켓) 목록을 반환한다.
    //=========================================================================================
    listMarkets: function ()
    {
        const resultPromise = ipcRenderer.invoke("game:market-list");
        return resultPromise;
    },

    //=========================================================================================
    // 프로젝트 준비 진행 상황을 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onSetupProgress: function (callback)
    {
        const listener = function (ipcEvent, payload)
        {
            callback(payload);
        };
        ipcRenderer.on("game:setup-progress", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("game:setup-progress", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 사용할 수 있는 엔진 버전 목록을 반환한다.
    //=========================================================================================
    listEngineVersions: function ()
    {
        const resultPromise = ipcRenderer.invoke("engine:list-versions");
        return resultPromise;
    },

    //=========================================================================================
    // 프로젝트의 엔진을 지정한 버전으로 맞춘다.
    //=========================================================================================
    applyEngineVersion: function (projectDirectoryPath, versionName)
    {
        const resultPromise = ipcRenderer.invoke("engine:apply-version", projectDirectoryPath, versionName);
        return resultPromise;
    },

    //=========================================================================================
    // 프로젝트가 현재 쓰는 엔진 버전을 반환한다.
    //=========================================================================================
    getCurrentEngineVersion: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("engine:current-version", projectDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 고정 액션(웹 빌드 · 자산 점검 · 의존성 설치)을 실행한다.
    //=========================================================================================
    runAction: function (agentId, projectDirectoryPath, actionId)
    {
        const resultPromise = ipcRenderer.invoke("action:run", agentId, projectDirectoryPath, actionId);
        return resultPromise;
    },

    //=========================================================================================
    // 실행 중인 액션을 중단한다.
    //=========================================================================================
    cancelAction: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("action:cancel", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 해당 에이전트에서 액션이 실행 중인지 확인한다.
    //=========================================================================================
    isActionRunning: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("action:running", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 액션 출력 / 종료 이벤트를 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onActionEvent: function (callback)
    {
        const listener = function (ipcEvent, payload)
        {
            callback(payload);
        };
        ipcRenderer.on("action:event", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("action:event", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 등록된 에이전트 목록을 반환한다. (각 항목에 실행 여부 running 포함)
    //=========================================================================================
    listAgents: function ()
    {
        const resultPromise = ipcRenderer.invoke("agent:list");
        return resultPromise;
    },

    //=========================================================================================
    // 지정 폴더에 새 에이전트를 등록한다.
    //=========================================================================================
    addAgent: function (agentDirectoryPath, agentName, agentKind, agentMode, projectSettings)
    {
        const resultPromise = ipcRenderer.invoke("agent:add", agentDirectoryPath, agentName, agentKind, agentMode, projectSettings);
        return resultPromise;
    },

    //=========================================================================================
    // 등록된 에이전트의 이름 / 종류 / 모드 / 프로젝트 설정을 갱신한다.
    //=========================================================================================
    updateAgent: function (agentDirectoryPath, agentName, agentKind, agentMode, projectSettings)
    {
        const resultPromise = ipcRenderer.invoke("agent:update", agentDirectoryPath, agentName, agentKind, agentMode, projectSettings);
        return resultPromise;
    },

    //=========================================================================================
    // 에이전트 등록을 해제한다. (실행 중이면 종료한 뒤 제거)
    //=========================================================================================
    removeAgent: function (agentId, agentDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("agent:remove", agentId, agentDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 프로젝트 디렉토리의 .env 에서 구글 API 키를 읽는다. (없으면 빈 문자열)
    //=========================================================================================
    getGoogleApiKey: function (agentDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("agent:get-google-api-key", agentDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 프로젝트 디렉토리의 .env 에 구글 API 키를 기록한다. (빈 값이면 항목을 제거)
    //=========================================================================================
    setGoogleApiKey: function (agentDirectoryPath, apiKey)
    {
        const resultPromise = ipcRenderer.invoke("agent:set-google-api-key", agentDirectoryPath, apiKey);
        return resultPromise;
    },

    //=========================================================================================
    // 에이전트 세션을 시작한다. (라우 모드: 시작 시 프로젝트 설정을 주입)
    //=========================================================================================
    startAgent: function (agentId, agentDirectoryPath, agentKind, agentInfo)
    {
        const resultPromise = ipcRenderer.invoke("agent:start", agentId, agentDirectoryPath, agentKind, agentInfo);
        return resultPromise;
    },

    //=========================================================================================
    // 기본 모드 대화 기록을 읽는다.
    //=========================================================================================
    listChatMessages: function (agentDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("chat:list", agentDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 기본 모드 대화 기록과 대화 세션을 비운다.
    //=========================================================================================
    clearChatMessages: function (agentDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("chat:clear", agentDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 기본 모드로 메시지를 보낸다. (프로젝트 설정은 요청마다 주입된다)
    //=========================================================================================
    sendChatMessage: function (agentInfo, userMessage)
    {
        const resultPromise = ipcRenderer.invoke("chat:send", agentInfo, userMessage);
        return resultPromise;
    },

    //=========================================================================================
    // 진행 중인 기본 모드 응답을 중단한다.
    //=========================================================================================
    cancelChatMessage: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("chat:cancel", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 해당 에이전트가 응답을 처리 중인지 확인한다.
    //=========================================================================================
    isChatBusy: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("chat:busy", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 기본 모드 채팅 이벤트를 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onChatEvent: function (callback)
    {
        const listener = function (ipcEvent, payload)
        {
            callback(payload);
        };
        ipcRenderer.on("chat:event", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("chat:event", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 에이전트 세션을 종료한다.
    //=========================================================================================
    stopAgent: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("agent:stop", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 에이전트 세션이 지금까지 출력한 내용을 반환한다. (창을 새로 열 때 이전 대화 재생용)
    //=========================================================================================
    getAgentOutput: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("agent:output", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 에이전트를 별도 창으로 분리한다.
    //=========================================================================================
    detachAgent: function (agentId, agentName)
    {
        const resultPromise = ipcRenderer.invoke("agent:detach", agentId, agentName);
        return resultPromise;
    },

    //=========================================================================================
    // 분리된 에이전트 창을 닫아 메인 창으로 결합한다.
    //=========================================================================================
    attachAgent: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("agent:attach", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 현재 분리되어 있는 에이전트 아이디 목록을 반환한다.
    //=========================================================================================
    listDetachedAgents: function ()
    {
        const resultPromise = ipcRenderer.invoke("agent:list-detached");
        return resultPromise;
    },

    //=========================================================================================
    // 분리 창 목록 변경을 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onDetachedChanged: function (callback)
    {
        const listener = function (ipcEvent)
        {
            callback();
        };
        ipcRenderer.on("agent:detached-changed", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("agent:detached-changed", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 에이전트에 입력 데이터를 전달한다.
    //=========================================================================================
    writeToAgent: function (agentId, data)
    {
        ipcRenderer.send("agent:write", agentId, data);
    },

    //=========================================================================================
    // 에이전트 터미널 크기를 변경한다.
    //=========================================================================================
    resizeAgent: function (agentId, columns, rows)
    {
        ipcRenderer.send("agent:resize", agentId, columns, rows);
    },

    //=========================================================================================
    // 에이전트 출력 데이터를 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onAgentData: function (callback)
    {
        const listener = function (ipcEvent, payload)
        {
            callback(payload);
        };
        ipcRenderer.on("agent:data", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("agent:data", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 에이전트 종료 이벤트를 구독한다. 해제 함수를 반환한다.
    //=========================================================================================
    onAgentExit: function (callback)
    {
        const listener = function (ipcEvent, payload)
        {
            callback(payload);
        };
        ipcRenderer.on("agent:exit", listener);
        const unsubscribe = function ()
        {
            ipcRenderer.removeListener("agent:exit", listener);
        };
        return unsubscribe;
    },

    //=========================================================================================
    // 클립보드의 텍스트를 읽는다.
    //=========================================================================================
    readClipboardText: function ()
    {
        const clipboardText = clipboard.readText();
        return clipboardText;
    },

    //=========================================================================================
    // 클립보드에 텍스트를 기록한다.
    //=========================================================================================
    writeClipboardText: function (text)
    {
        clipboard.writeText(text);
    },

    //=========================================================================================
    // 커스텀 타이틀바(창 컨트롤 오버레이)의 색을 갱신한다. (Windows/Linux)
    //=========================================================================================
    setTitleBarOverlay: function (overlayOptions)
    {
        const resultPromise = ipcRenderer.invoke("window:set-title-bar-overlay", overlayOptions);
        return resultPromise;
    },

    //=========================================================================================
    // 현재 테마를 메인 프로세스에 알린다. (창/트레이 아이콘을 테마에 맞춰 교체)
    //=========================================================================================
    notifyTheme: function (themeName)
    {
        const resultPromise = ipcRenderer.invoke("window:theme-changed", themeName);
        return resultPromise;
    }
};

contextBridge.exposeInMainWorld("vanilla", vanillaApi);
