//=================================================================================================
// repository.js
// 프로젝트 폴더의 Git 저장소 연결 상태(로컬 저장소 여부, 브랜치, 원격 연결)를 조회한다.
//=================================================================================================

const System = globalThis;
const { runCommand } = require("./commandRunner");

//=================================================================================================
// `git remote -v` 출력에서 원격 목록을 파싱한다. (name/url 중복 제거)
//=================================================================================================
function parseRemotes(remoteOutput)
{
    const lines = remoteOutput.split("\n");
    const remotes = [];
    const seenKeys = new System.Set();
    for (const line of lines)
    {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0)
        {
            continue;
        }
        const parts = trimmedLine.split(/\s+/);
        if (parts.length < 2)
        {
            continue;
        }
        const remoteName = parts[0];
        const remoteUrl = parts[1];
        const seenKey = remoteName + " " + remoteUrl;
        if (seenKeys.has(seenKey) === true)
        {
            continue;
        }
        seenKeys.add(seenKey);
        const remote =
        {
            name: remoteName,
            url: remoteUrl
        };
        remotes.push(remote);
    }
    return remotes;
}

//=================================================================================================
// 프로젝트 폴더의 저장소 정보를 반환한다.
//=================================================================================================
async function getRepositoryInfo(projectDirectoryPath)
{
    const commandOptions =
    {
        cwd: projectDirectoryPath
    };

    const insideWorkTreeResult = await runCommand("git rev-parse --is-inside-work-tree", commandOptions);
    if (insideWorkTreeResult.exitCode !== 0)
    {
        const notRepositoryInfo =
        {
            isRepository: false,
            branch: "",
            remotes: [],
            hasRemote: false
        };
        return notRepositoryInfo;
    }

    const branchResult = await runCommand("git rev-parse --abbrev-ref HEAD", commandOptions);
    const branchName = branchResult.stdout.trim();

    const remoteResult = await runCommand("git remote -v", commandOptions);
    const remoteOutput = remoteResult.stdout;
    const remotes = parseRemotes(remoteOutput);
    const hasRemote = remotes.length > 0;

    const repositoryInfo =
    {
        isRepository: true,
        branch: branchName,
        remotes: remotes,
        hasRemote: hasRemote
    };
    return repositoryInfo;
}

module.exports =
{
    getRepositoryInfo
};
