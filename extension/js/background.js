function updateTabFocusHandler(msg, sender) {
	if (msg.text == "update_tabIsFocused") {
		chrome.windows.get(sender.tab.windowId, function(window) {
			chrome.tabs.executeScript(sender.tab.id, { code: "mindfulBrowsing.updateTabIsFocused(" + (sender.tab.active && window.focused) + ");" });
		});
	}
}

function initExtension() {
	chrome.runtime.onMessage.addListener(updateTabFocusHandler);
}

initExtension();