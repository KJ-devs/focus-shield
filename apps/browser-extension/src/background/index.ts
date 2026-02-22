// Background service worker for Focus Shield extension
// Handles declarativeNetRequest rule management and session sync
// Implementation in US-06

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console -- startup log acceptable
  console.log("Focus Shield extension installed");
});

export {};
