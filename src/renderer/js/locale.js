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
        "menu.help": "Help(H)",
        "menu.addAgent": "Add Agent",
        "menu.preferences": "Preferences",
        "menu.quit": "Quit",
        "menu.undo": "Undo",
        "menu.redo": "Redo",
        "menu.cut": "Cut",
        "menu.copy": "Copy",
        "menu.paste": "Paste",
        "menu.about": "About Vanilla ADE",
        "menu.aboutBody": "Vanilla ADE\n\nAI-powered cross-platform application development environment",

        "nav.header": "Agents",

        "status.appName": "Vanilla ADE",
        "status.noAgent": "No agent selected",

        "settings.title": "Settings",
        "settings.description": "Vanilla ADE preferences.",
        "settings.groupGeneral": "General",
        "settings.theme": "Theme",
        "settings.themeLight": "Light",
        "settings.themeDark": "Dark",
        "settings.language": "Language",

        "common.confirm": "OK",
        "common.cancel": "Cancel",
        "common.more": "More",

        "agent.add": "Add Agent",
        "agent.addTitle": "Add Agent",
        "agent.editTitle": "Agent Settings",
        "agent.tabOpen": "New or Open",
        "agent.tabClone": "Clone",
        "agent.repositoryUrl": "Repository URL",
        "agent.repositoryUrlPlaceholder": "https://github.com/owner/repository.git",
        "agent.repositoryUrlRequired": "Enter the repository URL.",
        "agent.cloneParent": "Clone Into",
        "agent.cloneParentPlaceholder": "Select the parent folder to clone into",
        "agent.cloneParentHint": "The repository is cloned into a subfolder named after the repository.",
        "agent.cloneParentRequired": "Select the folder to clone into.",
        "agent.cloning": "Cloning the repository...",
        "agent.cloneFailed": "Clone failed. ({0})",
        "agent.cloneExists": "That folder already exists. ({0})",
        "agent.gitMissing": "The git command was not found. Install git first.",
        "agent.name": "Name",
        "agent.namePlaceholder": "Defaults to the folder name",
        "agent.directory": "Project Directory",
        "agent.directoryPlaceholder": "Select the folder the agent will work in",
        "agent.selectDirectory": "Select Folder",
        "agent.kind": "Agent Type",
        "agent.kindClaudeCode": "Claude Code",
        "agent.mode": "Mode",
        "agent.modeBasic": "Basic",
        "agent.modeRaw": "Raw",
        "agent.modeHint": "Basic talks in chat and fills in your request from the project settings. Raw is the terminal itself, with the settings injected when the session starts.",
        "agent.description": "Project Description",
        "agent.descriptionPlaceholder": "What this project is and what it aims to do",
        "agent.techStack": "Tech Stack",
        "agent.techStackPlaceholder": "Languages, frameworks, build and deploy targets",
        "agent.guidelines": "Guidelines",
        "agent.guidelinesPlaceholder": "Rules the agent should always follow",
        "agent.projectSettingsHint": "These settings are attached to every request so you don't have to repeat them.",
        "agent.googleApiKey": "Google API Key",
        "agent.googleApiKeyPlaceholder": "Enter your Google API key",
        "agent.googleApiKeyHint": "Saved as GOOGLE_API_KEY in the project directory's .env file. The .env file is excluded via .gitignore.",
        "agent.googleApiKeyFailed": "Failed to write the .env file. ({0})",
        "agent.gitignoreFailed": "Could not add .env to .gitignore. Exclude it yourself so the key is not committed.",
        "agent.listEmpty": "No agents yet.",
        "agent.listEmptyHint": "Add one with the + button below.",
        "agent.selectHint": "Select an agent on the left, or add one with the + button.",
        "agent.start": "Start",
        "agent.stop": "Stop",
        "agent.detach": "Open in New Window",
        "agent.attach": "Merge into Main Window",
        "agent.detachedMessage": "\"{0}\" is open in a separate window.",
        "agent.settings": "Agent Settings",
        "agent.remove": "Remove Agent",
        "agent.confirmRemove": "Remove agent \"{0}\"? The folder itself is kept.",
        "agent.statusRunning": "Running",
        "agent.statusStopped": "Stopped",
        "agent.directoryRequired": "Select a folder first.",
        "agent.duplicate": "That folder is already registered as an agent.",
        "agent.addFailed": "Failed to add the agent. ({0})",
        "agent.startFailed": "Failed to start the agent. Make sure the \"claude\" command is installed.",

        "chat.empty": "Ask for anything. The project settings are attached automatically.",
        "chat.inputPlaceholder": "Type a message. (Enter to send, Shift+Enter for a new line)",
        "chat.send": "Send",
        "chat.cancel": "Stop",
        "chat.clear": "Clear Conversation",
        "chat.confirmClear": "Clear this conversation? The agent will start a new conversation next time.",
        "chat.thinking": "Working...",
        "chat.usingTool": "Using {0}...",
        "chat.errorPrefix": "[Error]",
        "chat.sendFailed": "Could not send the message. The agent may still be busy.",

        "terminal.copy": "Copy",
        "terminal.paste": "Paste",
        "terminal.processExited": "[Process exited]"
    },
    ko:
    {
        "menu.file": "파일(F)",
        "menu.edit": "편집(E)",
        "menu.help": "도움말(H)",
        "menu.addAgent": "에이전트 추가",
        "menu.preferences": "환경설정",
        "menu.quit": "종료",
        "menu.undo": "실행 취소",
        "menu.redo": "다시 실행",
        "menu.cut": "잘라내기",
        "menu.copy": "복사",
        "menu.paste": "붙여넣기",
        "menu.about": "Vanilla ADE 정보",
        "menu.aboutBody": "Vanilla ADE\n\nAI 기반 크로스플랫폼 애플리케이션 개발 환경",

        "nav.header": "에이전트",

        "status.appName": "Vanilla ADE",
        "status.noAgent": "선택된 에이전트 없음",

        "settings.title": "설정",
        "settings.description": "Vanilla ADE 환경설정입니다.",
        "settings.groupGeneral": "일반",
        "settings.theme": "테마",
        "settings.themeLight": "라이트",
        "settings.themeDark": "다크",
        "settings.language": "언어",

        "common.confirm": "확인",
        "common.cancel": "취소",
        "common.more": "더보기",

        "agent.add": "에이전트 추가",
        "agent.addTitle": "에이전트 추가",
        "agent.editTitle": "에이전트 설정",
        "agent.tabOpen": "새로 만들기 · 열기",
        "agent.tabClone": "클론",
        "agent.repositoryUrl": "저장소 URL",
        "agent.repositoryUrlPlaceholder": "https://github.com/소유자/저장소.git",
        "agent.repositoryUrlRequired": "저장소 URL 을 입력하세요.",
        "agent.cloneParent": "클론 위치",
        "agent.cloneParentPlaceholder": "저장소를 받을 상위 폴더를 선택하세요",
        "agent.cloneParentHint": "선택한 폴더 아래에 저장소 이름으로 하위 폴더를 만들어 클론합니다.",
        "agent.cloneParentRequired": "클론 위치를 선택하세요.",
        "agent.cloning": "저장소를 클론하는 중입니다...",
        "agent.cloneFailed": "클론에 실패했습니다. ({0})",
        "agent.cloneExists": "대상 폴더가 이미 있습니다. ({0})",
        "agent.gitMissing": "git 명령을 찾을 수 없습니다. git 을 먼저 설치하세요.",
        "agent.name": "이름",
        "agent.namePlaceholder": "비워두면 폴더 이름을 사용합니다",
        "agent.directory": "프로젝트 디렉토리",
        "agent.directoryPlaceholder": "에이전트가 작업할 폴더를 선택하세요",
        "agent.selectDirectory": "폴더 선택",
        "agent.kind": "에이전트 종류",
        "agent.kindClaudeCode": "Claude Code",
        "agent.mode": "모드",
        "agent.modeBasic": "기본 모드",
        "agent.modeRaw": "라우 모드",
        "agent.modeHint": "기본 모드는 채팅으로 요청하면 프로젝트 설정을 붙여 전달합니다. 라우 모드는 터미널 그대로이며, 세션을 시작할 때 설정을 주입합니다.",
        "agent.description": "프로젝트 설명",
        "agent.descriptionPlaceholder": "이 프로젝트가 무엇이고 무엇을 목표로 하는지",
        "agent.techStack": "기술 스택",
        "agent.techStackPlaceholder": "언어, 프레임워크, 빌드 · 배포 대상",
        "agent.guidelines": "지침",
        "agent.guidelinesPlaceholder": "에이전트가 항상 지켜야 할 규칙",
        "agent.projectSettingsHint": "여기 적은 내용은 매 요청에 함께 전달되므로 매번 다시 설명하지 않아도 됩니다.",
        "agent.googleApiKey": "구글 API 키",
        "agent.googleApiKeyPlaceholder": "구글 API 키를 입력하세요",
        "agent.googleApiKeyHint": "프로젝트 디렉토리의 .env 파일에 GOOGLE_API_KEY 로 저장됩니다. .env 는 .gitignore 로 제외됩니다.",
        "agent.googleApiKeyFailed": ".env 파일을 기록하지 못했습니다. ({0})",
        "agent.gitignoreFailed": ".gitignore 에 .env 를 추가하지 못했습니다. 키가 커밋되지 않도록 직접 제외하세요.",
        "agent.listEmpty": "등록된 에이전트가 없습니다.",
        "agent.listEmptyHint": "아래 + 버튼으로 추가하세요.",
        "agent.selectHint": "왼쪽에서 에이전트를 선택하거나 + 버튼으로 추가하세요.",
        "agent.start": "시작",
        "agent.stop": "중지",
        "agent.detach": "창 분리",
        "agent.attach": "창 결합",
        "agent.detachedMessage": "\"{0}\" 는 별도 창에서 열려 있습니다.",
        "agent.settings": "에이전트 설정",
        "agent.remove": "에이전트 제거",
        "agent.confirmRemove": "에이전트 \"{0}\" 를 제거할까요? 폴더 자체는 그대로 남습니다.",
        "agent.statusRunning": "실행 중",
        "agent.statusStopped": "중지됨",
        "agent.directoryRequired": "폴더를 먼저 선택하세요.",
        "agent.duplicate": "이미 에이전트로 등록된 폴더입니다.",
        "agent.addFailed": "에이전트를 추가하지 못했습니다. ({0})",
        "agent.startFailed": "에이전트를 시작하지 못했습니다. \"claude\" 명령이 설치되어 있는지 확인하세요.",

        "chat.empty": "무엇이든 요청하세요. 프로젝트 설정은 자동으로 함께 전달됩니다.",
        "chat.inputPlaceholder": "메시지를 입력하세요. (Enter 전송, Shift+Enter 줄바꿈)",
        "chat.send": "전송",
        "chat.cancel": "중단",
        "chat.clear": "대화 비우기",
        "chat.confirmClear": "이 대화를 비울까요? 다음부터는 새 대화로 시작합니다.",
        "chat.thinking": "작업 중입니다...",
        "chat.usingTool": "{0} 사용 중...",
        "chat.errorPrefix": "[오류]",
        "chat.sendFailed": "메시지를 보내지 못했습니다. 이전 응답이 아직 진행 중일 수 있습니다.",

        "terminal.copy": "복사",
        "terminal.paste": "붙여넣기",
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
