//=================================================================================================
// gitClone.js
// git 저장소를 지정한 상위 폴더 아래로 클론한다. 클론된 폴더 경로를 결과로 돌려준다.
//=================================================================================================

const System = globalThis;
const { spawn } = require("node:child_process");
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");

//=================================================================================================
// 저장소 URL 에서 클론될 폴더 이름을 추출한다. (예: https://host/owner/repo.git → repo)
//=================================================================================================
function getRepositoryName(repositoryUrl)
{
    let trimmedUrl = repositoryUrl.trim();
    while (trimmedUrl.length > 0 && trimmedUrl.charAt(trimmedUrl.length - 1) === "/")
    {
        trimmedUrl = trimmedUrl.substring(0, trimmedUrl.length - 1);
    }

    const normalizedUrl = trimmedUrl.replace(/\\/g, "/");
    const segments = normalizedUrl.split("/");
    let lastSegment = "";
    for (const segment of segments)
    {
        if (segment.length > 0)
        {
            lastSegment = segment;
        }
    }

    // scp 형식(git@host:owner/repo.git)의 마지막 세그먼트에 남는 host: 부분을 걷어낸다.
    const colonIndex = lastSegment.lastIndexOf(":");
    if (colonIndex >= 0)
    {
        lastSegment = lastSegment.substring(colonIndex + 1);
    }

    const gitSuffix = ".git";
    const suffixIndex = lastSegment.length - gitSuffix.length;
    if (suffixIndex > 0 && lastSegment.substring(suffixIndex) === gitSuffix)
    {
        lastSegment = lastSegment.substring(0, suffixIndex);
    }
    return lastSegment;
}

//=================================================================================================
// 해당 경로가 이미 존재하는지 확인한다.
//=================================================================================================
async function pathExists(targetPath)
{
    try
    {
        await fileSystem.access(targetPath);
        return true;
    }
    catch (accessError)
    {
        return false;
    }
}

//=================================================================================================
// git clone 을 실행한다. 성공하면 클론된 폴더 경로를 반환한다.
//=================================================================================================
function runGitClone(repositoryUrl, targetDirectoryPath, includeSubmodules)
{
    const clonePromise = new System.Promise(function (resolve)
    {
        const commandArguments = ["clone"];
        if (includeSubmodules === true)
        {
            commandArguments.push("--recurse-submodules");
        }
        commandArguments.push(repositoryUrl);
        commandArguments.push(targetDirectoryPath);
        let childProcess = null;
        try
        {
            childProcess = spawn("git", commandArguments);
        }
        catch (spawnError)
        {
            const spawnFailedResult =
            {
                ok: false,
                reason: "git-missing"
            };
            resolve(spawnFailedResult);
            return;
        }

        let errorOutput = "";
        childProcess.stderr.on("data", function (chunk)
        {
            errorOutput = errorOutput + chunk.toString();
        });

        childProcess.on("error", function (processError)
        {
            const errorResult =
            {
                ok: false,
                reason: "git-missing"
            };
            resolve(errorResult);
        });

        childProcess.on("close", function (exitCode)
        {
            if (exitCode === 0)
            {
                const successResult =
                {
                    ok: true,
                    directory: targetDirectoryPath
                };
                resolve(successResult);
                return;
            }
            const failedResult =
            {
                ok: false,
                reason: "clone-failed",
                message: errorOutput.trim()
            };
            resolve(failedResult);
        });
    });
    return clonePromise;
}

//=================================================================================================
// 저장소를 상위 폴더 아래로 클론한다. 대상 폴더가 이미 있으면 클론하지 않는다.
// directoryName 을 주면 그 이름으로, 없으면 저장소 이름으로 폴더를 만든다.
//=================================================================================================
async function cloneRepository(repositoryUrl, parentDirectoryPath, directoryName, includeSubmodules)
{
    let repositoryName = directoryName;
    const hasDirectoryName = repositoryName !== null && repositoryName !== undefined && repositoryName.length > 0;
    if (hasDirectoryName === false)
    {
        repositoryName = getRepositoryName(repositoryUrl);
    }
    if (repositoryName.length === 0)
    {
        const invalidUrlResult =
        {
            ok: false,
            reason: "invalid-url"
        };
        return invalidUrlResult;
    }

    const targetDirectoryPath = nodePath.join(parentDirectoryPath, repositoryName);
    const isExisting = await pathExists(targetDirectoryPath);
    if (isExisting === true)
    {
        const existsResult =
        {
            ok: false,
            reason: "exists",
            directory: targetDirectoryPath
        };
        return existsResult;
    }

    const cloneResult = await runGitClone(repositoryUrl, targetDirectoryPath, includeSubmodules);
    return cloneResult;
}

module.exports =
{
    cloneRepository
};
