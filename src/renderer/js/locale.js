//=================================================================================================
// locale.js
// 다국어(i18n) 문자열 테이블과 조회 함수. 지원 언어: 기본 영어(en), 한국어(ko).
// 모든 사용자 표시 문자열은 아래 MESSAGES 테이블(JSON)에서 t() 로 조회한다.
// t(key, substitutions) 의 substitutions 배열은 문자열 내 {0}, {1} ... 을 치환한다.
//=================================================================================================

const System = globalThis;

const LOCALE_STORAGE_KEY = "vanilla-ade-locale";
const DEFAULT_LOCALE = "en";

//=================================================================================================
// 지원 언어 목록. (기본 영어가 위, 한국어가 아래)
//=================================================================================================
export const SUPPORTED_LOCALES =
[
    {
        id: "en",
        name: "English"
    },
    {
        id: "ko",
        name: "한국어"
    }
];

//=================================================================================================
// 문자열 테이블. (키 → 언어별 문자열)
//=================================================================================================
const MESSAGES =
{
    en:
    {
        "menu.file": "File(F)",
        "menu.edit": "Edit(E)",
        "menu.view": "View(V)",
        "menu.help": "Help(H)",
        "menu.openProject": "Open Project",
        "menu.closeProject": "Close Project",
        "menu.preferences": "Preferences",
        "menu.quit": "Quit",
        "menu.undo": "Undo",
        "menu.redo": "Redo",
        "menu.cut": "Cut",
        "menu.copy": "Copy",
        "menu.paste": "Paste",
        "menu.dashboard": "Dashboard",
        "menu.about": "About Vanilla ADE",
        "menu.aboutBody": "Vanilla ADE\n\nAI-powered cross-platform application development environment",

        "nav.header": "Project",
        "nav.dashboard": "Dashboard",
        "nav.project": "Project",
        "nav.platform": "Platform",
        "nav.release": "Release",
        "nav.repository": "Repository",
        "nav.dev-tools": "Installed Dev Tools",
        "nav.pipeline": "Pipeline",
        "nav.rules": "Guidelines",
        "nav.tasks": "Tasks",
        "nav.history": "History",
        "nav.agents": "Agents",

        "status.appName": "Vanilla ADE",
        "status.noProject": "No project open",

        "settings.title": "Settings",
        "settings.description": "Vanilla ADE preferences.",
        "settings.groupGeneral": "General",
        "settings.groupDevTools": "Dev Tools",
        "settings.theme": "Theme",
        "settings.themeLight": "Light",
        "settings.themeDark": "Dark",
        "settings.language": "Language",
        "settings.autoInstall": "Auto-install required dev tools",
        "settings.autoInstallDescription": "When on, agents install missing required tools automatically instead of asking first.",

        "common.save": "Save",
        "common.delete": "Delete",
        "common.openProject": "Open Project",
        "common.noProject": "No project open. Open a project first.",
        "common.assignedMeta": "Assigned: {0}  ·  {1}",
        "common.comingSoon": "This section is coming soon.",
        "common.openInNewWindow": "Open in new window",
        "common.more": "More",

        "app.confirmCreateProject": "This folder has no Vanilla project. Create one?",

        "taskStatus.in-progress": "In Progress",
        "taskStatus.done": "Done",

        "dashboard.emptyMessage": "No project open. Open a project to get started.",
        "dashboard.metaVersion": "Version",
        "dashboard.metaUpdated": "Updated",
        "dashboard.repoConnected": "Remote connected",
        "dashboard.repoLocal": "Local repository",
        "dashboard.repoNone": "Local project",
        "dashboard.branchLine": "Branch: {0}",
        "dashboard.installed": "{0} / {1} installed",
        "dashboard.countItems": "{0}",
        "dashboard.countRecords": "{0}",
        "dashboard.tasksStat": "In progress {0} · Done {1}",
        "dashboard.agentsStat": "Running {0}",

        "repository.description": "Git repository connection status of the current project.",
        "repository.remoteConnection": "Remote",
        "repository.connectedBadge": "Connected to remote repository",
        "repository.notConnectedBadge": "No remote (local repository)",
        "repository.branch": "Branch",
        "repository.notRepo": "This is a local project (no Git repository).",
        "repository.loading": "Checking repository info...",

        "devTools.description": "Installation status of CLI tools your agents will use.",
        "devTools.installed": "Installed",
        "devTools.notInstalled": "Not installed",
        "devTools.loading": "Checking installed tools...",
        "devTools.installLink": "Install guide ↗",
        "toolDesc.git": "Distributed version control system",
        "toolDesc.gh": "GitHub command-line tool (gh)",
        "toolDesc.node": "JavaScript runtime",
        "toolDesc.npm": "Node package manager",
        "toolDesc.python": "Python runtime",
        "toolDesc.claude": "AI coding agent CLI (claude)",

        "rules.description": "Guidelines your agents follow.",
        "rules.new": "New Guideline",
        "rules.defaultTitle": "New Guideline",
        "rules.titlePlaceholder": "Guideline title",
        "rules.contentPlaceholder": "Enter the guideline. (e.g., Always write code together with tests)",
        "rules.empty": "No guidelines yet. Add one with \"New Guideline\".",

        "tasks.description": "Tasks you request to agents. Assign an agent or let it be auto-assigned.",
        "tasks.titlePlaceholder": "Task title",
        "tasks.contentPlaceholder": "Enter the task to request from the agent.",
        "tasks.autoAssign": "Auto-assign",
        "tasks.request": "Request Task",
        "tasks.complete": "Mark Done",
        "tasks.empty": "No tasks requested yet.",

        "history.description": "All records, including agent work and Vanilla ADE system events.",
        "history.empty": "No records yet.",
        "history.sourceAgent": "Agent",
        "history.sourceSystem": "Vanilla ADE",
        "history.sourceProject": "Project",
        "history.sourceApp": "App",
        "history.changedTheme": "Changed theme.",
        "history.changedLanguage": "Changed language.",
        "history.changedAutoInstall": "Changed auto-install setting.",
        "history.detail": "Details",
        "history.detailTitle": "Log Detail",
        "history.savedRule": "Saved a rule.",
        "history.addedRule": "Added a rule.",
        "history.deletedRule": "Deleted a rule.",
        "history.completedTask": "Completed a task.",
        "history.deletedTask": "Deleted a task.",
        "history.createdPipeline": "Created a pipeline.",
        "history.renamedPipeline": "Renamed a pipeline.",
        "history.deletedPipeline": "Deleted a pipeline.",
        "history.addedNode": "Added an action node.",
        "history.removedNode": "Removed a node.",
        "history.connectedNodes": "Connected nodes.",
        "history.disconnectedNodes": "Disconnected nodes.",
        "common.close": "Close",

        "pipeline.description": "Place action nodes on the flow map and connect them in order to define the execution flow.",
        "pipeline.listTitle": "Pipelines",
        "pipeline.actionsTitle": "Actions",
        "pipeline.mapTitle": "Pipeline",
        "pipeline.new": "New Pipeline",
        "pipeline.defaultName": "New Pipeline",
        "pipeline.listEmpty": "No pipelines.",
        "pipeline.canvasEmpty": "Select a pipeline on the left or create one with \"New Pipeline\".",
        "pipeline.startNode": "Start",
        "pipeline.endNode": "End",
        "pipeline.rename": "Rename",
        "pipeline.remove": "Remove",
        "pipeline.autoArrange": "Auto-arrange",

        "agents.new": "New Agent",
        "agents.empty": "No running agents. Start a terminal session with \"New Agent\".",

        "action.git-commit": "git Commit & Push",
        "action.web-build": "Web Build",
        "action.version-info": "Version Info",
        "action.deploy-web": "Web Deploy",
        "action.work-log": "Work Log",
        "action.platform-build": "Platform Build",
        "action.headless-test": "Headless Test",
        "action.device-test": "Device Test",
        "action.bump-version": "Bump Version",
        "action.store-upload": "Store Upload",

        "category.version": "Version",
        "category.build": "Build",
        "category.deploy": "Deploy",
        "category.test": "Test",
        "category.record": "Record",
        "category.custom": "Custom",
        "pipeline.newAction": "New Action",
        "pipeline.newActionPrompt": "Action name",
        "pipeline.inspector": "Inspector",
        "pipeline.inspectorEmpty": "Select a node to edit its settings.",
        "pipeline.nodeType": "Type",
        "pipeline.nodeNotes": "Notes / Settings",
        "pipeline.deleteNode": "Delete node",
        "common.confirm": "OK",
        "common.cancel": "Cancel",

        "terminal.processExited": "[Process exited]"
    },
    ko:
    {
        "menu.file": "파일(F)",
        "menu.edit": "편집(E)",
        "menu.view": "보기(V)",
        "menu.help": "도움말(H)",
        "menu.openProject": "프로젝트 열기",
        "menu.closeProject": "프로젝트 닫기",
        "menu.preferences": "환경설정",
        "menu.quit": "종료",
        "menu.undo": "실행 취소",
        "menu.redo": "다시 실행",
        "menu.cut": "잘라내기",
        "menu.copy": "복사",
        "menu.paste": "붙여넣기",
        "menu.dashboard": "대시보드",
        "menu.about": "Vanilla ADE 정보",
        "menu.aboutBody": "Vanilla ADE\n\nAI 기반 크로스플랫폼 애플리케이션 개발 환경",

        "nav.header": "Project",
        "nav.dashboard": "대시보드",
        "nav.project": "프로젝트",
        "nav.platform": "플랫폼",
        "nav.release": "출시",
        "nav.repository": "저장소",
        "nav.dev-tools": "설치된 개발 도구",
        "nav.pipeline": "파이프라인",
        "nav.rules": "지침",
        "nav.tasks": "작업",
        "nav.history": "히스토리",
        "nav.agents": "에이전트",

        "status.appName": "Vanilla ADE",
        "status.noProject": "열린 프로젝트 없음",

        "settings.title": "설정",
        "settings.description": "Vanilla ADE 환경설정입니다.",
        "settings.groupGeneral": "일반",
        "settings.groupDevTools": "개발 도구",
        "settings.theme": "테마",
        "settings.themeLight": "라이트",
        "settings.themeDark": "다크",
        "settings.language": "언어",
        "settings.autoInstall": "필요한 개발 도구 자동 설치",
        "settings.autoInstallDescription": "켜면 에이전트가 필요한 도구가 없을 때 묻지 않고 자동으로 설치합니다. 끄면 설치 여부를 먼저 확인합니다.",

        "common.save": "저장",
        "common.delete": "삭제",
        "common.openProject": "프로젝트 열기",
        "common.noProject": "열린 프로젝트가 없습니다. 프로젝트를 먼저 여세요.",
        "common.assignedMeta": "담당: {0}  ·  {1}",
        "common.comingSoon": "이 섹션은 준비 중입니다.",
        "common.openInNewWindow": "새 창으로 열기",
        "common.more": "더보기",

        "app.confirmCreateProject": "이 폴더에는 Vanilla 프로젝트가 없습니다. 새로 생성할까요?",

        "taskStatus.in-progress": "진행 중",
        "taskStatus.done": "완료",

        "dashboard.emptyMessage": "열린 프로젝트가 없습니다. 프로젝트를 열어 시작하세요.",
        "dashboard.metaVersion": "버전",
        "dashboard.metaUpdated": "수정",
        "dashboard.repoConnected": "원격 연결됨",
        "dashboard.repoLocal": "로컬 저장소",
        "dashboard.repoNone": "로컬 프로젝트",
        "dashboard.branchLine": "브랜치: {0}",
        "dashboard.installed": "{0} / {1} 설치됨",
        "dashboard.countItems": "{0} 개",
        "dashboard.countRecords": "{0} 건",
        "dashboard.tasksStat": "진행 중 {0} · 완료 {1}",
        "dashboard.agentsStat": "실행 중 {0}",

        "repository.description": "현재 프로젝트의 Git 저장소 연결 상태입니다.",
        "repository.remoteConnection": "원격 연결",
        "repository.connectedBadge": "원격 저장소에 연결됨",
        "repository.notConnectedBadge": "원격 미연결 (로컬 저장소)",
        "repository.branch": "브랜치",
        "repository.notRepo": "로컬 프로젝트입니다. (Git 미사용)",
        "repository.loading": "저장소 정보를 확인하는 중입니다...",

        "devTools.description": "에이전트가 사용할 CLI 도구들의 설치 상태입니다.",
        "devTools.installed": "설치됨",
        "devTools.notInstalled": "미설치",
        "devTools.loading": "설치된 도구를 확인하는 중입니다...",
        "devTools.installLink": "설치 안내 ↗",
        "toolDesc.git": "분산 버전 관리 시스템",
        "toolDesc.gh": "GitHub 명령줄 도구 (gh)",
        "toolDesc.node": "자바스크립트 런타임",
        "toolDesc.npm": "Node 패키지 매니저",
        "toolDesc.python": "파이썬 런타임",
        "toolDesc.claude": "AI 코딩 에이전트 CLI (claude)",

        "rules.description": "에이전트가 따를 지침입니다.",
        "rules.new": "새 지침",
        "rules.defaultTitle": "새 지침",
        "rules.titlePlaceholder": "지침 제목",
        "rules.contentPlaceholder": "지침 내용을 입력하세요. (예: 코드는 항상 테스트와 함께 작성한다)",
        "rules.empty": "아직 지침이 없습니다. \"새 지침\" 으로 지침을 추가하세요.",

        "tasks.description": "에이전트에게 요청하는 작업입니다. 담당 에이전트를 지정하거나 자동 할당됩니다.",
        "tasks.titlePlaceholder": "작업 제목",
        "tasks.contentPlaceholder": "에이전트에게 요청할 작업 내용을 입력하세요.",
        "tasks.autoAssign": "자동 할당",
        "tasks.request": "작업 요청",
        "tasks.complete": "완료 처리",
        "tasks.empty": "아직 요청한 작업이 없습니다.",

        "history.description": "에이전트 작업과 Vanilla ADE 시스템 이벤트를 포함한 모든 기록입니다.",
        "history.empty": "아직 기록이 없습니다.",
        "history.sourceAgent": "에이전트",
        "history.sourceSystem": "Vanilla ADE",
        "history.sourceProject": "프로젝트",
        "history.sourceApp": "앱",
        "history.changedTheme": "테마를 변경했습니다.",
        "history.changedLanguage": "언어를 변경했습니다.",
        "history.changedAutoInstall": "자동 설치 설정을 변경했습니다.",
        "history.detail": "자세히",
        "history.detailTitle": "로그 상세",
        "history.savedRule": "지침을 저장했습니다.",
        "history.addedRule": "지침을 추가했습니다.",
        "history.deletedRule": "지침을 삭제했습니다.",
        "history.completedTask": "작업을 완료했습니다.",
        "history.deletedTask": "작업을 삭제했습니다.",
        "history.createdPipeline": "파이프라인을 생성했습니다.",
        "history.renamedPipeline": "파이프라인 이름을 변경했습니다.",
        "history.deletedPipeline": "파이프라인을 삭제했습니다.",
        "history.addedNode": "액션 노드를 추가했습니다.",
        "history.removedNode": "노드를 삭제했습니다.",
        "history.connectedNodes": "노드를 연결했습니다.",
        "history.disconnectedNodes": "연결을 해제했습니다.",
        "common.close": "닫기",

        "pipeline.description": "액션 노드를 플로우 맵에 배치하고 순서대로 연결해 실행 흐름을 정의합니다.",
        "pipeline.listTitle": "파이프라인 목록",
        "pipeline.actionsTitle": "액션 목록",
        "pipeline.mapTitle": "파이프라인",
        "pipeline.new": "새 파이프라인",
        "pipeline.defaultName": "새 파이프라인",
        "pipeline.listEmpty": "파이프라인이 없습니다.",
        "pipeline.canvasEmpty": "왼쪽에서 파이프라인을 선택하거나 \"새 파이프라인\" 을 만드세요.",
        "pipeline.startNode": "시작",
        "pipeline.endNode": "종료",
        "pipeline.rename": "이름 바꾸기",
        "pipeline.remove": "제거",
        "pipeline.autoArrange": "예쁘게 배치",

        "agents.new": "새 에이전트",
        "agents.empty": "실행 중인 에이전트가 없습니다. \"새 에이전트\" 로 터미널 세션을 시작하세요.",

        "action.git-commit": "git 커밋·푸시",
        "action.web-build": "웹 빌드",
        "action.version-info": "버전 정보 생성",
        "action.deploy-web": "웹 배포",
        "action.work-log": "작업 로그",
        "action.platform-build": "플랫폼 빌드",
        "action.headless-test": "헤드리스 테스트",
        "action.device-test": "실기기 테스트",
        "action.bump-version": "버전 올리기",
        "action.store-upload": "스토어 업로드",

        "category.version": "버전관리",
        "category.build": "빌드",
        "category.deploy": "배포",
        "category.test": "테스트",
        "category.record": "기록",
        "category.custom": "사용자",
        "pipeline.newAction": "새 액션 추가",
        "pipeline.newActionPrompt": "액션 이름",
        "pipeline.inspector": "인스펙터",
        "pipeline.inspectorEmpty": "노드를 선택하면 세부설정을 편집할 수 있습니다.",
        "pipeline.nodeType": "종류",
        "pipeline.nodeNotes": "메모 / 설정",
        "pipeline.deleteNode": "노드 삭제",
        "common.confirm": "확인",
        "common.cancel": "취소",

        "terminal.processExited": "[프로세스가 종료되었습니다]"
    }
};

//=================================================================================================
// 현재 선택된 언어 아이디를 반환한다. (기본 en)
//=================================================================================================
export function getLocale()
{
    const localStorage = window.localStorage;
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale === "ko" || storedLocale === "en")
    {
        return storedLocale;
    }
    return DEFAULT_LOCALE;
}

//=================================================================================================
// 언어를 저장한다.
//=================================================================================================
export function setLocale(localeId)
{
    const localStorage = window.localStorage;
    localStorage.setItem(LOCALE_STORAGE_KEY, localeId);
}

//=================================================================================================
// 키에 해당하는 현재 언어 문자열을 반환한다. substitutions 배열이 있으면 {0},{1}... 을 치환한다.
//=================================================================================================
export function t(messageKey, substitutions)
{
    const localeId = getLocale();
    let table = MESSAGES[localeId];
    if (table === undefined)
    {
        table = MESSAGES[DEFAULT_LOCALE];
    }
    let message = table[messageKey];
    if (message === undefined)
    {
        return messageKey;
    }
    if (substitutions !== undefined)
    {
        for (let index = 0; index < substitutions.length; index++)
        {
            const token = "{" + index + "}";
            const value = substitutions[index];
            message = message.split(token).join(value);
        }
    }
    return message;
}
