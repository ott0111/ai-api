"use client";

import { useEffect, useMemo, useState } from "react";

const MAX_LENGTH = 280;

type XUser = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [post, setPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

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