const { assign } = Object;

const pageUrlRegex = /github\.com\/[\w_.-]+\/[\w_.-]+\/(issues|pull)\/[0-9]+$/;

const titleDelimiter = String.fromCharCode(183);


const state = {
    currentPage: {},
    recentCopies: [],
    recentCopiesMaxLength: 10,

    recentCopyId: null,
};

const init = async () => {
    const { title: pageTitle, url: pageUrl } = await new Promise((res) => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) =>
            res(tab),
        );
    });

    if (pageUrlRegex.test(pageUrl)) {
        const parts = pageTitle.split(titleDelimiter);
        // ^ Title is delimited by the character '·' (183), with having
        // the form <issue or pr name> ' · ' <page index> ' · ' <repo
        // name>.

        const [_pageIndex, repoName] = parts.slice(-2);
        const pageIndex = _pageIndex.match(/\d+/)[0];
        const pageHeader = parts.slice(0, -2).join(titleDelimiter);
        // ^ Since issue or pr name can contain the delimiter character,
        // we split the title by the delimiter and take the last two
        // parts as the page index and repo name.
        // And then we join the rest of the parts as the page title.

        const pageType = pageUrl.includes('issue') ? 'issue' : 'pr';

        assign(state.currentPage, {
            pageHeader,
            pageType,
            pageIndex,
            repoName,
        });
    }

    assign(state.currentPage, { pageTitle, pageUrl });

    state.recentCopies =
        (await chrome.storage.local.get('recentCopies'))['recentCopies'] || [];
    // TODO: This is ugly.

    render();
};

const render = (id, component, ...componentArgs) => {
    const root = document.getElementById(id || 'root');
    root.innerHTML = component ? component(...componentArgs) : App(state);
    setListeners();
};

const App = (state) => {
    return [
        state.currentPage.pageType && CopyFromThisPage(state.currentPage),
        PreviouslyCopied(state.recentCopies),
    ].filter(Boolean);
};

const CopyFromThisPage = (currentPage) => {
    const {pageHeader, pageIndex, pageUrl} = currentPage;
    const longCopyText = `${pageHeader} #${pageIndex}`;
    const shortCopyText = `#${pageIndex}`;

    const contributions =
        [longCopyText, shortCopyText].map(t =>
            Contribution(
                { pageInfoText: t, pageUrl },
                'current',
            ),
        ).join('')


    return  `
        <h1>Copy from this page</h1>
        <hr>
        <ul>
            ${contributions}
        </ul>
    `
};

const PreviouslyCopied = (recentCopies) => `
        <h1>Previously copied</h1>
        <hr>
        <ol>
            ${recentCopies.map(c => Contribution(c, 'previous')).join('')}
        </ol>
    `;

const Contribution = (
    { pageInfoText, pageUrl, repoName, pageType },
    section,
) => {
    const contributionId = escapeHTML(`${pageInfoText}-${pageUrl}`);
    const id = `${section}-${contributionId}`;
    return `
        <li
            id="page-item-${id}"
            class="contribution"
            data-page-url="${escapeHTML(pageUrl)}"
            data-info-text="${escapeHTML(pageInfoText)}"
            data-section="${section}"
        >
            <span class="contribution-link">
                ${ pageType == 'issue' ? IssueSvg : PrSvg }
                <div>
                <a href="${pageUrl}" target="_blank">
                    ${escapeHTML(pageInfoText)}
                </a>
                ${repoName
                    ? `<div class="repo-name"> ${escapeHTML(repoName)} </div>`
                    : ''}
                </div>
            </span>
            <button class="copy-button" id="copy-button-${id}">
            ${state.recentCopyId == id ? CheckSvg : CopySvg}
            </button>
        </li>
    `
}

const setListeners = () => {
    document
        .querySelectorAll('.copy-button')
        .forEach((button) => button.addEventListener('click', onCopyClick));
};

