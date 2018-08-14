var lastTabId = null;

function isNormalUrl(url) {
	return url && ((url.indexOf('http://') === 0) || (url.indexOf('https://') === 0));
}

function trySuspendLastTab() {
	if(lastTabId) {
		chrome.tabs.executeScript(lastTabId, { code: "mindfulBrowsing.suspendWaitTimer();" });
		lastTabId = null;
	}
}

function tryResumeTab(tab) {
	if(isNormalUrl(tab.url) && tab.id) {
		chrome.tabs.executeScript(tab.id, { code: "mindfulBrowsing.resumeWaitTimer();" });	
		lastTabId = tab.id;
	}
}

function changeTabHandler(info) {
	trySuspendLastTab();
	
	chrome.tabs.get(info.tabId, function(tab) {
		tryResumeTab(tab);
	});
}

function windowFocusChangedHandler(windowId) {
	console.log("window focus change handler " + windowId);
	trySuspendLastTab();
	
	if (windowId != chrome.windows.WINDOW_ID_NONE) {
		chrome.tabs.getSelected(windowId, function(tab) {
			tryResumeTab(tab);
		});
	}
}

function initExtension() {
	chrome.tabs.onActivated.addListener(changeTabHandler);
	chrome.windows.onFocusChanged.addListener(windowFocusChangedHandler);
}

initExtension();