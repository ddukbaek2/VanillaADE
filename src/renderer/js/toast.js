//=================================================================================================
// toast.js
// 화면 우하단에 잠깐 떠올랐다 사라지는 플로팅 알림(토스트)을 표시한다.
//=================================================================================================

const System = globalThis;

const TOAST_DURATION_MS = 2800;
const TOAST_FADE_MS = 250;

//=================================================================================================
// 토스트 컨테이너를 가져온다. (없으면 생성)
//=================================================================================================
function getToastContainer()
{
    let containerElement = document.getElementById("toast-container");
    if (containerElement === null)
    {
        containerElement = document.createElement("div");
        containerElement.id = "toast-container";
        document.body.appendChild(containerElement);
    }
    return containerElement;
}

//=================================================================================================
// 메시지를 토스트로 띄운다.
//=================================================================================================
export function showToast(message)
{
    const containerElement = getToastContainer();

    const toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.textContent = message;
    containerElement.appendChild(toastElement);

    window.requestAnimationFrame(function ()
    {
        toastElement.classList.add("visible");
    });

    window.setTimeout(function ()
    {
        toastElement.classList.remove("visible");
        window.setTimeout(function ()
        {
            toastElement.remove();
        }, TOAST_FADE_MS);
    }, TOAST_DURATION_MS);
}
