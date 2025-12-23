#!/bin/bash

# Usage: ./new-post.sh "Your Post Title"

if [ -z "$1" ]; then
  echo "Usage: ./new-post.sh \"Post Title\""
  exit 1
fi

title="$1"
date=$(date +%Y-%m-%d)
slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
file="content/posts/${slug}.md"

if [ -f "$file" ]; then
  echo "File already exists: $file"
  exit 1
fi

cat > "$file" << EOF
---
title: ${title}
date: ${date}
slug: ${slug}
tags: [linux]
description:
---

EOF

echo "Created: $file"
