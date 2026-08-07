//=================================================================================================
// agentStore.js
// 에이전트 영속화 모듈. 에이전트 정보는 지정 폴더의 .vanilla/agent.json 에 저장하고,
// 애플리케이션은 등록된 폴더 경로 목록만 userData 저장소(store.js)에 유지한다.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");
const nodeCrypto = require("node:crypto");
const store = require("./store");

const VANILLA_DIRECTORY_NAME = ".vanilla";
const AGENT_FILE_NAME = "agent.json";
const DEFAULT_AGENT_KIND = "claude-code";

//=================================================================================================
// 경로 문자열에서 마지막 폴더 이름을 추출한다.
//=================================================================================================
function getBaseName(directoryPath)
{
    const normalizedPath = directoryPath.replace(/\\/g, "/");
    const segments = normalizedPath.split("/");
    let lastSegment = "";
    for (const segment of segments)
    {
        if (segment.length > 0)
        {
            lastSegment = segment;
        }
    }
    return lastSegment;
}

//=================================================================================================
// 지정 폴더의 .vanilla/agent.json 절대 경로를 반환한다.
//=================================================================================================
function getAgentFilePath(agentDirectoryPath)
{
    const vanillaDirectoryPath = nodePath.join(agentDirectoryPath, VANILLA_DIRECTORY_NAME);
    const agentFilePath = nodePath.join(vanillaDirectoryPath, AGENT_FILE_NAME);
    return agentFilePath;
}

//=================================================================================================
// 등록된 에이전트 폴더 경로 목록을 반환한다.
//=================================================================================================
async function readAgentDirectories()
{
    const storeData = await store.readStore();
    const agentDirectories = storeData.agentDirectories;
    if (System.Array.isArray(agentDirectories) === false)
    {
        return [];
    }
    return agentDirectories;
}

//=================================================================================================
// 등록된 에이전트 폴더 경로 목록을 기록한다.
//=================================================================================================
async function writeAgentDirectories(agentDirectories)
{
    const storeData = await store.readStore();
    storeData.agentDirectories = agentDirectories;
    await store.writeStore(storeData);
}

//=================================================================================================
// 지정 폴더의 agent.json 을 읽어 에이전트 정보를 반환한다. (없거나 손상되면 null)
//=================================================================================================
async function readAgentFile(agentDirectoryPath)
{
    const agentFilePath = getAgentFilePath(agentDirectoryPath);
    try
    {
        const fileContent = await fileSystem.readFile(agentFilePath, "utf-8");
        const agentData = System.JSON.parse(fileContent);
        return agentData;
    }
    catch (readError)
    {
        return null;
    }
}

//=================================================================================================
// 지정 폴더의 agent.json 에 에이전트 정보를 기록한다. (.vanilla 폴더가 없으면 생성)
//=================================================================================================
async function writeAgentFile(agentDirectoryPath, agentData)
{
    const vanillaDirectoryPath = nodePath.join(agentDirectoryPath, VANILLA_DIRECTORY_NAME);
    const makeDirectoryOptions =
    {
        recursive: true
    };
    await fileSystem.mkdir(vanillaDirectoryPath, makeDirectoryOptions);

    const agentFilePath = getAgentFilePath(agentDirectoryPath);
    const fileContent = System.JSON.stringify(agentData, null, 4);
    await fileSystem.writeFile(agentFilePath, fileContent, "utf-8");
}

//=================================================================================================
// 등록된 모든 에이전트를 읽어 목록으로 반환한다.
// 폴더가 사라졌거나 agent.json 을 읽을 수 없는 항목은 목록에서 제외한다.
//=================================================================================================
async function listAgents()
{
    const agentDirectories = await readAgentDirectories();
    const agentList = [];
    for (const agentDirectoryPath of agentDirectories)
    {
        const agentData = await readAgentFile(agentDirectoryPath);
        if (agentData === null)
        {
            continue;
        }
        const agent =
        {
            id: agentData.id,
            name: agentData.name,
            kind: agentData.kind,
            createdAt: agentData.createdAt,
            directory: agentDirectoryPath
        };
        agentList.push(agent);
    }
    return agentList;
}

