//=================================================================================================
// envFile.js
// 프로젝트 디렉토리의 .env 파일에서 환경변수 한 줄을 읽고 쓴다.
// 기존 주석 / 빈 줄 / 다른 항목은 그대로 보존하고 해당 키가 있는 줄만 교체한다.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");

const ENV_FILE_NAME = ".env";

//=================================================================================================
// 프로젝트 디렉토리의 .env 절대 경로를 반환한다.
//=================================================================================================
function getEnvFilePath(projectDirectoryPath)
{
    const envFilePath = nodePath.join(projectDirectoryPath, ENV_FILE_NAME);
    return envFilePath;
}

//=================================================================================================
// .env 파일 내용을 읽는다. (없거나 읽을 수 없으면 빈 문자열)
//=================================================================================================
async function readEnvFileContent(projectDirectoryPath)
{
    const envFilePath = getEnvFilePath(projectDirectoryPath);
    try
    {
        const fileContent = await fileSystem.readFile(envFilePath, "utf-8");
        return fileContent;
    }
    catch (readError)
    {
        return "";
    }
}

//=================================================================================================
// 한 줄이 지정한 키의 항목인지 판별한다. (앞뒤 공백과 export 접두사를 허용)
//=================================================================================================
function isEntryLine(line, environmentKey)
{
    let trimmedLine = line.trim();
    const exportPrefix = "export ";
    if (trimmedLine.indexOf(exportPrefix) === 0)
    {
        trimmedLine = trimmedLine.substring(exportPrefix.length).trim();
    }
    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex < 0)
    {
        return false;
    }
    const lineKey = trimmedLine.substring(0, separatorIndex).trim();
    const isSameKey = lineKey === environmentKey;
    return isSameKey;
}

//=================================================================================================
// 값 문자열을 감싼 따옴표를 벗긴다.
//=================================================================================================
function stripQuotes(rawValue)
{
    const trimmedValue = rawValue.trim();
    const valueLength = trimmedValue.length;
    if (valueLength < 2)
    {
        return trimmedValue;
    }
    const firstCharacter = trimmedValue.charAt(0);
    const lastCharacter = trimmedValue.charAt(valueLength - 1);
    const isDoubleQuoted = firstCharacter === "\"" && lastCharacter === "\"";
    const isSingleQuoted = firstCharacter === "'" && lastCharacter === "'";
    if (isDoubleQuoted === true || isSingleQuoted === true)
    {
        const unquotedValue = trimmedValue.substring(1, valueLength - 1);
        return unquotedValue;
    }
    return trimmedValue;
}

//=================================================================================================
// .env 에서 지정한 키의 값을 읽는다. (없으면 빈 문자열)
//=================================================================================================
async function readValue(projectDirectoryPath, environmentKey)
{
    const fileContent = await readEnvFileContent(projectDirectoryPath);
    const lines = fileContent.split("\n");
    for (const line of lines)
    {
        const isTargetLine = isEntryLine(line, environmentKey);
        if (isTargetLine === true)
        {
            const separatorIndex = line.indexOf("=");
            const rawValue = line.substring(separatorIndex + 1);
            const value = stripQuotes(rawValue);
            return value;
        }
    }
    return "";
}

//=================================================================================================
// .env 에 지정한 키의 값을 기록한다. 값이 비어 있으면 해당 항목을 제거한다.
//=================================================================================================
async function writeValue(projectDirectoryPath, environmentKey, environmentValue)
{
    const fileContent = await readEnvFileContent(projectDirectoryPath);
    const hasValue = environmentValue.length > 0;
    const hasFileContent = fileContent.length > 0;
    if (hasValue === false && hasFileContent === false)
    {
        const skippedResult =
        {
            ok: true
        };
        return skippedResult;
    }

    const lines = fileContent.split("\n");
    const nextLines = [];
    let isReplaced = false;
    for (const line of lines)
    {
        const isTargetLine = isEntryLine(line, environmentKey);
        if (isTargetLine === false)
        {
            nextLines.push(line);
            continue;
        }
        if (hasValue === true)
        {
            nextLines.push(environmentKey + "=" + environmentValue);
            isReplaced = true;
        }
    }

    if (hasValue === true && isReplaced === false)
    {
        // 마지막 빈 줄 뒤에 붙지 않도록 끝의 빈 줄을 걷어내고 항목을 추가한다.
        while (nextLines.length > 0)
        {
            const lastLine = nextLines[nextLines.length - 1];
            if (lastLine.trim().length > 0)
            {
                break;
            }
            nextLines.pop();
        }
        nextLines.push(environmentKey + "=" + environmentValue);
    }

    let nextContent = nextLines.join("\n");
    if (nextContent.length > 0)
    {
        const lastCharacter = nextContent.charAt(nextContent.length - 1);
        if (lastCharacter !== "\n")
        {
            nextContent = nextContent + "\n";
        }
    }

    const envFilePath = getEnvFilePath(projectDirectoryPath);
    try
    {
        await fileSystem.writeFile(envFilePath, nextContent, "utf-8");
    }
    catch (writeError)
    {
        const failedResult =
        {
            ok: false,
            message: writeError.message
        };
        return failedResult;
    }

    const successResult =
    {
        ok: true
    };
    return successResult;
}

module.exports =
{
    readValue,
    writeValue
};
