export async function createPost(
  text: string,
  accessToken: string
) {
  if (!accessToken) {
    throw new Error("X access token is missing");
  }

  const response = await fetch(
    "https://api.x.com/2/tweets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.title ||
        "X API request failed"
    );
  }

  return data;
}