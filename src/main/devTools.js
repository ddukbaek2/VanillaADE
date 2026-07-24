//=================================================================================================
// devTools.js
// 에이전트가 사용할 CLI 개발 도구들의 설치 여부와 버전을 감지한다.
// 지원 목록에 있으나 설치되지 않은 도구도 함께 파악할 수 있도록 전체 목록을 반환한다.
//=================================================================================================

const System = globalThis;
const { runCommand } = require("./commandRunner");

//=================================================================================================
// 지원(감지 대상) 도구 목록. versionCommand 의 종료 코드 0 이면 설치된 것으로 본다.
//=================================================================================================
const SUPPORTED_TOOLS =
[
    {
        id: "git",
        name: "Git",
        description: "분산 버전 관리 시스템",
        versionCommand: "git --version",
        installUrl: "https://git-scm.com/downloads"
    },
    {
        id: "gh",
        name: "GitHub CLI",
        description: "GitHub 명령줄 도구 (gh)",
        versionCommand: "gh --version",
        installUrl: "https://cli.github.com/"
    },
    {
        id: "node",
        name: "Node.js",
        description: "자바스크립트 런타임",
        versionCommand: "node --version",
        installUrl: "https://nodejs.org/"
    },
    {
        id: "npm",
        name: "npm",
        description: "Node 패키지 매니저",
        versionCommand: "npm --version",
        installUrl: "https://docs.npmjs.com/downloading-and-installing-node-js-and-npm"
    },
    {
        id: "python",
        name: "Python",
        description: "파이썬 런타임",
        versionCommand: "python --version",
        installUrl: "https://www.python.org/downloads/"
    },
    {
        id: "claude",
        name: "Claude Code",
        description: "AI 코딩 에이전트 CLI (claude)",
        versionCommand: "claude --version",
        installUrl: "https://docs.claude.com/en/docs/claude-code/overview"
    }
];

//=================================================================================================
// 버전 명령 출력에서 첫 줄을 다듬어 버전 문자열로 사용한다.
//=================================================================================================
function extractVersion(commandOutput)
{
    const outputLines = commandOutput.split("\n");
    const firstLine = outputLines[0];
    const trimmedFirstLine = firstLine.trim();
    return trimmedFirstLine;
}

//=================================================================================================
// 도구 하나의 설치 여부/버전을 감지한다.
//=================================================================================================
async function detectTool(tool)
{
    const versionCommand = tool.versionCommand;
    const commandResult = await runCommand(versionCommand, null);
    const isInstalled = commandResult.exitCode === 0;
    let version = "";
    if (isInstalled === true)
    {
        const commandOutput = commandResult.stdout;
        version = extractVersion(commandOutput);
    }
    const toolInfo =
    {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        installed: isInstalled,
        version: version,
        installUrl: tool.installUrl
    };
    return toolInfo;
}

//=================================================================================================
// 지원 도구 전체의 감지 결과 목록을 반환한다.
//=================================================================================================
async function listTools()
{
    const detectionPromises = [];
    for (const tool of SUPPORTED_TOOLS)
    {
        const detectionPromise = detectTool(tool);
        detectionPromises.push(detectionPromise);
    }
    const toolInfoList = await System.Promise.all(detectionPromises);
    return toolInfoList;
}

module.exports =
{
    listTools
};
