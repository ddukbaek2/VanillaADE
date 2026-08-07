//=================================================================================================
// preload.js
// 렌더러(브라우저 컨텍스트)에 안전하게 노출되는 IPC 브릿지 API 를 정의한다.
//=================================================================================================

const System = globalThis;
const { contextBridge, ipcRenderer } = require("electron");
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
    addAgent: function (agentDirectoryPath, agentName, agentKind)
    {
        const resultPromise = ipcRenderer.invoke("agent:add", agentDirectoryPath, agentName, agentKind);
        return resultPromise;
    },

    //=========================================================================================
    // 등록된 에이전트의 이름 / 종류를 갱신한다.
    //=========================================================================================
    updateAgent: function (agentDirectoryPath, agentName, agentKind)
    {
        const resultPromise = ipcRenderer.invoke("agent:update", agentDirectoryPath, agentName, agentKind);
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
    // 에이전트 세션을 시작한다.
    //=========================================================================================
    startAgent: function (agentId, agentDirectoryPath, agentKind)
    {
        const resultPromise = ipcRenderer.invoke("agent:start", agentId, agentDirectoryPath, agentKind);
        return resultPromise;
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
