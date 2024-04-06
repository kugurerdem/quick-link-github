const
    {assign} = Object,

    pageUrlRegex =
        /github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/(issues|pull)\/[0-9]+$/,

    titleDelimiter = String.fromCharCode(183),

    state = {
        currentPage: {},
        recentCopies: [],
        pageUrl: '',
        pageTitle: '',
    },

    init = async () => {
        const
            {title: pageTitle, url: pageUrl} = await new Promise(res => {
                chrome.tabs.query(
                    {active: true, currentWindow: true},
                    ([tab]) => res(tab),
                )
            })


        if ( pageUrlRegex.test(pageUrl) ) {
            const
                parts = pageTitle.split(titleDelimiter),
                // ^ Title is delimited by the character '·' (183), with having
                // the form <issue or pr name> ' · ' <page index> ' · ' <repo
                // name>.

                [_pageIndex, repoName] = parts.slice(-2),
                pageIndex = _pageIndex.match(/\d+/)[0],
                pageHeader = parts.slice(0, -2).join(titleDelimiter)
                // ^ Since issue or pr name can contain the delimiter character,
                // we split the title by the delimiter and take the last two
                // parts as the page index and repo name.
                // And then we join the rest of the parts as the page title.

                pageType = pageUrl.includes('Issue') ? 'pr' : 'issue'

            assign(state.currentPage, {
                pageHeader, pageType, pageIndex, repoName,
            })
        }

        assign(state.currentPage, {pageTitle, pageUrl})

        state.recentCopies = (
            await chrome.storage.local.get('recentCopies')
        )['recentCopies'] || []
        // TODO: This is ugly.

        render()
    },

    render = (id, component, ...componentArgs) => {
        const root = document.getElementById(id || 'root')
        root.innerHTML = component ? component(...componentArgs) : App(state)
        setListeners()
    },

    App = (state) => {
        return ([
            state.currentPage.pageType && CopyFromThisPage(state.currentPage),
            PreviouslyCopied(state.recentCopies),
        ]
            .filter(Boolean)
            .join('<hr>'))
    },

    CopyFromThisPage = (currentPage) => `
        <h1>Copy from this page</h1>
        <ul>
            ${PageItem(currentPage)}
        </ul>
    `,

    PreviouslyCopied = (recentCopies) => `
        <h1>Previously copied</h1>
        <ul>
            ${recentCopies.map(PageItem).join('')}
        </ul>
    `,

    PageItem = ({pageHeader, pageType, pageIndex, pageUrl, repoName}) => `
        <li id="page-item-${pageUrl}">
            <span>${pageType} ${pageIndex}: ${pageHeader}</span>
            <button class="copy-button" id="copy-button-${pageUrl}">Copy</button>
        </li>
    `,

    setListeners = () => {
        document.querySelectorAll('.copy-button').forEach(
            button => button.addEventListener('click', onCopyClick)
        )
    },

    onCopyClick = (e) => {
        const
            pageUrl = e.target.id.split('copy-button-').slice(1).join(''),
            pageItem = document.getElementById(`page-item-${pageUrl}`),
            pageInfoText = pageItem.querySelector('span').innerText

        copyToClipboard(`[${pageInfoText}](${pageUrl})`)

        if (! state.recentCopies.some(({pageUrl: pUrl}) => pUrl === pageUrl)) {
            state.recentCopies.push(state.currentPage)
        }

        state.recentCopies.sort((a, _) => a.pageUrl == pageUrl ? -1 : 1)
        chrome.storage.local.set({ recentCopies: state.recentCopies })

        render()
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

document.addEventListener('DOMContentLoaded', init)
