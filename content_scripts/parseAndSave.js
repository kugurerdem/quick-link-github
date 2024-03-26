onPageLoad(null)

chrome.runtime.onMessage.addListener(function(request) {
    if (request && request.type === 'page-load') {
        onPageLoad(request)
    }
});

function onPageLoad(request) {
    console.log('Page loaded', request)
    const headerElement = document.body.querySelector('h1.gh-header-title')

    if (headerElement) {
        const prTitle = headerElement.querySelector('bdi').innerText
        const prNumber = headerElement.querySelector('span').innerText
        const url = window.location.href

        chrome.storage.local.get(['prs'], function(result) {
            const prs = result.prs || []

            if ( !prs.some(pr => pr.prNumber === prNumber) ) {
                prs.push({ prTitle, prNumber, url })
            }
            prs.sort((a, b) => a.prNumber === prNumber ? -1 : 1)

            chrome.storage.local.set({ prs }, function() {
                console.log('Data saved:', prs)
            })
        })
    }
}
