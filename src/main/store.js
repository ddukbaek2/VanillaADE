//=================================================================================================
// store.js
// 애플리케이션 단위의 영속 상태(마지막으로 연 프로젝트 등)를 userData 경로에 저장한다.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");
const { app } = require("electron");

const STORE_FILE_NAME = "vanilla-ade.json";

//=================================================================================================
// 저장소 파일의 절대 경로를 반환한다.
//=================================================================================================
function getStoreFilePath()
{
    const userDataPath = app.getPath("userData");
    const storeFilePath = nodePath.join(userDataPath, STORE_FILE_NAME);
    return storeFilePath;
}

//=================================================================================================
// 저장소 데이터를 읽는다. 파일이 없거나 손상된 경우 빈 객체를 반환한다.
//=================================================================================================
async function readStore()
{
    const storeFilePath = getStoreFilePath();
    try
    {
        const fileContent = await fileSystem.readFile(storeFilePath, "utf-8");
        const storeData = System.JSON.parse(fileContent);
        return storeData;
    }
    catch (readError)
    {
        return {};
    }
}

//=================================================================================================
// 저장소 데이터를 기록한다.
//=================================================================================================
async function writeStore(storeData)
{
    const storeFilePath = getStoreFilePath();
    const fileContent = System.JSON.stringify(storeData, null, 4);
    await fileSystem.writeFile(storeFilePath, fileContent, "utf-8");
}

module.exports =
{
    readStore,
    writeStore
};
