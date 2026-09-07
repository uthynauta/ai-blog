import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import config from "@/config";

type GetSortedPostsOptions = {
  includeTranslations?: boolean;
  language?: string;
};

/**
 * Returns posts that are eligible to be shown to users, sorted by “last updated”
 * descending (uses `modDatetime` when present, otherwise `pubDatetime`).
 *
 * Note: filtering respects drafts and scheduled posts via `postFilter()`.
 */
export function getSortedPosts(
  posts: CollectionEntry<"posts">[],
  options: GetSortedPostsOptions = {}
) {
  const language = options.language ?? config.site.lang;
  return posts
    .filter(postFilter)
    .filter(
      post =>
        options.includeTranslations ||
        (post.data.language ?? config.site.lang) === language
    )
    .sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );
}
