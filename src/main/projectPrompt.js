//=================================================================================================
// projectPrompt.js
// 에이전트의 프로젝트 설정을 에이전트 CLI 에 넘길 시스템 프롬프트 문자열로 만든다.
// 기본 모드와 라우 모드 모두 이 프롬프트를 사용해 요청에 일관된 맥락을 붙인다.
//=================================================================================================

const System = globalThis;
const buildRunner = require("./buildRunner");

//=================================================================================================
// 값이 비어 있지 않은 문자열인지 확인한다.
//=================================================================================================
function hasText(value)
{
    if (value === null || value === undefined)
    {
        return false;
    }
    const trimmedValue = value.trim();
    const isFilled = trimmedValue.length > 0;
    return isFilled;
}

//=================================================================================================
// 게임 프로젝트(vanilla.js 엔진 기반)에 적용할 규약 문단을 만든다.
// 게임 설정과, ADE 가 제공하는 고정 액션을 알려 임의의 명령 대신 이 명령만 쓰게 한다.
//=================================================================================================
function appendGameProjectSection(lines, gameConfig)
{
    const buildCommand = buildRunner.getActionCommandText("web-build");
    const checkCommand = buildRunner.getActionCommandText("asset-check");

    lines.push("");
    lines.push("[게임 프로젝트]");
    lines.push("이 프로젝트는 vanilla.js 엔진 기반의 게임입니다. 구조는 다음과 같습니다.");
    lines.push("- libs/vanilla.js : 엔진(서브모듈). 이 폴더는 직접 수정하지 않습니다.");
    lines.push("- src/main.js : 진입점. Engine 과 시작 Scene 을 구성합니다.");
    lines.push("- src/game/ : 게임 코드. 화면 스케일 · 안전영역 · 오디오 등 공통 처리가 들어 있습니다.");
    lines.push("- assets/ : sprites · audio · fonts 자산.");
    lines.push("- game.config.js : Vanilla ADE 가 관리하는 게임 설정. 직접 수정하지 않습니다.");
    lines.push("화면 구성은 Scene · Node · Component 구조를 따르고, 엔진 API 는 libs/vanilla.js 의 것만 사용합니다.");

    lines.push("");
    lines.push("[현재 게임 설정]");
    lines.push("게임 이름: " + gameConfig.gameName);
    lines.push("엔진 버전: " + gameConfig.engineVersion);
    lines.push("기준 해상도: " + gameConfig.resolutionWidth + " x " + gameConfig.resolutionHeight);
    lines.push("화면 방향: " + gameConfig.orientation);
    lines.push("배포 대상: " + gameConfig.markets.join(", "));
    lines.push("이 값들은 game.config.js 에서 읽어 쓰이므로, 코드에 해상도나 게임 이름을 직접 적지 않습니다.");

    lines.push("");
    lines.push("[빌드 · 점검]");
    lines.push("빌드와 점검은 아래 명령으로만 수행합니다. 다른 방식으로 빌드하지 않습니다.");
    lines.push("- 웹 빌드: " + buildCommand);
    lines.push("- 자산 점검: " + checkCommand);
    lines.push("코드를 고친 뒤에는 웹 빌드를 실행해 통과하는지 확인하고, 실패하면 원인을 고쳐 다시 확인합니다.");
}

//=================================================================================================
// 프로젝트 설정으로 시스템 프롬프트를 만든다. 설정이 하나도 없으면 빈 문자열을 반환한다.
// agent: { name, directory, projectSettings: { description, techStack, guidelines }, gameConfig }
//=================================================================================================
function buildSystemPrompt(agent)
{
    let projectSettings = agent.projectSettings;
    if (projectSettings === null || projectSettings === undefined)
    {
        projectSettings = {};
    }

    const description = projectSettings.description;
    const techStack = projectSettings.techStack;
    const guidelines = projectSettings.guidelines;

    const hasDescription = hasText(description);
    const hasTechStack = hasText(techStack);
    const hasGuidelines = hasText(guidelines);

    const gameConfig = agent.gameConfig;
    const hasGameConfig = gameConfig !== null && gameConfig !== undefined;
    if (hasDescription === false && hasTechStack === false && hasGuidelines === false && hasGameConfig === false)
    {
        return "";
    }

    const lines = [];
    lines.push("이 작업 공간은 Vanilla ADE 가 관리하는 프로젝트입니다.");
    lines.push("아래는 이 프로젝트에 항상 적용되는 설정입니다.");
    lines.push("");
    lines.push("프로젝트 이름: " + agent.name);

    if (hasDescription === true)
    {
        lines.push("");
        lines.push("[프로젝트 설명]");
        lines.push(description.trim());
    }
    if (hasTechStack === true)
    {
        lines.push("");
        lines.push("[기술 스택]");
        lines.push(techStack.trim());
    }
    if (hasGuidelines === true)
    {
        lines.push("");
        lines.push("[지침]");
        lines.push(guidelines.trim());
    }

    if (hasGameConfig === true)
    {
        appendGameProjectSection(lines, gameConfig);
    }

    lines.push("");
    lines.push("사용자의 요청은 짧고 생략된 부분이 많을 수 있습니다.");
    lines.push("위 설정을 기준으로 생략된 맥락을 보완해 일관되게 처리하세요.");
    lines.push("설정과 요청이 충돌하면 사용자의 요청을 우선하되, 충돌한다는 점을 알려주세요.");

    const systemPrompt = lines.join("\n");
    return systemPrompt;
}

module.exports =
{
    buildSystemPrompt
};
