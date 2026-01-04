const { assign } = Object;

const pageUrlRegex =
    /github\.com\/[\w_.-]+\/[\w_.-]+\/(issues|pull)\/[0-9]+(\/[\w_.-]+)*([?#].*)?$/;

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

        const [_pageIndex, repoName] = parts.slice(1, 3);
        const pageIndex = _pageIndex.match(/\d+/)[0];
        let pageHeader = parts.slice(0, -2).join(titleDelimiter).trim();
        // ^ Since issue or pr name can contain the delimiter character,
        // we split the title by the delimiter and take the last two
        // parts as the page index and repo name.
        // And then we join the rest of the parts as the page title.

        const pageType = pageUrl.includes('issue') ? 'issue' : 'pr';

        // Get rid of the author name in the PR title.
        if (pageType === 'pr') {
            pageHeader = pageHeader.replace(/ by.*$/, '');
        }

        assign(state.currentPage, {
            pageTitle,
            pageUrl,
            pageHeader,
            pageType,
            pageIndex,
            repoName,
        });
    }

    state.recentCopies =
        (await chrome.storage.local.get('recentCopies'))['recentCopies'] || [];
    // TODO: This is ugly.

    render();
};

const render = () => {
    const root = document.getElementById('root');
    root.innerHTML = App(state);

    setListeners();
};

const App = (state) => {
    if (!state.currentPage.pageTitle && state.recentCopies.length === 0) {
        return [EmptyState(), Footer()].filter(Boolean).join('');
    }

    return [
        state.currentPage.pageType && CopyFromThisPage(state.currentPage),
        PreviouslyCopied(state.recentCopies),
        Footer(),
    ]
        .filter(Boolean)
        .join('');
};

const EmptyState = () => `
    <section class="empty-state">
        <h2>Welcome to Quick Link GitHub!</h2>
        <p>This extension offers you a quick way to copy formatted links and remembers them for later use.</p>
        <p>Go to any GitHub issue or PR page, click on the extension icon and see the list of formatted links to be copied.</p>
        <img src="./screenshot.png" />
    </section>
`;

const Footer = () => `
    <hr>
    <footer class="footer-hr">
        <a href="https://github.com/kugurerdem/quick-link-github/" target="_blank" class="footer-title">Quick Link GitHub</a>
        <button class="clear-history">Clear history</button>
    </footer>
`;

const CopyFromThisPage = (currentPage) => {
    const { pageHeader, pageIndex, pageUrl } = currentPage;
    const longCopyText = `${pageHeader} #${pageIndex}`;
    const shortCopyText = `#${pageIndex}`;
    const titleOnlyCopyText = pageHeader;

    const contributions = [longCopyText, titleOnlyCopyText, shortCopyText]
        .map((t) => Contribution({ pageInfoText: t, pageUrl }, 'current'))
        .join('');

    return `
        <section>
            <h2>Copy from this page</h2>
            <hr>
            <ul>
                ${contributions}
            </ul>
        </section>
    `;
};

const PreviouslyCopied = (recentCopies) => `
    <section>
        <h2>Previously copied</h2>
        <hr>
        ${
            recentCopies.length > 0
                ? `<ol>${recentCopies.map((c) => Contribution(c, 'previous')).join('')}</ol>`
                : '<p class="no-history-message">No items copied yet. GitHub links you copy using the extension will appear here.</p>'
        }
    </section>
    `;

const Contribution = (
    { pageInfoText, pageUrl, repoName, pageType },
    section,
) => {
    const contributionId = escapeHTML(`${pageInfoText}-${pageUrl}`);
    const id = `${section}-${contributionId}`;

    /**
     * Return the icon for the contribution based on the page type.
     *
     * We don't need to show the icon for the current page, it should be very
     * obvious if the user has a PR or an issue page open. But we need to
     * show the icon for the previously copied contributions, as it's
     * difficult to tell if the item is a PR or an issue.
     */
    function icon() {
        if (section === 'current') {
            return '';
        }

        const icon = pageType == 'issue' ? IssueSvg : PrSvg;

        return '<span class="contribution-icon">' + icon + '</span>';
    }

    const isRecentlyCopied =
        state.recentCopyId && state.recentCopyId.startsWith(id);
    const copiedType = isRecentlyCopied
        ? state.recentCopyId.split('__')[1]
        : null;

    const createBtn = (type, label, icon, tooltip) => `
        <button class="copy-button"
            data-id="${id}"
            data-type="${type}"
            title="${tooltip}"
            ${isRecentlyCopied ? 'disabled' : ''}
        >
            ${copiedType === type ? CheckSvg : icon}
        </button>
    `;

    return `
        <li
            id="page-item-${id}"
            class="contribution"
            data-page-url="${escapeHTML(pageUrl)}"
            data-info-text="${escapeHTML(pageInfoText)}"
            data-section="${section}"
        >
            <div class="contribution-info">
                ${icon()}
                <a href="${pageUrl}" class="contribution-link" target="_blank">
                    ${escapeHTML(pageInfoText)}
                    ${
                        repoName
                            ? `<span class="contribution-repo">${escapeHTML(repoName)}</span>`
                            : ''
                    }
                </a>
            </div>
            <div class="contribution-actions">
                ${createBtn('md', 'MD', MarkdownSvg, 'Copy as Markdown')}
                ${createBtn('slack', 'Slack', SlackSvg, 'Copy for Slack')}
                ${createBtn('docs', 'Docs', DocsSvg, 'Copy for Google Docs')}
            </div>
        </li>
    `;
};

