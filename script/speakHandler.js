// unitySpeakHandler.js

var unitySpeaking = false;
var isSpeaking = false;
var isStoping = false;

function unitySpeak(message, voice) {
  unityInstance.SendMessage("ChatAgent", "ReceiveDataFromBrowser", message);
  unityInstance.SendMessage("Azure", "setVoice", voice);
}

function unityAnimate(animation) {
  unityInstance.SendMessage("VTutor", "ExecuteAnimation", `state,${animation}`);
  unityInstance.SendMessage("ChatAgent", "SetPlaybackSpeed", "1.05");
}

window.addEventListener("VTuber_Message_Delivery_Complete", function () {
  isSpeaking = false;
});

// ✅ React Native WebView 対応（document.addEventListener）
document.addEventListener("message", async (event) => {
  try {
    const data = JSON.parse(event.data);
    await handleMessage(data);
  } catch (e) {
    console.error("Invalid message from React Native WebView:", e);
  }
});

// ✅ 通常のブラウザ対応（window.addEventListener）
window.addEventListener("message", async (event) => {
  try {
    await handleMessage(event.data);
  } catch (e) {
    console.error("Invalid message from window:", e);
  }
});

// ✅ 共通処理関数
async function handleMessage(data) {
  if (data?.action === "unitySpeak" && data?.message) {
    const message = data.message;
    const voice = data.voice || "ja-JP-NanamiNeural"; // デフォルト音声を日本語に

    while (unitySpeaking) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    unitySpeaking = true;
    try {
      setTimeout(() => {
        unityAnimate(1);
      }, 1);

      const sentences = message
        .split(/(?<=[.!?。！？]|\n)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (let i = 0; i < sentences.length; i++) {
        if (isStoping) break;

        try {
          unitySpeak(sentences[i], voice);
        } catch (e) {
          console.log("Speak Error:", e);
        }

        isSpeaking = true;
        while (isSpeaking) {
          if (isStoping) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (e) {
      console.log("Speaking failed:", e);
    } finally {
      unityAnimate(3);
      unitySpeaking = false;
      isStoping = false;

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "VTuber_Message_Delivery_Complete",
            message: message,
          })
        );
      } else if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "VTuber_Message_Delivery_Complete",
            message: message,
          },
          "*"
        );
      }
    }
  } else if (data?.action === "stopSpeaking") {
    isStoping = true;
  }
}

document.body.addEventListener("click", (event) => {
  window.parent.postMessage(
    {
      type: "IFRAME_CLICK",
      x: event.clientX,
      y: event.clientY,
    },
    "*"
  );
});
