![yt-vod-reviewer logo.](https://github.com/exquilibrium/yt-vod-reviewer-extension/blob/main/vod-reviewer.png)
# YouTube VOD Reviewer Extension

A lightweight browser extension for **VOD reviewing on YouTube**.

It lets you load a plain `.txt` file containing timestamps, notes, and sections, and displays them in a **custom side panel**—similar to YouTube’s transcript.

![yt-vod-reviewer preview.](https://github.com/exquilibrium/yt-vod-reviewer-extension/blob/main/ytvre-preview.png)

---

## Expected file format

The input file is a **plain text file (`.txt`)** using following indicators at the **start of a new line**. See `example.txt`.

---

### Sections (`#`)

Group related notes with `#`.

```txt
# Early Game
```

---

### Info boxes (`!-`)

Use  `!-` for info boxes, i.e. notes **without a timestamp**.

```txt
!- General reminder:
Crosshair placement is low overall in this section.
```

---

### Timestamp (`MM:SS - ` or `HH:MM:SS - `)

Create timestamped notes with:
* `MM:SS - `
* `HH:MM:SS - `

(Whitespace around the dash is optional.)

Any lines **after a timestamp or info marker** belong to that note until a new marker appears.

---

### Timestamp Range (`MM:SS - MM:SS - ` or `HH:MM:SS - HH:MM:SS - `)

Create notes for timestamp ranges.
* `MM:SS - MM:SS - `
* `HH:MM:SS - HH:MM:SS - `

(Whitespace around the dash is optional.)

Playback starts at the first timestamp and automatically pauses at the second timestamp.

This can be disabled in the menu under "Auto pause timestamp range".

---

List of supported dashes:

| Char | Name                |
| ---- | ------------------- |
| `-`  | Hyphen-minus        |
| `‐`  | Hyphen              |
| `-`  | Non-breaking hyphen |
| `‒`  | Figure dash         |
| `–`  | En dash             |
| `—`  | Em dash             |
| `―`  | Horizontal bar      |
| `−`  | Minus sign          |


---

## Extension menu options

When the extension is pinned in the browser toolbar:

* **Show window**

  * Immediately shows the VOD Review Panel on the current YouTube video.
* **Auto show window**

  * When enabled, the panel automatically appears on YouTube watch pages.

* **Auto pause timestamp range**

  * When enabled, the notes with a timestamp range automatically pause at the end of the timestamp.

Settings are stored locally.