const setListeners = () => {
    document
        .querySelectorAll('.copy-button')
        .forEach((button) => button.addEventListener('click', onCopyClick));

    document
        .querySelector('.clear-history')
        .addEventListener('click', onClearHistoryClick);
};

const onCopyClick = (e) => {
    const button = e.currentTarget;
    const id = button.getAttribute('data-id');
    const type = button.getAttribute('data-type');
    const fullId = `${id}__${type}`;

    const pageItem = document.getElementById(`page-item-${id}`);
    const pageUrl = unescapeHTML(pageItem.getAttribute('data-page-url'));
    const pageInfoText = unescapeHTML(pageItem.getAttribute('data-info-text'));

    let textToCopy = '';
    let htmlToCopy = null;

    if (type === 'md') {
        textToCopy = `[${pageInfoText}](${pageUrl})`;
    } else if (type === 'slack') {
        textToCopy = `<${pageUrl}|${pageInfoText}>`;
    } else if (type === 'docs') {
        textToCopy = `${pageInfoText}`;
        htmlToCopy = `<a href="${pageUrl}">${pageInfoText}</a>`;
    }

    copyToClipboard(textToCopy, htmlToCopy);

    state.recentCopyId = fullId;
    setTimeout(() => {
        state.recentCopyId = null;
        render();
    }, 1000);

    render();

    const [section, ...restOfTheId] = id.split('-');
    const contributionId = restOfTheId.join('-');

    if (!state.recentCopies.some((p) => p.contributionId == contributionId)) {
        state.recentCopies.push({
            contributionId,
            pageInfoText,
            ...state.currentPage,
        });
    }

    const index = state.recentCopies.findIndex(
        (p) => p.contributionId == contributionId,
    );

    state.recentCopies.unshift(...state.recentCopies.splice(index, 1));

    state.recentCopies = state.recentCopies.slice(
        0,
        state.recentCopiesMaxLength,
    );

    chrome.storage.local.set({ recentCopies: state.recentCopies });
};

const onClearHistoryClick = () => {
    state.recentCopies = [];
    chrome.storage.local.set({ recentCopies: state.recentCopies });
    render();
};

const copyToClipboard = (text, html) => {
    const listener = (e) => {
        e.clipboardData.setData('text/plain', text);
        if (html) {
            e.clipboardData.setData('text/html', html);
        }
        e.preventDefault();
    };
    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
};

const escapeHTML = (str) => {
    // ^ https://stackoverflow.com/a/7382028
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const unescapeHTML = (str) => {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
};

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

const CheckSvg = `
    <svg width="12" height="12" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.2225 1.24213C17.6968 1.73041 17.6968 2.52338 17.2225 3.01166L7.50822 13.0117C7.03389 13.4999 6.26358 13.4999 5.78925 13.0117L0.932103 8.01166C0.457772 7.52338 0.457772 6.73041 0.932103 6.24213C1.40643 5.75385 2.17675 5.75385 2.65108 6.24213L6.65063 10.3554L15.5073 1.24213C15.9817 0.753845 16.752 0.753845 17.2263 1.24213H17.2225Z" fill="#1F883D"/>
    </svg>
`;

const MarkdownSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 640 512" fill="currentColor">
        <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
        <path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.1V105.2c0-25.4-20.8-46.1-46.3-46.1zM338.5 360.6H277v-120l-61.5 76.9-61.5-76.9v120H92.3V151.4h61.5l61.5 76.9 61.5-76.9h61.5v209.2zm135.3 3.1L381.5 256H446V151.4h61.5V256h64.5l-92.3 107.7z"/>
    </svg>
`;

const SlackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 448 512" fill="currentColor">
        <!-- Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
        <path d="M94.12 315.1c0 25.9-21.16 47.06-47.06 47.06S0 341 0 315.1c0-25.9 21.16-47.06 47.06-47.06h47.06v47.06zm23.72 0c0-25.9 21.16-47.06 47.06-47.06s47.06 21.16 47.06 47.06v117.84c0 25.9-21.16 47.06-47.06 47.06s-47.06-21.16-47.06-47.06V315.1zm47.06-188.98c-25.9 0-47.06-21.16-47.06-47.06S139 32 164.9 32s47.06 21.16 47.06 47.06v47.06H164.9zm0 23.72c25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06H47.06C21.16 243.96 0 222.8 0 196.9s21.16-47.06 47.06-47.06H164.9zm188.98 47.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06h-47.06V196.9zm-23.72 0c0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06V79.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06V196.9zM283.1 385.88c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06v-47.06h47.06zm0-23.72c-25.9 0-47.06-21.16-47.06-47.06 0-25.9 21.16-47.06 47.06-47.06h117.84c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06H283.1z"/>
    </svg>
`;

const DocsSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 384 512" fill="currentColor">
        <!-- Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. -->
        <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z"/>
    </svg>
`;

document.addEventListener('DOMContentLoaded', init);
