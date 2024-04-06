const
    pageUrlRegex =
        /github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/issues|pull\/\d+$/,

    titleDelimiter = String.fromCharCode(183)

    main = async () => {
        const tab = await new Promise(res => {
            chrome.tabs.query(
                {active: true, currentWindow: true},
                ([tab]) => res(tab),
            )
        })

        const {title, url} = tab
        if (pageUrlRegex.test(url)) {
            const
                parts = title.split(titleDelimiter),
                [pageIndex, repoName] = parts.slice(-2),
                pageType = url.includes('Issue') ? 'pr' : 'issue',
                pageTitle = parts.slice(0, -2).join(titleDelimiter)

            document.body.appendChild(createTitleElement('Copy from this page'))

            document.body.appendChild(
                createPageElement({
                    pageTitle,
                    pageType: 'Issue',
                    pageIndex,
                    pageUrl: url
                })
            )

            document.body.appendChild(
                document.createElement('hr')
            )
        }

        const titleElement2 = document.createElement('h1')
        titleElement2.innerText = 'Previously copied'
        document.body.appendChild(titleElement2)

        const {recentCopies} = await chrome.storage.local.get('recentCopies')
        if (!recentCopies) {
            return
        }

        const pageElementList = document.createElement('ul')
        if (recentCopies)
            recentCopies.forEach(pageDetails => {
                const pageElement = createPageElement(pageDetails)
                pageElementList.appendChild(pageElement)
            })

        document.body.appendChild(pageElementList)
    },

    createTitleElement = (title) => {
        const titleElement = document.createElement('h1')
        titleElement.innerText = title
        return titleElement
    },

    createPageElement = ({pageTitle, pageType, pageIndex, pageUrl}) => {
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
            chrome.storage.local.get('recentCopies', ({recentCopies}) => {
                recentCopies = recentCopies || []

                if (! recentCopies.some(({pageUrl: pUrl}) => pUrl === pageUrl))
                    recentCopies.push({pageTitle, pageType, pageIndex, pageUrl})

                recentCopies.sort((a, _) => a.pageUrl == pageUrl ? -1 : 1)

                chrome.storage.local.set({ recentCopies }, () => {
                    console.log('Data saved:', recentCopies)
                })
            })
        })

        return pageElement
    },

    copyToClipboard = (text) => {
        const textarea = document.createElement("textarea")

        textarea.value = text
        textarea.style.position = "absolute"
        textarea.style.left = "-9999px"

        document.body.appendChild(textarea)

        textarea.select();
        document.execCommand("copy")

        document.body.removeChild(textarea);
    }

document.addEventListener('DOMContentLoaded', main)
