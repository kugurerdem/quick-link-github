onPageLoad(null)

chrome.runtime.onMessage.addListener(function(request) {
    if (request && request.type === 'page-load') {
        onPageLoad(request)
    }
});

function onPageLoad(request) {
    console.log('Page loaded', request)
    const headerElement = document.body.querySelector('h1.gh-header-title')

    const pageUrl = window.location.href

    if (! /pull|issues\/\d+/.test(pageUrl))
        return

    const pageType =  /pull\/\d+/.test(pageUrl) ? 'pull' : 'issue'

    if (headerElement) {
        const pageTitle = headerElement.querySelector('bdi').innerText
        const pageIndex = headerElement.querySelector('span').innerText


        chrome.storage.local.get(['recentPages'], function(result) {
            const recentPages = result.recentPages || []

            if ( !recentPages.some(pr => pr.pageIndex === pageIndex) ) {
                recentPages.push({ pageTitle, pageIndex, pageType, pageUrl })
            }
            recentPages.sort((a, b) => a.pageIndex === pageIndex ? -1 : 1)

            chrome.storage.local.set({ recentPages }, function() {
                console.log('Data saved:', recentPages)
            })
        })
    }
}
