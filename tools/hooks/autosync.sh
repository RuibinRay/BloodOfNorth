#!/bin/bash
# Auto push and merge, run by the post-commit, post-merge and post-rewrite hooks.
#
# After every commit (or merge, rebase, amend) on a branch:
#   1. push that branch to GitHub (origin);
#   2. if main can fast-forward to it: run the quick check on that exact commit (a copy of it in
#      .git/autosync-check, so nothing uncommitted in a working folder counts), and only if it
#      passes, move main there (in whichever folder has main checked out, and only if that folder has
#      no uncommitted changes) and push main, which puts it on the website.
# A commit made on main itself is checked the same way before main is pushed.
# The check is tried twice before it counts as failed (one slow page should not block a merge).
# When it fails, main stays where it was, a notification says so, and the check's output is kept in
# .git/autosync-failed.log.
# Branches named wip/... or wip-... are pushed but never merged.
# To skip all of it for one command: BOTN_NO_SYNC=1 git commit ...
# To skip only the check:            BOTN_NO_CHECK=1 git commit ...
# Everything it does is logged to .git/autosync.log.

[ -n "$BOTN_NO_SYNC" ] && exit 0
branch=$(git symbolic-ref --quiet --short HEAD) || exit 0   # detached (mid-rebase): nothing to do
git remote get-url origin >/dev/null 2>&1 || exit 0
common="$(git rev-parse --path-format=absolute --git-common-dir)"
log="$common/autosync.log"
head=$(git rev-parse HEAD)
skipcheck="$BOTN_NO_CHECK"

notify() { osascript -e "display notification \"$1\" with title \"Blood of the North\"" >/dev/null 2>&1 || true; }

# The quick check on commit $1, in a copy of it. 0 if it passed.
check() {
  [ -n "$skipcheck" ] && { echo "check skipped (BOTN_NO_CHECK)"; return 0; }
  local short dir out try
  short=$(git rev-parse --short "$1"); dir="$common/autosync-check/$short"; out="$dir.log"
  rm -rf "$dir"; mkdir -p "$dir"
  git archive "$1" | tar -x -C "$dir" || { echo "could not copy $short to check it"; return 1; }
  for try in 1 2; do
    echo "checking $short (npm run check -- --quick, try $try)"
    if (cd "$dir" && node tools/check.mjs --quick >"$out" 2>&1); then
      echo "check passed: $(grep -E 'All passed' "$out" | tail -1)"; rm -rf "$dir" "$out"; return 0
    fi
  done
  grep -E 'FAIL' "$out" | head -6
  mv -f "$out" "$common/autosync-failed.log"; rm -rf "$dir"
  notify "The quick check failed on $short: main was not moved. See .git/autosync-failed.log"
  return 1
}

(
  unset $(git rev-parse --local-env-vars)
  echo "== $(date '+%F %T') $branch $(git rev-parse --short "$head") ($1)"

  if [ "$branch" = main ]; then
    check "$head" || { echo "main not pushed"; exit 0; }
    git push -q origin main && echo "pushed main"
    exit 0
  fi

  git push -q --force-with-lease origin "$branch:refs/heads/$branch" && echo "pushed $branch"

  case "$branch" in wip/* | wip-*) echo "wip branch: not merged"; exit 0 ;; esac
  main=$(git rev-parse -q --verify refs/heads/main) || exit 0
  [ "$main" = "$head" ] && exit 0
  if ! git merge-base --is-ancestor "$main" "$head"; then
    echo "main has moved on: rebase $branch onto main to have it merged"
    exit 0
  fi

  check "$head" || { echo "main not moved"; exit 0; }

  # main may have moved while the check ran
  main=$(git rev-parse -q --verify refs/heads/main) || exit 0
  [ "$main" = "$head" ] && exit 0
  if ! git merge-base --is-ancestor "$main" "$head"; then
    echo "main moved on during the check: rebase $branch onto main to have it merged"
    exit 0
  fi

  # Where is main checked out?
  dir=$(git worktree list --porcelain | awk '/^worktree /{w=substr($0,10)} /^branch refs\/heads\/main$/{print w}')
  if [ -n "$dir" ]; then
    if [ -n "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then
      echo "main folder has uncommitted changes: main not moved"
      exit 0
    fi
    BOTN_NO_SYNC=1 git -C "$dir" merge -q --ff-only "$head" || { echo "fast-forward of main failed"; exit 0; }
  else
    git update-ref refs/heads/main "$head" "$main" || exit 0
  fi
  echo "main -> $(git rev-parse --short "$head")"
  git push -q origin main && echo "pushed main"
) >>"$log" 2>&1 </dev/null &
exit 0
