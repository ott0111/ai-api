"use client";

import { useEffect, useMemo, useState } from "react";

const MAX_LENGTH = 280;

type XUser = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
};

type AutoCommentOpportunity = {
  tweetId: string;
  text: string;
  author: {
    id: string;
    username: string;
    name: string;
    profileImageUrl?: string | null;
  };
  suggestedReply: string;
  editing?: boolean;
  posted?: boolean;
  posting?: boolean;
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [post, setPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [commentKeyword, setCommentKeyword] = useState("AI");
  const [commentInstructions, setCommentInstructions] = useState(
    "Casual and insightful"
  );
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentMessageType, setCommentMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [opportunities, setOpportunities] = useState<
    AutoCommentOpportunity[]
  >([]);

  const [xUser, setXUser] = useState<XUser | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const characterCount = post.length;
  const overLimit = characterCount > MAX_LENGTH;

  const canGenerate = topic.trim().length > 0 && !loading;

  const canPublish =
    post.trim().length > 0 &&
    !publishing &&
    !overLimit &&
    !!xUser;

  const statusLabel = useMemo(() => {
    if (loading) return "Writing...";
    if (publishing) return "Publishing...";
    if (xUser) return "Connected";
    return "Ready";
  }, [loading, publishing, xUser]);

  useEffect(() => {
    async function checkXConnection() {
      try {
        const response = await fetch("/api/x/status", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          setXUser(null);
          return;
        }

        const data = await response.json();

        if (data?.connected && data?.user) {
          setXUser(data.user);
        } else {
          setXUser(null);
        }
      } catch {
        setXUser(null);
      } finally {
        setCheckingConnection(false);
      }
    }

    checkXConnection();
  }, []);

  async function generate() {
    if (!topic.trim()) return;

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to generate post."
        );
      }

      setPost(data.post || "");
      setMessage("Draft generated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!post.trim() || overLimit || !xUser) return;

    setPublishing(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/x/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: post.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to publish. Make sure your X account is connected."
        );
      }

      setMessage("Published to X successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while publishing."
      );
      setMessageType("error");
    } finally {
      setPublishing(false);
    }
  }

  function regenerate() {
    if (!topic.trim() || loading) return;
    generate();
  }

  async function findOpportunities() {
    if (!xUser) {
      setCommentMessage(
        "Connect your X account before searching for comment opportunities."
      );
      setCommentMessageType("error");
      return;
    }

    if (!commentKeyword.trim()) {
      setCommentMessage("Enter a keyword to search for posts.");
      setCommentMessageType("error");
      return;
    }

    setCommentLoading(true);
    setCommentMessage("");
    setCommentMessageType("");

    try {
      const response = await fetch("/api/x/auto-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: commentKeyword.trim(),
          instructions:
            commentInstructions.trim() || "Casual and insightful",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not find comment opportunities."
        );
      }

      const matches = Array.isArray(data?.opportunities)
        ? data.opportunities
        : [];

      setOpportunities(matches);

      if (matches.length === 0) {
        setCommentMessage(
          "No relevant public posts were found for that keyword."
        );
        setCommentMessageType("success");
      }
    } catch (error) {
      setCommentMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while finding opportunities."
      );
      setCommentMessageType("error");
    } finally {
      setCommentLoading(false);
    }
  }

  async function postReply(opportunity: AutoCommentOpportunity) {
    if (!xUser || !opportunity.tweetId) return;

    setOpportunities((current) =>
      current.map((item) =>
        item.tweetId === opportunity.tweetId
          ? { ...item, posting: true }
          : item
      )
    );

    try {
      const response = await fetch("/api/x/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tweetId: opportunity.tweetId,
          text: opportunity.suggestedReply.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Reply could not be published."
        );
      }

      setOpportunities((current) =>
        current.map((item) =>
          item.tweetId === opportunity.tweetId
            ? {
                ...item,
                posting: false,
                posted: true,
                editing: false,
              }
            : item
        )
      );

      setCommentMessage(
        `Reply posted to @${opportunity.author.username}.`
      );
      setCommentMessageType("success");
    } catch (error) {
      setOpportunities((current) =>
        current.map((item) =>
          item.tweetId === opportunity.tweetId
            ? { ...item, posting: false }
            : item
        )
      );

      setCommentMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting the reply."
      );
      setCommentMessageType("error");
    }
  }

  function updateOpportunityReply(
    tweetId: string,
    nextText: string
  ) {
    setOpportunities((current) =>
      current.map((item) =>
        item.tweetId === tweetId
          ? { ...item, suggestedReply: nextText }
          : item
      )
    );
  }

  function skipOpportunity(tweetId: string) {
    setOpportunities((current) =>
      current.filter((item) => item.tweetId !== tweetId)
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">X</div>

          <div>
            <div className="brand-name">Autopilot</div>
            <div className="brand-subtitle">
              AI writing assistant
            </div>
          </div>
        </div>

        {checkingConnection ? (
          <div className="connect-button">
            <span className="connect-dot" />
            Checking...
          </div>
        ) : xUser ? (
          <div className="account-button">
            {xUser.profile_image_url ? (
              <img
                src={xUser.profile_image_url}
                alt={`${xUser.name}'s X profile`}
                className="account-avatar"
              />
            ) : (
              <div className="account-avatar account-avatar-fallback">
                {xUser.name?.charAt(0)?.toUpperCase() || "X"}
              </div>
            )}

            <div className="account-info">
              <div className="account-name">
                {xUser.name}
              </div>

              <div className="account-username">
                @{xUser.username}
              </div>
            </div>

            <span className="connected-indicator">
              <span className="connected-dot" />
              Connected
            </span>
          </div>
        ) : (
          <a
            href="/api/x/auth"
            className="connect-button"
          >
            <span className="connect-dot" />
            Connect X
          </a>
        )}
      </header>

      <div className="dashboard">
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              X AUTOPILOT
            </div>

            <h1>
              Write better posts.
              <br />
              <span>In seconds.</span>
            </h1>

            <p>
              Give the AI an idea, review the draft, and
              publish it directly to X.
            </p>
          </div>

          <div
            className={`status-pill ${
              xUser ? "status-connected" : ""
            }`}
          >
            <span className="status-dot" />
            {statusLabel}
          </div>
        </section>

        <div className="workspace">
          <section className="panel composer-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">01</div>
                <h2>What do you want to post?</h2>
              </div>

              <span className="panel-label">
                AI INPUT
              </span>
            </div>

            <textarea
              className="topic-input"
              value={topic}
              onChange={(event) =>
                setTopic(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  generate();
                }
              }}
              placeholder="Tell the AI what you want to say..."
            />

            <div className="composer-footer">
              <span className="shortcut">
                <kbd>⌘</kbd>
                <kbd>↵</kbd>
                Generate
              </span>

              <button
                className="primary-button"
                onClick={generate}
                disabled={!canGenerate}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Generating
                  </>
                ) : (
                  <>
                    Generate post
                    <span className="arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="panel draft-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">02</div>
                <h2>Review your draft</h2>
              </div>

              <span className="panel-label">
                X POST
              </span>
            </div>

            <div className="draft-editor">
              <textarea
                className="post-input"
                value={post}
                onChange={(event) =>
                  setPost(event.target.value)
                }
                placeholder="Your generated post will appear here..."
              />

              <div className="draft-meta">
                <span
                  className={
                    overLimit
                      ? "counter counter-error"
                      : "counter"
                  }
                >
                  {characterCount} / {MAX_LENGTH}
                </span>

                {post && (
                  <span className="editable-label">
                    Editable
                  </span>
                )}
              </div>
            </div>

            <div className="draft-actions">
              <button
                className="secondary-button"
                onClick={regenerate}
                disabled={
                  !topic.trim() || loading
                }
              >
                <span>↻</span>
                Regenerate
              </button>

              <button
                className="publish-button"
                onClick={publish}
                disabled={!canPublish}
              >
                {publishing ? (
                  <>
                    <span className="spinner spinner-dark" />
                    Publishing...
                  </>
                ) : (
                  <>
                    Publish to X
                    <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {message && (
          <div
            className={`notice ${
              messageType === "error"
                ? "notice-error"
                : "notice-success"
            }`}
          >
            <span className="notice-icon">
              {messageType === "error" ? "!" : "✓"}
            </span>

            <span>{message}</span>
          </div>
        )}

        <section
          className="panel"
          style={{ marginTop: 14 }}
        >
          <div className="panel-header">
            <div>
              <div className="panel-kicker">03</div>
              <h2>Auto Comment</h2>
            </div>

            <span className="panel-label">REVIEW FIRST</span>
          </div>

          <div style={{ padding: "0 22px 10px" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div
                  style={{
                    marginBottom: 8,
                    color: "#666",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Keyword
                </div>

                <input
                  value={commentKeyword}
                  onChange={(event) =>
                    setCommentKeyword(event.target.value)
                  }
                  placeholder="AI"
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    color: "#f5f5f5",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    marginBottom: 8,
                    color: "#666",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Reply style / instructions
                </div>

                <input
                  value={commentInstructions}
                  onChange={(event) =>
                    setCommentInstructions(event.target.value)
                  }
                  placeholder="Casual and insightful"
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    color: "#f5f5f5",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div
              className="composer-footer"
              style={{
                marginTop: 16,
                paddingLeft: 0,
                paddingRight: 0,
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="shortcut">Safe review-first flow</span>

              <button
                className="primary-button"
                onClick={findOpportunities}
                disabled={!xUser || commentLoading || !commentKeyword.trim()}
              >
                {commentLoading ? "Finding..." : "Find Opportunities"}
              </button>
            </div>
          </div>

          {commentMessage && (
            <div
              style={{ margin: "0 22px 18px" }}
              className={`notice ${
                commentMessageType === "error"
                  ? "notice-error"
                  : "notice-success"
              }`}
            >
              <span className="notice-icon">
                {commentMessageType === "error" ? "!" : "✓"}
              </span>

              <span>{commentMessage}</span>
            </div>
          )}

          {opportunities.length > 0 && (
            <div style={{ padding: "0 22px 22px" }}>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                {opportunities.map((opportunity) => (
                  <div
                    key={opportunity.tweetId}
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.02)",
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      {opportunity.author.profileImageUrl ? (
                        <img
                          src={opportunity.author.profileImageUrl}
                          alt={`${opportunity.author.name} profile`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "50%",
                            background: "#f5f5f5",
                            color: "#080808",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {opportunity.author.name
                            ?.charAt(0)
                            ?.toUpperCase() || "X"}
                        </div>
                      )}

                      <div>
                        <div style={{ fontWeight: 600 }}>
                          @{opportunity.author.username}
                        </div>
                        <div
                          style={{
                            color: "#666",
                            fontSize: 11,
                          }}
                        >
                          {opportunity.author.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          color: "#666",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        Original post
                      </div>

                      <div
                        style={{
                          color: "#d9d9d9",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        “{opportunity.text}”
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          color: "#666",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        Suggested reply
                      </div>

                      {opportunity.editing ? (
                        <textarea
                          value={opportunity.suggestedReply}
                          onChange={(event) =>
                            updateOpportunityReply(
                              opportunity.tweetId,
                              event.target.value
                            )
                          }
                          style={{
                            width: "100%",
                            minHeight: 90,
                            resize: "vertical",
                            padding: "10px 12px",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.02)",
                            color: "#f5f5f5",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            color: "#e8e8e8",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          “{opportunity.suggestedReply}”
                        </div>
                      )}
                    </div>

                    <div
                      className="draft-actions"
                      style={{
                        padding: "12px 0 0",
                        borderTop: "1px solid rgba(255,255,255,0.07)",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="secondary-button"
                        onClick={() =>
                          setOpportunities((current) =>
                            current.map((item) =>
                              item.tweetId === opportunity.tweetId
                                ? {
                                    ...item,
                                    editing: !item.editing,
                                  }
                                : item
                            )
                          )
                        }
                        disabled={opportunity.posted || opportunity.posting}
                      >
                        {opportunity.editing ? "Done" : "Edit"}
                      </button>

                      <button
                        className="primary-button"
                        onClick={() => postReply(opportunity)}
                        disabled={
                          opportunity.posted || opportunity.posting
                        }
                      >
                        {opportunity.posting
                          ? "Posting..."
                          : opportunity.posted
                            ? "Posted"
                            : "Post Reply"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() => skipOpportunity(opportunity.tweetId)}
                        disabled={opportunity.posting}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="info-grid">
          <div className="info-card">
            <div className="info-number">01</div>

            <div>
              <h3>Describe the idea</h3>

              <p>
                Give Autopilot a topic, opinion,
                announcement, or rough thought.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-number">02</div>

            <div>
              <h3>Make it yours</h3>

              <p>
                Edit anything the AI generates before
                it reaches your audience.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-number">03</div>

            <div>
              <h3>Publish</h3>

              <p>
                Connect your X account and publish
                directly from the dashboard.
              </p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span>Autopilot</span>
          <span>AI-assisted X publishing</span>
        </footer>
      </div>
    </main>
  );
}