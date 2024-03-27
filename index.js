const main = async () => {
    const {recentPages} = await chrome.storage.local.get('recentPages')

    const pageElementList = document.createElement('ul')
    recentPages.forEach(({pageTitle, pageType, pageIndex, pageUrl}) => {
        // TODO: repo name should be extracted from the URL
        // TODO: a link for directly opening the page in the browser
        const pageElement = document.createElement('li')

        const spanElement = document.createElement('span')
        const pageInfoText = `${pageType} ${pageIndex}: ${pageTitle}`
        spanElement.innerText = pageInfoText
        pageElement.appendChild(spanElement)

        const copyButton = document.createElement('button')
        copyButton.innerText = 'Copy'

        pageElement.appendChild(copyButton)

        copyButton.addEventListener('click', () => {
            copyToClipboard(`[${pageInfoText}](${pageUrl})`)
        })

        pageElementList.appendChild(pageElement)
    })

    document.body.appendChild(pageElementList)
}

const copyToClipboard = (text) => {
    const textarea = document.createElement("textarea")

    textarea.value = text
    textarea.style.position = "absolute"
    textarea.style.left = "-9999px"

    document.body.appendChild(textarea)

    textarea.select();
    document.execCommand("copy")

    document.body.removeChild(textarea);
}

main()
