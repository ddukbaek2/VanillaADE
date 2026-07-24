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
    // 프로젝트 폴더 선택 다이얼로그를 띄우고 선택된 경로(또는 null)를 반환한다.
    //=========================================================================================
    openProjectDialog: function ()
    {
        const resultPromise = ipcRenderer.invoke("project:open-dialog");
        return resultPromise;
    },

    //=========================================================================================
    // 지정한 폴더의 Vanilla 프로젝트 정보를 불러온다.
    //=========================================================================================
    loadProject: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("project:load", projectDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 지정한 폴더에 새 Vanilla 프로젝트를 생성한다.
    //=========================================================================================
    initializeProject: function (projectDirectoryPath, projectName)
    {
        const resultPromise = ipcRenderer.invoke("project:initialize", projectDirectoryPath, projectName);
        return resultPromise;
    },

    //=========================================================================================
    // 마지막으로 연 프로젝트 경로를 반환한다. (없으면 null)
    //=========================================================================================
    getLastProjectPath: function ()
    {
        const resultPromise = ipcRenderer.invoke("store:get-last-project");
        return resultPromise;
    },

    //=========================================================================================
    // 마지막으로 연 프로젝트 경로를 저장한다.
    //=========================================================================================
    setLastProjectPath: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("store:set-last-project", projectDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 새 에이전트(터미널 세션)를 생성하고 요약 정보를 반환한다.
    //=========================================================================================
    createAgent: function (workingDirectory)
    {
        const resultPromise = ipcRenderer.invoke("agent:create", workingDirectory);
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
    // 에이전트를 종료한다.
    //=========================================================================================
    killAgent: function (agentId)
    {
        const resultPromise = ipcRenderer.invoke("agent:kill", agentId);
        return resultPromise;
    },

    //=========================================================================================
    // 현재 살아있는 에이전트 요약 목록을 반환한다.
    //=========================================================================================
    listAgents: function ()
    {
        const resultPromise = ipcRenderer.invoke("agent:list");
        return resultPromise;
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
    // 프로젝트 폴더의 Git 저장소 연결 정보를 반환한다.
    //=========================================================================================
    getRepositoryInfo: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("repository:info", projectDirectoryPath);
        return resultPromise;
    },

    //=========================================================================================
    // 지원 개발 도구들의 설치 여부/버전 목록을 반환한다.
    //=========================================================================================
    listDevTools: function ()
    {
        const resultPromise = ipcRenderer.invoke("dev-tools:list");
        return resultPromise;
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
    // 특정 뷰를 별도 창으로 연다. (다중 모니터 배치용)
    //=========================================================================================
    openViewWindow: function (viewId)
    {
        const resultPromise = ipcRenderer.invoke("window:open-view", viewId);
        return resultPromise;
    },

    //=========================================================================================
    // 현재 테마를 메인 프로세스에 알린다. (창/트레이 아이콘을 테마에 맞춰 교체)
    //=========================================================================================
    notifyTheme: function (themeName)
    {
        const resultPromise = ipcRenderer.invoke("window:theme-changed", themeName);
        return resultPromise;
    },

    //=========================================================================================
    // 외부 URL 을 기본 브라우저로 연다. (개발 도구 설치 링크 등)
    //=========================================================================================
    openExternal: function (externalUrl)
    {
        const resultPromise = ipcRenderer.invoke("shell:open-external", externalUrl);
        return resultPromise;
    },

    //=========================================================================================
    // 규칙(지침) 목록 조회 / 저장 / 삭제
    //=========================================================================================
    listRules: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("rules:list", projectDirectoryPath);
        return resultPromise;
    },
    saveRule: function (projectDirectoryPath, ruleItem)
    {
        const resultPromise = ipcRenderer.invoke("rules:save", projectDirectoryPath, ruleItem);
        return resultPromise;
    },
    deleteRule: function (projectDirectoryPath, ruleId)
    {
        const resultPromise = ipcRenderer.invoke("rules:delete", projectDirectoryPath, ruleId);
        return resultPromise;
    },

    //=========================================================================================
    // 작업 목록 조회 / 저장 / 삭제
    //=========================================================================================
    listTasks: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("tasks:list", projectDirectoryPath);
        return resultPromise;
    },
    saveTask: function (projectDirectoryPath, taskItem)
    {
        const resultPromise = ipcRenderer.invoke("tasks:save", projectDirectoryPath, taskItem);
        return resultPromise;
    },
    deleteTask: function (projectDirectoryPath, taskId)
    {
        const resultPromise = ipcRenderer.invoke("tasks:delete", projectDirectoryPath, taskId);
        return resultPromise;
    },

    //=========================================================================================
    // 히스토리(에이전트 처리 기록) 조회 / 추가
    //=========================================================================================
    listHistory: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("history:list", projectDirectoryPath);
        return resultPromise;
    },
    appendHistory: function (projectDirectoryPath, historyItem)
    {
        const resultPromise = ipcRenderer.invoke("history:append", projectDirectoryPath, historyItem);
        return resultPromise;
    },
    deleteHistory: function (projectDirectoryPath, historyId)
    {
        const resultPromise = ipcRenderer.invoke("history:delete", projectDirectoryPath, historyId);
        return resultPromise;
    },

    //=========================================================================================
    // 파이프라인(노드/엣지 그래프) 목록 조회 / 저장 / 삭제
    //=========================================================================================
    listPipelines: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("pipelines:list", projectDirectoryPath);
        return resultPromise;
    },
    savePipeline: function (projectDirectoryPath, pipelineItem)
    {
        const resultPromise = ipcRenderer.invoke("pipelines:save", projectDirectoryPath, pipelineItem);
        return resultPromise;
    },
    deletePipeline: function (projectDirectoryPath, pipelineId)
    {
        const resultPromise = ipcRenderer.invoke("pipelines:delete", projectDirectoryPath, pipelineId);
        return resultPromise;
    },

    //=========================================================================================
    // 커스텀 액션 목록 조회 / 저장
    //=========================================================================================
    listActions: function (projectDirectoryPath)
    {
        const resultPromise = ipcRenderer.invoke("actions:list", projectDirectoryPath);
        return resultPromise;
    },
    saveAction: function (projectDirectoryPath, actionItem)
    {
        const resultPromise = ipcRenderer.invoke("actions:save", projectDirectoryPath, actionItem);
        return resultPromise;
    }
};

contextBridge.exposeInMainWorld("vanilla", vanillaApi);
