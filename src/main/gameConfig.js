//=================================================================================================
// gameConfig.js
// 게임 프로젝트의 설정 파일(game.config.js)을 읽고 쓴다.
// Vanilla ADE 의 설정 화면에서 바꾼 값이 이 파일을 통해 곧바로 게임에 반영된다.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");

const CONFIG_FILE_NAME = "game.config.js";
const MAIN_SCRIPT_PATH = ["src", "main.js"];

const DEFAULT_RESOLUTION_WIDTH = 800;
const DEFAULT_RESOLUTION_HEIGHT = 1280;
const DEFAULT_ENGINE_VERSION = "release";
const DEFAULT_ORIENTATION = "portrait";
const DEFAULT_MARKET = "web-deploy";

//=================================================================================================
// 빌드 산출물 종류. 마켓을 고르면 여기서 필요한 플랫폼이 정해진다.
//=================================================================================================
const PLATFORMS =
[
    "web",
    "android",
    "ios",
    "windows",
    "mac",
    "linux"
];

//=================================================================================================
// 배포처(마켓)와 각 마켓이 필요로 하는 플랫폼.
// 현재 실제 빌드가 연결된 마켓은 web-deploy 뿐이며, 나머지는 목록으로만 둔다.
//=================================================================================================
const MARKETS =
[
    {
        id: "web-deploy",
        platforms: ["web"],
        supported: true
    },
    {
        id: "playstore",
        platforms: ["android"],
        supported: false
    },
    {
        id: "onestore",
        platforms: ["android"],
        supported: false
    },
    {
        id: "appstore",
        platforms: ["ios"],
        supported: false
    },
    {
        id: "appintoss",
        platforms: ["web"],
        supported: false
    },
    {
        id: "steam",
        platforms: ["windows", "mac", "linux"],
        supported: false
    }
];

//=================================================================================================
// 화면 방향.
//=================================================================================================
const ORIENTATIONS =
[
    "portrait",
    "landscape",
    "any"
];

//=================================================================================================
// 설정 파일의 절대 경로를 반환한다.
//=================================================================================================
function getConfigFilePath(projectDirectoryPath)
{
    const configFilePath = nodePath.join(projectDirectoryPath, CONFIG_FILE_NAME);
    return configFilePath;
}

//=================================================================================================
// 선택한 마켓들이 필요로 하는 플랫폼 목록을 계산한다.
//=================================================================================================
function resolvePlatforms(marketIds)
{
    const platformIds = [];
    for (const marketId of marketIds)
    {
        for (const marketDefinition of MARKETS)
        {
            if (marketDefinition.id !== marketId)
            {
                continue;
            }
            for (const platformId of marketDefinition.platforms)
            {
                const existingIndex = platformIds.indexOf(platformId);
                if (existingIndex < 0)
                {
                    platformIds.push(platformId);
                }
            }
        }
    }
    return platformIds;
}

//=================================================================================================
// 설정 값을 형식에 맞게 정리한다. 빠진 항목은 기본값으로 채운다.
//=================================================================================================
function normalizeConfig(sourceConfig, projectDirectoryPath)
{
    let inputConfig = sourceConfig;
    if (inputConfig === null || inputConfig === undefined)
    {
        inputConfig = {};
    }

    let gameName = inputConfig.gameName;
    if (gameName === null || gameName === undefined || gameName.length === 0)
    {
        gameName = nodePath.basename(projectDirectoryPath);
    }

    let engineVersion = inputConfig.engineVersion;
    if (engineVersion === null || engineVersion === undefined || engineVersion.length === 0)
    {
        engineVersion = DEFAULT_ENGINE_VERSION;
    }

    let resolutionWidth = System.Number(inputConfig.resolutionWidth);
    if (System.Number.isFinite(resolutionWidth) === false || resolutionWidth <= 0)
    {
        resolutionWidth = DEFAULT_RESOLUTION_WIDTH;
    }
    let resolutionHeight = System.Number(inputConfig.resolutionHeight);
    if (System.Number.isFinite(resolutionHeight) === false || resolutionHeight <= 0)
    {
        resolutionHeight = DEFAULT_RESOLUTION_HEIGHT;
    }

    let orientation = inputConfig.orientation;
    const orientationIndex = ORIENTATIONS.indexOf(orientation);
    if (orientationIndex < 0)
    {
        orientation = DEFAULT_ORIENTATION;
    }

    let markets = inputConfig.markets;
    if (System.Array.isArray(markets) === false || markets.length === 0)
    {
        markets = [DEFAULT_MARKET];
    }

    const normalizedConfig =
    {
        gameName: gameName,
        engineVersion: engineVersion,
        resolutionWidth: System.Math.round(resolutionWidth),
        resolutionHeight: System.Math.round(resolutionHeight),
        orientation: orientation,
        markets: markets
    };
    return normalizedConfig;
}

