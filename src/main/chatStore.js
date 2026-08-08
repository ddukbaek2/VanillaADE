//=================================================================================================
// chatStore.js
// 기본 모드(채팅)의 대화 기록을 프로젝트 디렉토리의 .vanilla/chat.json 에 보관한다.
//=================================================================================================

const System = globalThis;
const fileSystem = require("node:fs/promises");
const nodePath = require("node:path");

const VANILLA_DIRECTORY_NAME = ".vanilla";
const CHAT_FILE_NAME = "chat.json";
const MAXIMUM_MESSAGE_COUNT = 500;

//=================================================================================================
// 대화 기록 파일의 절대 경로를 반환한다.
//=================================================================================================
function getChatFilePath(agentDirectoryPath)
{
    const vanillaDirectoryPath = nodePath.join(agentDirectoryPath, VANILLA_DIRECTORY_NAME);
    const chatFilePath = nodePath.join(vanillaDirectoryPath, CHAT_FILE_NAME);
    return chatFilePath;
}

//=================================================================================================
// 대화 기록을 읽는다. (없거나 손상되면 빈 배열)
//=================================================================================================
async function listMessages(agentDirectoryPath)
{
    const chatFilePath = getChatFilePath(agentDirectoryPath);
    try
    {
        const fileContent = await fileSystem.readFile(chatFilePath, "utf-8");
        const chatData = System.JSON.parse(fileContent);
        const messages = chatData.messages;
        if (System.Array.isArray(messages) === false)
        {
            return [];
        }
        return messages;
    }
    catch (readError)
    {
        return [];
    }
}

//=================================================================================================
// 대화 기록에 메시지 한 건을 추가한다. 오래된 메시지는 최대 개수를 넘지 않도록 잘라낸다.
//=================================================================================================
async function appendMessage(agentDirectoryPath, chatMessage)
{
    const messages = await listMessages(agentDirectoryPath);
    messages.push(chatMessage);

    const messageCount = messages.length;
    let storedMessages = messages;
    if (messageCount > MAXIMUM_MESSAGE_COUNT)
    {
        storedMessages = messages.slice(messageCount - MAXIMUM_MESSAGE_COUNT);
    }

    const vanillaDirectoryPath = nodePath.join(agentDirectoryPath, VANILLA_DIRECTORY_NAME);
    const makeDirectoryOptions =
    {
        recursive: true
    };
    await fileSystem.mkdir(vanillaDirectoryPath, makeDirectoryOptions);

    const chatData =
    {
        messages: storedMessages
    };
    const chatFilePath = getChatFilePath(agentDirectoryPath);
    const fileContent = System.JSON.stringify(chatData, null, 4);
    await fileSystem.writeFile(chatFilePath, fileContent, "utf-8");
    return true;
}

//=================================================================================================
// 대화 기록을 모두 비운다.
//=================================================================================================
async function clearMessages(agentDirectoryPath)
{
    const chatFilePath = getChatFilePath(agentDirectoryPath);
    try
    {
        await fileSystem.unlink(chatFilePath);
    }
    catch (unlinkError)
    {
        // 기록이 없으면 지울 것도 없다.
    }
    return true;
}

module.exports =
{
    listMessages,
    appendMessage,
    clearMessages
};
