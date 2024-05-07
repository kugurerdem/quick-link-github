const { assign } = Object;

const pageUrlRegex = /github\.com\/[\w_.-]+\/[\w_.-]+\/(issues|pull)\/[0-9]+$/;

const titleDelimiter = String.fromCharCode(183);

const state = {
    currentPage: {},
    recentCopies: [],
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

const CopyFromThisPage = (currentPage) => `
        <h1>Copy from this page</h1>
        <hr>
        <ul>
            ${ContributionLong(currentPage)}
            ${ContributionShort(currentPage)}
        </ul>
    `;

const PreviouslyCopied = (recentCopies) => `
        <h1>Previously copied</h1>
        <hr>
        <ol>
            ${recentCopies.map(ContributionLong).join('')}
        </ol>
    `;

const ContributionLong = ({ pageHeader, pageIndex, pageUrl }) => `
    <li id="page-item-${pageUrl}" class="contribution">
        <span class="contribution-link">${pageHeader} #${pageIndex}</span>
        <button class="copy-button" id="copy-button-${pageUrl}">
        ${CopySvg}
        </button>
    </li>
`;

const ContributionShort = ({ pageIndex, pageUrl }) => `
        <li id="page-item-${pageUrl}" class="contribution">
            <span class="contribution-link">#${pageIndex}</span>
            <button class="copy-button" id="copy-button-${pageUrl}">
            ${CopySvg}
            </button>
        </li>
    `;

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

const setListeners = () => {
    document
        .querySelectorAll('.copy-button')
        .forEach((button) => button.addEventListener('click', onCopyClick));
};

const onCopyClick = (e) => {
    const pageUrl = e.target.id.split('copy-button-').slice(1).join(''),
        pageItem = document.getElementById(`page-item-${pageUrl}`),
        pageInfoText = pageItem.querySelector('span').innerText;

    copyToClipboard(`[${pageInfoText}](${pageUrl})`);

    if (!state.recentCopies.some(({ pageUrl: pUrl }) => pUrl === pageUrl)) {
        state.recentCopies.push(state.currentPage);
    }

    state.recentCopies.sort((a) => (a.pageUrl == pageUrl ? -1 : 1));
    chrome.storage.local.set({ recentCopies: state.recentCopies });

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

document.addEventListener('DOMContentLoaded', init);
