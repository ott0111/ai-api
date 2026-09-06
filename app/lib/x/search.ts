export type XSearchAuthor = {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string | null;
};

export type XSearchPost = {
  tweetId: string;
  text: string;
  authorId: string;
  author: XSearchAuthor;
  createdAt?: string | null;
  publicMetrics?: Record<string, number | string> | null;
};

export async function searchXPosts(
  accessToken: string,
  keyword: string
): Promise<XSearchPost[]> {
  if (!accessToken) {
    throw new Error("X access token is missing");
  }

  const query = keyword.trim();

  if (!query) {
    throw new Error("Keyword is required");
  }

  const params = new URLSearchParams({
    query: `${query} -is:retweet -is:reply`,
    max_results: "10",
    "tweet.fields": "author_id,created_at,public_metrics,text",
    "user.fields": "id,name,username,profile_image_url",
    expansions: "author_id",
  });

  const response = await fetch(
    `https://api.x.com/2/tweets/search/recent?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.title ||
        "X search request failed"
    );
  }

  type SearchUser = {
    id?: string;
    username?: string;
    name?: string;
    profile_image_url?: string | null;
  };

  const users = new Map<string, SearchUser>(
    (data?.includes?.users ?? []).map((user: SearchUser) => [
      String(user.id ?? ""),
      user,
    ])
  );

  return (data?.data ?? [])
    .map((tweet: Record<string, any>) => {
      const author = users.get(String(tweet.author_id ?? "")) ?? {};
      const text = String(tweet.text ?? "").trim();

      if (!text || !tweet.author_id) {
        return null;
      }

      return {
        tweetId: String(tweet.id ?? ""),
        text,
        authorId: String(tweet.author_id),
        author: {
          id: String(author.id ?? tweet.author_id ?? ""),
          username: String(author.username ?? ""),
          name: String(author.name ?? ""),
          profileImageUrl:
            typeof author.profile_image_url === "string"
              ? author.profile_image_url
              : null,
        },
        createdAt:
          typeof tweet.created_at === "string"
            ? tweet.created_at
            : null,
        publicMetrics:
          tweet.public_metrics &&
          typeof tweet.public_metrics === "object"
            ? tweet.public_metrics
            : null,
      };
    })
    .filter(Boolean) as XSearchPost[];
}