const onCopyClick = (e) => {
    const id =
        e.currentTarget.id.split('copy-button-').slice(1).join('');
    const [section, ...restOfTheId] = id.split('-');
    const contributionId = restOfTheId.join('-');
    const pageItem = document.getElementById(`page-item-${id}`);

    const pageUrl = unescapeHTML(pageItem.getAttribute('data-page-url'));
    const pageInfoText = unescapeHTML(pageItem.getAttribute('data-info-text'));


    const textToCopy = `[${pageInfoText}](${pageUrl})`;
    copyToClipboard(textToCopy);

    if ( !state.recentCopies.some(
        p => p.contributionId == contributionId
    )) {
        state.recentCopies.push({
            contributionId,
            pageInfoText,
            ...state.currentPage,
        });
    }

    state.recentCopies.sort(
        (a) => (a.contributionId == contributionId ? -1 : 1));
    state.recentCopies =
        state.recentCopies.slice(0, state.recentCopiesMaxLength);
    chrome.storage.local.set({ recentCopies: state.recentCopies });

    state.recentCopyId = id;
    setTimeout(() => {
        state.recentCopyId = null;
        render();
    }, 1000);

    render();
};

const copyToClipboard = (text) => {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand('copy');

    document.body.removeChild(textarea);
};

const escapeHTML = (str) => {
    // ^ https://stackoverflow.com/a/7382028
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const unescapeHTML = (str) => {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
}

document.addEventListener('DOMContentLoaded', init);

const CopySvg = `
    <svg xmlns="http://www.w3.org/2000/svg"
        width="17" height="22"
        fill="none"
    >
        <path
            fill="#7A7A7A"
            d="M13.967 14.167h-6.98c-.32 0-.581-.284-.581-.632V3.415c0-.348.262-.633.581-.633h5.093l2.469 2.685v8.068c0 .348-.262.632-.582.632Zm-6.98 1.898h6.98c1.283 0 2.327-1.135 2.327-2.53V5.467c0-.502-.186-.985-.513-1.34l-2.465-2.685a1.677 1.677 0 0 0-1.232-.557H6.987c-1.283 0-2.326 1.134-2.326 2.53v10.12c0 1.395 1.043 2.53 2.326 2.53ZM2.334 5.945C1.051 5.945.008 7.08.008 8.475v10.12c0 1.395 1.043 2.53 2.326 2.53h6.98c1.283 0 2.326-1.135 2.326-2.53V17.33H9.896v1.265c0 .348-.262.632-.582.632h-6.98c-.32 0-.581-.284-.581-.632V8.475c0-.348.261-.633.581-.633h1.164V5.945H2.334Z"
        />
    </svg>`

const CheckSvg = `
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.2225 1.24213C17.6968 1.73041 17.6968 2.52338 17.2225 3.01166L7.50822 13.0117C7.03389 13.4999 6.26358 13.4999 5.78925 13.0117L0.932103 8.01166C0.457772 7.52338 0.457772 6.73041 0.932103 6.24213C1.40643 5.75385 2.17675 5.75385 2.65108 6.24213L6.65063 10.3554L15.5073 1.24213C15.9817 0.753845 16.752 0.753845 17.2263 1.24213H17.2225Z" fill="#1F883D"/>
    </svg>
`;

const IssueSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="14">
        <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
        <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256-96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
    </svg>
`;

const PrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="14">
        <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->

        <path d="M305.8 2.1C314.4 5.9 320 14.5 320 24V64h16c70.7 0 128 57.3 128 128V358.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3V192c0-35.3-28.7-64-64-64H320v40c0 9.5-5.6 18.1-14.2 21.9s-18.8 2.3-25.8-4.1l-80-72c-5.1-4.6-7.9-11-7.9-17.8s2.9-13.3 7.9-17.8l80-72c7-6.3 17.2-7.9 25.8-4.1zM104 80A24 24 0 1 0 56 80a24 24 0 1 0 48 0zm8 73.3V358.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3V153.3C19.7 141 0 112.8 0 80C0 35.8 35.8 0 80 0s80 35.8 80 80c0 32.8-19.7 61-48 73.3zM104 432a24 24 0 1 0 -48 0 24 24 0 1 0 48 0zm328 24a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/>
    </svg>
`;

