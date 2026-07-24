//=================================================================================================
// project.js
// .vanilla 프로젝트 폴더의 읽기 / 쓰기 / 초기화를 담당하는 메인 프로세스 모듈.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");

const VANILLA_DIRECTORY_NAME = ".vanilla";
const PROJECT_FILE_NAME = "project.json";
const DEFAULT_PROJECT_VERSION = "0.1.0";

//=================================================================================================
// .vanilla 디렉토리의 절대 경로를 반환한다.
//=================================================================================================
function getVanillaDirectoryPath(projectDirectoryPath)
{
    const vanillaDirectoryPath = nodePath.join(projectDirectoryPath, VANILLA_DIRECTORY_NAME);
    return vanillaDirectoryPath;
}

//=================================================================================================
// .vanilla/project.json 파일의 절대 경로를 반환한다.
//=================================================================================================
function getProjectFilePath(projectDirectoryPath)
{
    const vanillaDirectoryPath = getVanillaDirectoryPath(projectDirectoryPath);
    const projectFilePath = nodePath.join(vanillaDirectoryPath, PROJECT_FILE_NAME);
    return projectFilePath;
}

//=================================================================================================
// 해당 폴더가 이미 Vanilla 프로젝트인지(project.json 존재 여부) 확인한다.
//=================================================================================================
async function hasVanillaProject(projectDirectoryPath)
{
    const projectFilePath = getProjectFilePath(projectDirectoryPath);
    try
    {
        await fileSystem.access(projectFilePath);
        return true;
    }
    catch (accessError)
    {
        return false;
    }
}

//=================================================================================================
// project.json 을 읽어 프로젝트 데이터 객체를 반환한다.
//=================================================================================================
async function readProject(projectDirectoryPath)
{
    const projectFilePath = getProjectFilePath(projectDirectoryPath);
    const fileContent = await fileSystem.readFile(projectFilePath, "utf-8");
    const projectData = System.JSON.parse(fileContent);
    return projectData;
}

//=================================================================================================
// 프로젝트 데이터 객체를 project.json 으로 기록한다. (.vanilla 폴더가 없으면 생성)
//=================================================================================================
async function writeProject(projectDirectoryPath, projectData)
{
    const vanillaDirectoryPath = getVanillaDirectoryPath(projectDirectoryPath);
    const makeDirectoryOptions =
    {
        recursive: true
    };
    await fileSystem.mkdir(vanillaDirectoryPath, makeDirectoryOptions);

    const projectFilePath = getProjectFilePath(projectDirectoryPath);
    const fileContent = System.JSON.stringify(projectData, null, 4);
    await fileSystem.writeFile(projectFilePath, fileContent, "utf-8");
}

//=================================================================================================
// 새 Vanilla 프로젝트를 초기화하고 생성된 프로젝트 데이터를 반환한다.
//=================================================================================================
async function initializeProject(projectDirectoryPath, projectName)
{
    const currentDate = new System.Date();
    const nowIsoString = currentDate.toISOString();
    const projectData =
    {
        name: projectName,
        description: "",
        version: DEFAULT_PROJECT_VERSION,
        createdAt: nowIsoString,
        updatedAt: nowIsoString
    };
    await writeProject(projectDirectoryPath, projectData);
    return projectData;
}

//=================================================================================================
// .vanilla 폴더 안의 임의 JSON 파일을 읽는다. 파일이 없거나 손상되면 defaultValue 를 반환한다.
//=================================================================================================
async function readProjectJson(projectDirectoryPath, fileName, defaultValue)
{
    const vanillaDirectoryPath = getVanillaDirectoryPath(projectDirectoryPath);
    const filePath = nodePath.join(vanillaDirectoryPath, fileName);
    try
    {
        const fileContent = await fileSystem.readFile(filePath, "utf-8");
        const parsedData = System.JSON.parse(fileContent);
        return parsedData;
    }
    catch (readError)
    {
        return defaultValue;
    }
}

//=================================================================================================
// .vanilla 폴더 안의 임의 JSON 파일을 기록한다. (.vanilla 폴더가 없으면 생성)
//=================================================================================================
async function writeProjectJson(projectDirectoryPath, fileName, data)
{
    const vanillaDirectoryPath = getVanillaDirectoryPath(projectDirectoryPath);
    const makeDirectoryOptions =
    {
        recursive: true
    };
    await fileSystem.mkdir(vanillaDirectoryPath, makeDirectoryOptions);
    const filePath = nodePath.join(vanillaDirectoryPath, fileName);
    const fileContent = System.JSON.stringify(data, null, 4);
    await fileSystem.writeFile(filePath, fileContent, "utf-8");
}

module.exports =
{
    getVanillaDirectoryPath,
    getProjectFilePath,
    hasVanillaProject,
    readProject,
    writeProject,
    initializeProject,
    readProjectJson,
    writeProjectJson
};
