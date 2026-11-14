#!/bin/bash
# Auto push and merge, run by the post-commit, post-merge and post-rewrite hooks.
#
# After every commit (or merge, rebase, amend) on a branch:
#   1. push that branch to GitHub (origin);
#   2. if main can fast-forward to it, move main there (in whichever folder has
#      main checked out, and only if that folder has no uncommitted changes),
#      then push main.
# Branches named wip/... or wip-... are pushed but never merged.
# To skip it for one command: BOTN_NO_SYNC=1 git commit ...
# Everything it does is logged to .git/autosync.log.

[ -n "$BOTN_NO_SYNC" ] && exit 0
branch=$(git symbolic-ref --quiet --short HEAD) || exit 0   # detached (mid-rebase): nothing to do
git remote get-url origin >/dev/null 2>&1 || exit 0
log="$(git rev-parse --path-format=absolute --git-common-dir)/autosync.log"
head=$(git rev-parse HEAD)

(
  unset $(git rev-parse --local-env-vars)
  echo "== $(date '+%F %T') $branch $(git rev-parse --short "$head") ($1)"

  if [ "$branch" = main ]; then
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

  # Where is main checked out?
  dir=$(git worktree list --porcelain | awk '/^worktree /{w=substr($0,10)} /^branch refs\/heads\/main$/{print w}')
  if [ -n "$dir" ]; then
    if [ -n "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then
      echo "main folder has uncommitted changes: main not moved"
      exit 0
    fi
    BOTN_NO_SYNC=1 git -C "$dir" merge -q --ff-only "$head" ||{ echo "fast-forward of main failed"; exit 0; }
  else
    git update-ref refs/heads/main "$head" "$main" || exit 0
  fi
  echo "main -> $(git rev-parse --short "$head")"
  git push -q origin main && echo "pushed main"
) >>"$log" 2>&1 </dev/null &
exit 0
