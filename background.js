chrome.webRequest.onCompleted.addListener(function(details) {
    // check whether the reciever exists
    chrome.tabs.sendMessage(details.tabId, { details, type: 'page-load'})
}, {
    urls: ['*://github.com/*/issues/*', '*://github.com/*/pull/*']
});
