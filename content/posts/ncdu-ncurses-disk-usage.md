---
title: Ncdu - NCurses Disk Usage
date: 2025-12-23
slug: ncdu-ncurses-disk-usage
tags: [linux, notes]
description: ncdu is a command-line disk usage analyzer with an ncurses interface.
---

**ncdu** is a command-line disk usage analyzer with an ncurses interface. It provides a fast, interactive way to visualize which directories and files are consuming your storage space, allowing you to easily find and delete "space hogs."

## Installation (Arch Linux)

Open your terminal and run:

```bash
sudo pacman -S ncdu
```

## How to Use It

### Start the Scanner

Run ncdu to scan the current directory, or specify a path:

```bash
ncdu              # Scans current directory
ncdu /home/user   # Scans a specific folder
ncdu -x /         # Scans the entire root system (ignores mounted drives)
```

### Navigate

Arrow Keys (or k/j): Move up and down. 

Enter (or l): Open selected directory.

Backspace (or h): Go back/up a directory.

### Manage Files
d: Delete the selected file or directory (asks for confirmation).

n: Sort by name.

s: Sort by size.

### Export & Import Results
You can save a scan to a file (useful for remote servers) and view it later without rescanning.

- Export to file:
```bash
ncdu -o scan_results.json /path/to/scan
```

- View from file:
```bash
ncdu -f scan_results.json
```

### Quit
Press q to exit.


