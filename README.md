# YouTube VOD Reviewer Extension

A lightweight browser extension for **VOD reviewing on YouTube**.

It lets you load a plain `.txt` file containing timestamps, notes, and sections, and displays them in a **custom side panel**—similar to YouTube’s transcript.

---

## Expected file format

The input file is a **plain text file (`.txt`)** with the following markers.

---

### Sections (`# `)

Group related notes with `# ` (hash + space).

```txt
# Early Game
```

---

### Info boxes (`!- `)

Use  `!- ` for info boxes, i.e. notes **without a timestamp**.

```txt
!- General reminder:
Crosshair placement is low overall in this section.
```

---

### Timestamp (`MM:SS - ` or `HH:MM:SS - `)

Create timestamped notes (using hyphens) with:
* `MM:SS - `
* `HH:MM:SS - `

Any lines **after a timestamp or info marker** belong to that note until a new marker appears.

```txt
0:42 - First fight
You overpeek here.
Try hugging the left wall instead.

Also audio cue was audible.
```

---

## Extension menu options

When the extension is pinned in the browser toolbar:

* **Show window**

  * Immediately shows the VOD Review Panel on the current YouTube video
* **Auto show**

  * When enabled, the panel automatically appears on YouTube watch pages

Settings are stored locally.


