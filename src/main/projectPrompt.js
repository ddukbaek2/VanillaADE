//=================================================================================================
// projectPrompt.js
// 에이전트의 프로젝트 설정을 에이전트 CLI 에 넘길 시스템 프롬프트 문자열로 만든다.
// 기본 모드와 라우 모드 모두 이 프롬프트를 사용해 요청에 일관된 맥락을 붙인다.
//=================================================================================================

const System = globalThis;

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
// 프로젝트 설정으로 시스템 프롬프트를 만든다. 설정이 하나도 없으면 빈 문자열을 반환한다.
// agent: { name, directory, projectSettings: { description, techStack, guidelines } }
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
    if (hasDescription === false && hasTechStack === false && hasGuidelines === false)
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
