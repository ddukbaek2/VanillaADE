//=================================================================================================
// engineVersion.js
// 엔진(libs/vanilla.js 서브모듈)의 사용 가능한 버전을 조회하고, 지정한 버전으로 맞춘다.
//=================================================================================================

const System = globalThis;
const { spawn } = require("node:child_process");
const nodePath = require("node:path");

const ENGINE_REPOSITORY_URL = "https://github.com/ddukbaek2/vanilla.js.git";
const ENGINE_SUBMODULE_PATH = ["libs", "vanilla.js"];

//=================================================================================================
// git 명령을 실행하고 표준 출력을 돌려준다.
//=================================================================================================
function runGit(commandArguments, workingDirectory)
{
    const gitPromise = new System.Promise(function (resolve)
    {
        const spawnOptions =
        {
            env: process.env
        };
        if (workingDirectory !== null && workingDirectory !== undefined)
        {
            spawnOptions.cwd = workingDirectory;
        }

        let childProcess = null;
        try
        {
            childProcess = spawn("git", commandArguments, spawnOptions);
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

        let standardOutput = "";
        let errorOutput = "";
        childProcess.stdout.on("data", function (chunk)
        {
            standardOutput = standardOutput + chunk.toString();
        });
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
                    output: standardOutput
                };
                resolve(successResult);
                return;
            }
            const failedResult =
            {
                ok: false,
                reason: "git-failed",
                message: errorOutput.trim()
            };
            resolve(failedResult);
        });
    });
    return gitPromise;
}

//=================================================================================================
// 엔진 저장소에서 사용할 수 있는 버전(태그 · 브랜치) 목록을 가져온다.
//=================================================================================================
async function listVersions()
{
    const commandArguments = ["ls-remote", "--tags", "--heads", ENGINE_REPOSITORY_URL];
    const gitResult = await runGit(commandArguments, null);
    if (gitResult.ok === false)
    {
        return gitResult;
    }

    const branchNames = [];
    const tagNames = [];
    const lines = gitResult.output.split("\n");
    for (const line of lines)
    {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0)
        {
            continue;
        }
        // 주석 달린 태그의 역참조(^{})는 중복이므로 제외한다.
        const isDereferenced = trimmedLine.indexOf("^{}") >= 0;
        if (isDereferenced === true)
        {
            continue;
        }

        const headsPrefix = "refs/heads/";
        const headsIndex = trimmedLine.indexOf(headsPrefix);
        if (headsIndex >= 0)
        {
            const branchName = trimmedLine.substring(headsIndex + headsPrefix.length);
            branchNames.push(branchName);
            continue;
        }

        const tagsPrefix = "refs/tags/";
        const tagsIndex = trimmedLine.indexOf(tagsPrefix);
        if (tagsIndex >= 0)
        {
            const tagName = trimmedLine.substring(tagsIndex + tagsPrefix.length);
            tagNames.push(tagName);
        }
    }

    tagNames.reverse();
    const versionNames = branchNames.concat(tagNames);
    const successResult =
    {
        ok: true,
        versions: versionNames
    };
    return successResult;
}

//=================================================================================================
// 프로젝트의 엔진 서브모듈을 지정한 버전으로 맞춘다.
//=================================================================================================
async function applyVersion(projectDirectoryPath, versionName)
{
    const enginePath = nodePath.join(projectDirectoryPath, ENGINE_SUBMODULE_PATH[0], ENGINE_SUBMODULE_PATH[1]);

    const fetchResult = await runGit(["fetch", "--tags", "origin"], enginePath);
    if (fetchResult.ok === false)
    {
        return fetchResult;
    }

    const checkoutResult = await runGit(["checkout", versionName], enginePath);
    if (checkoutResult.ok === false)
    {
        return checkoutResult;
    }

    const successResult =
    {
        ok: true,
        version: versionName
    };
    return successResult;
}

//=================================================================================================
// 프로젝트가 현재 사용 중인 엔진 버전을 알아낸다. (태그가 없으면 커밋 요약)
//=================================================================================================
async function getCurrentVersion(projectDirectoryPath)
{
    const enginePath = nodePath.join(projectDirectoryPath, ENGINE_SUBMODULE_PATH[0], ENGINE_SUBMODULE_PATH[1]);

    const describeResult = await runGit(["describe", "--tags", "--always"], enginePath);
    if (describeResult.ok === false)
    {
        return "";
    }
    const currentVersion = describeResult.output.trim();
    return currentVersion;
}

module.exports =
{
    listVersions,
    applyVersion,
    getCurrentVersion
};
