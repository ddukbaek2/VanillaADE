//=================================================================================================
// projectSetup.js
// vanilla.js 엔진 기반 게임 프로젝트를 자동으로 준비한다.
// 템플릿 저장소를 서브모듈(엔진)까지 함께 받아오고, 루트 의존성을 설치한다.
//=================================================================================================

const System = globalThis;
const { spawn } = require("node:child_process");
const gitClone = require("./gitClone");

const TEMPLATE_REPOSITORY_URL = "https://github.com/ddukbaek2/playablegames-template.git";

// 엔진과 웹 빌드에 필요한 루트 의존성만 설치한다. 플랫폼(앱인토스 / 원스토어 / BFF) 의존성은
// postinstall 로 함께 받으면 오래 걸리므로, 필요할 때 npm run install:all 로 받는다.
const INSTALL_ARGUMENTS = ["install", "--ignore-scripts"];

let progressListener = null;

//=================================================================================================
// 셋업 진행 상황을 받을 리스너를 등록한다. listener: (stepName) => void
//=================================================================================================
function setProgressListener(listener)
{
    progressListener = listener;
}

//=================================================================================================
// 진행 단계를 알린다.
//=================================================================================================
function emitProgress(stepName)
{
    if (progressListener === null)
    {
        return;
    }
    progressListener(stepName);
}

//=================================================================================================
// npm 실행 명령 이름을 반환한다.
//=================================================================================================
function getNpmCommand()
{
    if (process.platform === "win32")
    {
        return "npm.cmd";
    }
    return "npm";
}

//=================================================================================================
// 프로젝트 폴더에서 npm install 을 실행한다.
//=================================================================================================
function runInstall(projectDirectoryPath)
{
    const installPromise = new System.Promise(function (resolve)
    {
        const npmCommand = getNpmCommand();
        const spawnOptions =
        {
            cwd: projectDirectoryPath,
            env: process.env
        };

        let childProcess = null;
        try
        {
            childProcess = spawn(npmCommand, INSTALL_ARGUMENTS, spawnOptions);
        }
        catch (spawnError)
        {
            const spawnFailedResult =
            {
                ok: false,
                reason: "npm-missing"
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
                reason: "npm-missing"
            };
            resolve(errorResult);
        });

        childProcess.on("close", function (exitCode)
        {
            if (exitCode === 0)
            {
                const successResult =
                {
                    ok: true
                };
                resolve(successResult);
                return;
            }
            const failedResult =
            {
                ok: false,
                reason: "install-failed",
                message: errorOutput.trim()
            };
            resolve(failedResult);
        });
    });
    return installPromise;
}

//=================================================================================================
// 게임 프로젝트를 준비한다. 템플릿을 받아 의존성까지 설치하고 프로젝트 경로를 반환한다.
//=================================================================================================
async function setupGameProject(parentDirectoryPath, projectName)
{
    emitProgress("clone");
    const cloneResult = await gitClone.cloneRepository(TEMPLATE_REPOSITORY_URL, parentDirectoryPath, projectName, true);
    if (cloneResult.ok === false)
    {
        return cloneResult;
    }

    const projectDirectoryPath = cloneResult.directory;

    emitProgress("install");
    const installResult = await runInstall(projectDirectoryPath);
    if (installResult.ok === false)
    {
        // 의존성 설치가 실패해도 프로젝트 자체는 만들어졌으므로 경로와 함께 알린다.
        installResult.directory = projectDirectoryPath;
        return installResult;
    }

    emitProgress("done");
    const successResult =
    {
        ok: true,
        directory: projectDirectoryPath
    };
    return successResult;
}

module.exports =
{
    setProgressListener,
    setupGameProject
};