//=================================================================================================
// 설정 파일 내용을 문자열로 만든다.
//=================================================================================================
function buildConfigFileContent(gameConfig)
{
    const marketsText = System.JSON.stringify(gameConfig.markets);
    const lines =
    [
        "//=================================================================================================",
        "// game.config.js",
        "// Vanilla ADE 가 관리하는 게임 설정. ADE 의 게임 설정 화면에서 바꾸면 이 파일이 갱신된다.",
        "// 직접 수정해도 되지만, ADE 에서 다시 저장하면 이 파일 전체가 다시 쓰여진다.",
        "//=================================================================================================",
        "",
        "export const gameConfig =",
        "{",
        "    gameName: " + System.JSON.stringify(gameConfig.gameName) + ",",
        "    engineVersion: " + System.JSON.stringify(gameConfig.engineVersion) + ",",
        "    resolutionWidth: " + gameConfig.resolutionWidth + ",",
        "    resolutionHeight: " + gameConfig.resolutionHeight + ",",
        "    orientation: " + System.JSON.stringify(gameConfig.orientation) + ",",
        "    markets: " + marketsText,
        "};",
        ""
    ];
    const fileContent = lines.join("\n");
    return fileContent;
}

//=================================================================================================
// 설정 파일에서 한 항목의 값을 문자열로 뽑는다. (없으면 null)
//=================================================================================================
function extractValue(fileContent, fieldName)
{
    const pattern = new System.RegExp(fieldName + "\\s*:\\s*(.+?),?\\s*\\n");
    const matched = fileContent.match(pattern);
    if (matched === null)
    {
        return null;
    }
    let rawValue = matched[1].trim();
    while (rawValue.length > 0 && rawValue.charAt(rawValue.length - 1) === ",")
    {
        rawValue = rawValue.substring(0, rawValue.length - 1);
    }
    return rawValue;
}

//=================================================================================================
// 설정 파일을 읽는다. 파일이 없으면 기본값을 반환한다.
//=================================================================================================
async function readConfig(projectDirectoryPath)
{
    const configFilePath = getConfigFilePath(projectDirectoryPath);
    let fileContent = "";
    try
    {
        fileContent = await fileSystem.readFile(configFilePath, "utf-8");
    }
    catch (readError)
    {
        const defaultConfig = normalizeConfig(null, projectDirectoryPath);
        defaultConfig.exists = false;
        return defaultConfig;
    }

    const sourceConfig = {};
    const fieldNames = ["gameName", "engineVersion", "resolutionWidth", "resolutionHeight", "orientation", "markets"];
    for (const fieldName of fieldNames)
    {
        const rawValue = extractValue(fileContent, fieldName);
        if (rawValue === null)
        {
            continue;
        }
        try
        {
            sourceConfig[fieldName] = System.JSON.parse(rawValue);
        }
        catch (parseError)
        {
            // 값 형식이 어긋나면 기본값으로 채워진다.
        }
    }

    const gameConfig = normalizeConfig(sourceConfig, projectDirectoryPath);
    gameConfig.exists = true;
    return gameConfig;
}

//=================================================================================================
// 설정 파일을 기록한다.
//=================================================================================================
async function writeConfig(projectDirectoryPath, gameConfig)
{
    const normalizedConfig = normalizeConfig(gameConfig, projectDirectoryPath);
    const fileContent = buildConfigFileContent(normalizedConfig);
    const configFilePath = getConfigFilePath(projectDirectoryPath);
    await fileSystem.writeFile(configFilePath, fileContent, "utf-8");
    return normalizedConfig;
}

//=================================================================================================
// 진입 스크립트(src/main.js)가 설정 파일을 사용하도록 한 번 손본다.
// 이미 연결되어 있으면 아무것도 하지 않는다.
//=================================================================================================
async function connectMainScript(projectDirectoryPath)
{
    const mainScriptPath = nodePath.join(projectDirectoryPath, MAIN_SCRIPT_PATH[0], MAIN_SCRIPT_PATH[1]);
    let fileContent = "";
    try
    {
        fileContent = await fileSystem.readFile(mainScriptPath, "utf-8");
    }
    catch (readError)
    {
        const notFoundResult =
        {
            ok: false,
            reason: "main-not-found"
        };
        return notFoundResult;
    }

    const isConnected = fileContent.indexOf("game.config.js") >= 0;
    if (isConnected === true)
    {
        const alreadyResult =
        {
            ok: true,
            connected: false
        };
        return alreadyResult;
    }

    let nextContent = fileContent;

    // 설정 파일 import 를 포함 모듈 목록 끝에 추가한다.
    const importPattern = /(^import[^\n]*\n)(?![\s\S]*^import)/m;
    const importLine = "import { gameConfig } from \"../game.config.js\";\n";
    const hasImport = importPattern.test(nextContent);
    if (hasImport === false)
    {
        const noImportResult =
        {
            ok: false,
            reason: "import-anchor-not-found"
        };
        return noImportResult;
    }
    nextContent = nextContent.replace(importPattern, "$1" + importLine);

    // 기준 해상도와 창 제목을 설정 값으로 바꾼다.
    const resolutionPattern = /referenceResolutionSize\s*=\s*Vector2\.create\([^)]*\)/;
    const resolutionReplacement = "referenceResolutionSize = Vector2.create(gameConfig.resolutionWidth, gameConfig.resolutionHeight)";
    nextContent = nextContent.replace(resolutionPattern, resolutionReplacement);

    const titlePattern = /document\.title\s*=\s*["'`][^"'`]*["'`]/;
    const titleReplacement = "document.title = gameConfig.gameName";
    nextContent = nextContent.replace(titlePattern, titleReplacement);

    await fileSystem.writeFile(mainScriptPath, nextContent, "utf-8");
    const connectedResult =
    {
        ok: true,
        connected: true
    };
    return connectedResult;
}

module.exports =
{
    PLATFORMS,
    MARKETS,
    ORIENTATIONS,
    resolvePlatforms,
    readConfig,
    writeConfig,
    connectMainScript
};
