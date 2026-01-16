(() => {
    const ROOT_ID = "vodReviewRoot";
    const STORAGE_KEY = "vodReviewNotes_v1";

    // --- Utilities ---
    function showPanel() {
        createUI(); // ensures it exists
        const root = document.getElementById("vodReviewRoot");
        if (root) root.style.display = "block";
    }


    // Timestamp lines:
    //   0:42 - comment
    //   05:42 — comment
    //   1:02:14 – comment
    const TIMESTAMP_LINE_RE = /^(\d+:\d{1,2}(?::\d{2})?)\s\-\s(.*)$/;

    // Section line:
    //   # Section Name
    const SECTION_LINE_RE = /^#\s(.+)\s*$/;

    // Info box line:
    //   !- comment
    // (You asked specifically for "!-")
    const INFO_LINE_RE = /^!\-\s(.*)$/;

    function parseTimestampToSeconds(ts) {
        // Allowed formats:
        //   MM:SS   (SS can be 1–2 digits, e.g., 0:42)
        //   HH:MM:SS
        const parts = ts.trim().split(":");

        if (parts.length !== 2 && parts.length !== 3) return null;

        const nums = parts.map((p) => Number(p));
        for (const n of nums) {
            if (!Number.isFinite(n)) return null;
        }

        if (nums.length === 2) {
            const [mm, ss] = nums;
            if (ss < 0 || ss > 59) return null;
            return mm * 60 + ss;
        }

        const [hh, mm, ss] = nums;
        if (mm < 0 || mm > 59) return null;
        if (ss < 0 || ss > 59) return null;
        return hh * 3600 + mm * 60 + ss;
    }

    function createEmptySection(name) {
        return {
            name,
            items: [],     // each item is { type: "timestamp"|"info", ... }
            collapsed: false
        };
    }

    function finalizeOpenItem(openItem) {
        if (!openItem) return null;

        // Join multiline lines into a single block
        // Keep blank lines as paragraph separators
        const text = openItem.lines.join("\n").trim();

        // If the box ended up empty, still allow it (optional)
        openItem.comment = text;

        delete openItem.lines;
        return openItem;
    }

    function parseNotes(text) {
        const rawLines = text.split(/\r?\n/);

        const sections = [];
        let currentSection = createEmptySection("Notes");
        sections.push(currentSection);

        let openItem = null;

        function pushOpenItem() {
            const done = finalizeOpenItem(openItem);
            if (done) currentSection.items.push(done);
            openItem = null;
        }

        for (const raw of rawLines) {
            const line = raw.replace(/\t/g, "  "); // optional: normalize tabs

            // Section marker
            const secMatch = line.trim().match(SECTION_LINE_RE);
            if (secMatch) {
                pushOpenItem();

                currentSection = createEmptySection(secMatch[1].trim());
                sections.push(currentSection);
                continue;
            }

            // Timestamp marker
            const tsMatch = line.trim().match(TIMESTAMP_LINE_RE);
            if (tsMatch) {
                const tsRaw = tsMatch[1].trim();
                const seconds = parseTimestampToSeconds(tsRaw);

                // If it's not a valid timestamp, treat as normal text line
                if (seconds == null) {
                    if (!openItem) {
                        // If nothing is open, start an info box implicitly (optional behavior)
                        openItem = { type: "info", title: "", lines: [] };
                    }
                    openItem.lines.push(line);
                    continue;
                }

                pushOpenItem();

                const headerText = (tsMatch[2] || "").trim();

                openItem = {
                    type: "timestamp",
                    ts: tsRaw,
                    seconds,
                    title: headerText,   // the first-line comment right after the dash
                    lines: []            // multiline continuation lines
                };

                continue;
            }

            // Info marker
            const infoMatch = line.trim().match(INFO_LINE_RE);
            if (infoMatch) {
                pushOpenItem();

                const headerText = (infoMatch[1] || "").trim();
                openItem = {
                    type: "info",
                    title: headerText,
                    lines: []
                };

                continue;
            }

            // Normal line: belongs to the currently open item
            if (!openItem) {
                // If no item is open yet, start an info box automatically
                openItem = {
                    type: "info",
                    title: "",
                    lines: []
                };
            }

            // Preserve blank lines as paragraph breaks
            openItem.lines.push(line);
        }

        // Flush the last open item
        pushOpenItem();

        return sections;
    }


    function getVideoEl() {
        // Usually exists on watch pages. Might be replaced during navigation.
        return document.querySelector("video.html5-main-video") || document.querySelector("video");
    }

    function seekTo(seconds) {
        const video = getVideoEl();
        if (!video) return false;

        video.currentTime = seconds;

        //video.pause();

        return true;
    }


    function loadFromStorage(cb) {
        chrome.storage.local.get(["vodReviewNotes_v1"], (res) => {
            // If the extension context is invalid, Chrome sets runtime.lastError
            if (chrome.runtime.lastError) {
                cb(null);
                return;
            }
            cb(res["vodReviewNotes_v1"] || null);
        });
    }


    function saveToStorage(data) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [STORAGE_KEY]: data }, () => resolve());
        });
    }

    // --- UI creation ---
    function createUI() {
        if (document.getElementById(ROOT_ID)) return;

        const root = document.createElement("div");
        root.id = ROOT_ID;

        root.innerHTML = `
      <div id="vodReviewHeader">
        <h3>VOD Review Notes</h3>
        <div id="vodReviewControls">
          <button class="vodBtn" id="vodLoadBtn">Load .txt</button>
          <button class="vodBtn" id="vodClearBtn" title="Clear stored notes">Clear</button>
          <button class="vodBtn" id="vodHideBtn" title="Hide panel">✕</button>
          <input id="vodFileInput" type="file" accept=".txt" style="display:none" />
        </div>
      </div>
      <div id="vodReviewBody">
        <div id="vodReviewHint">
          Format:
            <ul style="padding-left: 1.5em; list-style-position: outside;">
                <li>Section: <code>'# '</code></li>
                <li>Info Box: <code>'!- '</code></li>
                <li>Timestamp: <code>'MM:SS - '</code></li>
                <li>Timestamp: <code>'HH:MM:SS - '</code></li>
            </ul>
        </div>
        <div id="vodList"></div>
      </div>
      <div id="vodReviewFooter">
        <span style="font-size:12px;opacity:0.75" id="vodStatus">No notes loaded.</span>
        <button class="vodBtn" id="vodReloadBtn" title="Re-render after YouTube navigation">Refresh</button>
      </div>
    `;

        document.body.appendChild(root);

        // Toggle panel visibility
        function setVisible(v) {
            root.style.display = v ? "block" : "none";
        }
        setVisible(false);

        root.querySelector("#vodHideBtn").addEventListener("click", () => setVisible(false));

        const fileInput = root.querySelector("#vodFileInput");
        root.querySelector("#vodLoadBtn").addEventListener("click", () => fileInput.click());

        root.querySelector("#vodReloadBtn").addEventListener("click", () => {
            // no-op; re-render uses stored data
            renderFromStored();
        });

        root.querySelector("#vodClearBtn").addEventListener("click", async () => {
            await saveToStorage(null);
            renderSections([]);
            setStatus("Cleared notes.");
        });

        fileInput.addEventListener("change", async () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            const text = await file.text();
            const sections = parseNotes(text);
            await saveToStorage({
                videoId: new URL(location.href).searchParams.get("v"),
                sections
            });
            renderSections(sections);
            setStatus(`Loaded notes.`);
            fileInput.value = "";
        });

        const listEl = root.querySelector("#vodList");
        const statusEl = root.querySelector("#vodStatus");

        function setStatus(msg) {
            statusEl.textContent = msg;
        }

        function renderSections(sections) {
            const listEl = document.querySelector("#vodList");
            listEl.innerHTML = "";

            if (!sections || sections.length === 0) {
                listEl.textContent = "No entries. Load a .txt file.";
                return;
            }

            for (const section of sections) {
                // Header (click to collapse)
                const header = document.createElement("div");
                header.className = "vodSectionHeader";

                const title = document.createElement("div");
                title.className = "vodSectionTitle";
                title.textContent = section.name || "Untitled";

                const meta = document.createElement("div");
                meta.className = "vodSectionMeta";
                meta.textContent = section.collapsed ? "▶" : "▼";

                header.appendChild(title);
                header.appendChild(meta);

                listEl.appendChild(header);

                // Container for section items
                const container = document.createElement("div");
                container.style.marginBottom = "10px";
                listEl.appendChild(container);

                function renderSectionItems() {
                    container.innerHTML = "";
                    if (section.collapsed) return;

                    for (const item of section.items) {
                        const card = document.createElement("div");
                        card.className = "vodItem";

                        if (item.type === "info") {
                            card.classList.add("vodItemInfo");
                        }

                        // Top line
                        const top = document.createElement("div");
                        top.className = "vodTime";

                        if (item.type === "timestamp") {
                            top.textContent = item.ts;
                        } else {
                            top.textContent = "Info";
                        }

                        // Body text
                        const body = document.createElement("div");
                        body.className = "vodComment";

                        // Compose: title line + multiline comment block
                        let text = "";
                        if (item.title) text += item.title;
                        if (item.comment) {
                            if (text.length > 0) text += "\n";
                            text += item.comment;
                        }
                        body.textContent = text.trim();

                        card.appendChild(top);
                        card.appendChild(body);

                        if (item.type === "timestamp") {
                            card.style.cursor = "pointer";
                            card.addEventListener("click", () => {
                                const ok = seekTo(item.seconds);
                                if (!ok) setStatus("Couldn’t find the video element yet. Try Refresh.");
                            });
                        } else {
                            card.style.cursor = "default";
                        }

                        container.appendChild(card);
                    }
                }

                // Toggle collapse on click
                header.addEventListener("click", () => {
                    section.collapsed = !section.collapsed;
                    meta.textContent = section.collapsed ? "▶" : "▼";
                    renderSectionItems();
                });

                renderSectionItems();
            }
        }

        function renderFromStored() {
            loadFromStorage((stored) => {
                // If the content script was torn down, just stop
                if (!stored || !stored.sections) {
                    renderSections([]);
                    setStatus("No notes loaded.");
                    return;
                }

                const currentVid = new URL(location.href).searchParams.get("v");

                if (stored.videoId && stored.videoId !== currentVid) {
                    renderSections([]);
                    setStatus("Notes exist, but for a different video.");
                    return;
                }

                renderSections(stored.sections);
                const count = stored.sections.reduce((acc, s) => acc + (s.items?.length || 0), 0);
                setStatus(`Loaded ${count} notes.`);
            });
        }


        // Initial render
        renderFromStored();

    }

    // --- YouTube is a SPA, so watch navigation changes ---
    function hookSpaNavigation() {
        let lastUrl = location.href;

        const observer = new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                // When navigating to a new watch page, ensure UI exists and re-render
                if (url.includes("/watch")) {
                    createUI();
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Boot
    createUI();
    hookSpaNavigation();


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || !message.type) return;

        if (message.type === "SHOW_WINDOW") {
            showPanel();
            sendResponse({ ok: true });
            return;
        }

        if (message.type === "SET_AUTO_SHOW") {
            // Content script doesn't need to store it (popup stores),
            // but we can reflect it if you want future behavior in-page.
            sendResponse({ ok: true });
            return;
        }
    });

})();