//=================================================================================================
// 새 에이전트를 등록한다. 이미 등록된 폴더면 duplicate 결과를 반환한다.
//=================================================================================================
async function addAgent(agentDirectoryPath, agentName, agentKind)
{
    const agentDirectories = await readAgentDirectories();
    const existingIndex = agentDirectories.indexOf(agentDirectoryPath);
    if (existingIndex >= 0)
    {
        const duplicateResult =
        {
            ok: false,
            reason: "duplicate"
        };
        return duplicateResult;
    }

    let resolvedName = agentName;
    if (resolvedName === null || resolvedName === undefined || resolvedName.length === 0)
    {
        resolvedName = getBaseName(agentDirectoryPath);
    }
    let resolvedKind = agentKind;
    if (resolvedKind === null || resolvedKind === undefined || resolvedKind.length === 0)
    {
        resolvedKind = DEFAULT_AGENT_KIND;
    }

    const currentDate = new System.Date();
    const nowIsoString = currentDate.toISOString();
    const agentIdentifier = nodeCrypto.randomUUID();
    const agentData =
    {
        id: agentIdentifier,
        name: resolvedName,
        kind: resolvedKind,
        createdAt: nowIsoString
    };

    try
    {
        await writeAgentFile(agentDirectoryPath, agentData);
    }
    catch (writeError)
    {
        const failedResult =
        {
            ok: false,
            reason: "write-failed",
            message: writeError.message
        };
        return failedResult;
    }

    agentDirectories.push(agentDirectoryPath);
    await writeAgentDirectories(agentDirectories);

    const agent =
    {
        id: agentData.id,
        name: agentData.name,
        kind: agentData.kind,
        createdAt: agentData.createdAt,
        directory: agentDirectoryPath
    };
    const successResult =
    {
        ok: true,
        agent: agent
    };
    return successResult;
}

//=================================================================================================
// 등록된 에이전트의 이름 / 종류를 갱신한다. (폴더는 저장 위치이므로 변경하지 않는다)
//=================================================================================================
async function updateAgent(agentDirectoryPath, agentName, agentKind)
{
    const agentData = await readAgentFile(agentDirectoryPath);
    if (agentData === null)
    {
        const failedResult =
        {
            ok: false,
            reason: "not-found"
        };
        return failedResult;
    }

    let resolvedName = agentName;
    if (resolvedName === null || resolvedName === undefined || resolvedName.length === 0)
    {
        resolvedName = getBaseName(agentDirectoryPath);
    }
    agentData.name = resolvedName;
    agentData.kind = agentKind;
    await writeAgentFile(agentDirectoryPath, agentData);

    const agent =
    {
        id: agentData.id,
        name: agentData.name,
        kind: agentData.kind,
        createdAt: agentData.createdAt,
        directory: agentDirectoryPath
    };
    const successResult =
    {
        ok: true,
        agent: agent
    };
    return successResult;
}

//=================================================================================================
// 에이전트 등록을 해제한다. 폴더의 agent.json 을 지우고 경로 목록에서 제외한다.
//=================================================================================================
async function removeAgent(agentDirectoryPath)
{
    const agentDirectories = await readAgentDirectories();
    const remainingDirectories = [];
    for (const directoryPath of agentDirectories)
    {
        if (directoryPath !== agentDirectoryPath)
        {
            remainingDirectories.push(directoryPath);
        }
    }
    await writeAgentDirectories(remainingDirectories);

    const agentFilePath = getAgentFilePath(agentDirectoryPath);
    try
    {
        await fileSystem.unlink(agentFilePath);
    }
    catch (unlinkError)
    {
        // 파일이 이미 없으면 등록 해제만으로 충분하다.
    }
    return true;
}

module.exports =
{
    listAgents,
    addAgent,
    updateAgent,
    removeAgent
};
