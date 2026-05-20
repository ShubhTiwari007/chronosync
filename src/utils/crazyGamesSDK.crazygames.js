// src/utils/crazyGamesSDK.js
// Adaptive SDK Wrapper supporting GameMonetize, GameDistribution, and CrazyGames APIs.

let activeAdCallbacks = null;
let isAudioMuted = false;

export function initSDK() {
  console.log("[SDK Switcher] Initializing SDK hooks.");
  
  // 1. Setup GameMonetize callbacks if script options are defined
  window.sdkCallbacks = {
    onAdStarted: () => {
      console.log("[GameMonetize SDK] Ad started.");
      isAudioMuted = true;
      if (activeAdCallbacks && typeof activeAdCallbacks.adStarted === 'function') {
        activeAdCallbacks.adStarted();
      }
    },
    onAdFinished: () => {
      console.log("[GameMonetize SDK] Ad finished.");
      isAudioMuted = false;
      if (activeAdCallbacks && typeof activeAdCallbacks.adFinished === 'function') {
        activeAdCallbacks.adFinished();
      }
      activeAdCallbacks = null;
    }
  };

  // 2. Setup GameDistribution callbacks
  window.gdsdkCallbacks = {
    onAdStarted: () => {
      console.log("[GameDistribution SDK] Ad started.");
      isAudioMuted = true;
      if (activeAdCallbacks && typeof activeAdCallbacks.adStarted === 'function') {
        activeAdCallbacks.adStarted();
      }
    },
    onAdFinished: () => {
      console.log("[GameDistribution SDK] Ad finished.");
      isAudioMuted = false;
      if (activeAdCallbacks && typeof activeAdCallbacks.adFinished === 'function') {
        activeAdCallbacks.adFinished();
      }
      activeAdCallbacks = null;
    }
  };

  // 3. Initialize CrazyGames SDK v3 if present
  if (window.CrazyGames && window.CrazyGames.SDK) {
    try {
      window.CrazyGames.SDK.init();
      console.log("[CrazyGames SDK] SDK v3 initialized successfully.");
    } catch (e) {
      console.error("[CrazyGames SDK] Failed to initialize:", e);
    }
  }
}

export function requestMidgameAd(callbacks) {
  initSDK();
  activeAdCallbacks = callbacks;

  // A. GameMonetize Check
  if (typeof sdk !== 'undefined' && sdk.showBanner) {
    console.log("[SDK Switcher] Requesting GameMonetize interstitial ad.");
    sdk.showBanner();
    return;
  }

  // B. GameDistribution Check
  if (typeof gdsdk !== 'undefined' && gdsdk.showAd) {
    console.log("[SDK Switcher] Requesting GameDistribution interstitial ad.");
    gdsdk.showAd('interstitial').catch(err => {
      console.warn("[SDK Switcher] GD Ad failed:", err);
      if (callbacks && typeof callbacks.adError === 'function') {
        callbacks.adError(err);
      }
      if (callbacks && typeof callbacks.adFinished === 'function') {
        callbacks.adFinished();
      }
    });
    return;
  }

  // C. CrazyGames Check
  if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
    console.log("[SDK Switcher] Requesting CrazyGames midgame ad.");
    window.CrazyGames.SDK.ad.requestAd("midgame", {
      adStarted: () => {
        isAudioMuted = true;
        if (callbacks && typeof callbacks.adStarted === 'function') callbacks.adStarted();
      },
      adFinished: () => {
        isAudioMuted = false;
        if (callbacks && typeof callbacks.adFinished === 'function') callbacks.adFinished();
      },
      adError: (err) => {
        isAudioMuted = false;
        if (callbacks && typeof callbacks.adError === 'function') callbacks.adError(err);
        if (callbacks && typeof callbacks.adFinished === 'function') callbacks.adFinished();
      }
    });
    return;
  }

  // D. Dev/Bypass Fallback
  console.log("[SDK Switcher Mock] Bypassing ad in local developer environment.");
  if (callbacks && typeof callbacks.adFinished === 'function') {
    // Resolve asynchronously to mimic network turnaround
    setTimeout(() => {
      callbacks.adFinished();
    }, 400);
  }
}

export function signalGameplayStart() {
  console.log("[SDK Switcher] Gameplay Start signaled.");
  // CrazyGames specific
  if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.game) {
    window.CrazyGames.SDK.game.gameplayStart();
  }
}

export function signalGameplayStop() {
  console.log("[SDK Switcher] Gameplay Stop signaled.");
  // CrazyGames specific
  if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.game) {
    window.CrazyGames.SDK.game.gameplayStop();
  }
}

export function triggerHappytime() {
  console.log("[SDK Switcher] Happytime triggered.");
  // CrazyGames specific
  if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.game) {
    window.CrazyGames.SDK.game.happytime();
  }
}

// Local Storage Wrappers
export function saveData(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {
    console.warn("Storage save failed:", e);
  }
}

export function loadData(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Storage load failed:", e);
    return null;
  }
}
