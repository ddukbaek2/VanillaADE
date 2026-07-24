//=================================================================================================
// commandRunner.js
// 셸 명령을 실행하고 종료 코드/표준출력/표준오류를 반환하는 공용 헬퍼. (실패해도 reject 하지 않음)
//=================================================================================================

const System = globalThis;
const childProcess = require("node:child_process");

const DEFAULT_TIMEOUT_MILLISECONDS = 8000;

//=================================================================================================
// 명령줄 문자열을 실행하고 { exitCode, stdout, stderr } 를 반환한다.
// options 로 cwd 등을 전달할 수 있다.
//=================================================================================================
function runCommand(commandLine, options)
{
    const executionOptions =
    {
        timeout: DEFAULT_TIMEOUT_MILLISECONDS,
        windowsHide: true
    };
    if (options !== undefined && options !== null)
    {
        const providedCwd = options.cwd;
        if (providedCwd !== undefined)
        {
            executionOptions.cwd = providedCwd;
        }
    }

    const runPromise = new System.Promise(function (resolve)
    {
        childProcess.exec(commandLine, executionOptions, function (executionError, standardOutput, standardError)
        {
            let exitCode = 0;
            if (executionError !== null && executionError !== undefined)
            {
                const errorCode = executionError.code;
                if (typeof errorCode === "number")
                {
                    exitCode = errorCode;
                }
                else
                {
                    exitCode = 1;
                }
            }
            const result =
            {
                exitCode: exitCode,
                stdout: standardOutput,
                stderr: standardError
            };
            resolve(result);
        });
    });
    return runPromise;
}

module.exports =
{
    runCommand
};
