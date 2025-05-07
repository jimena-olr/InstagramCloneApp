// src/pages/UserPage.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function UserPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const navigate = useNavigate();

  // 1️⃣ load session + profile
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const sess = await fetch("http://localhost:3030/session", {
          credentials: "include",
        });
        const { sessionUser } = await sess.json();
        if (!sessionUser) return navigate("/login");

        const res = await fetch("http://localhost:3030/user", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");

        // annotate each post with `liked: false`
        data.posts = data.posts.map((p) => ({ ...p, liked: false }));
        setProfile(data);
      } catch (err) {
        console.error(err);
        setError("Could not load profile.");
      }
    }
    fetchUserProfile();
  }, [navigate]);

  // 2️⃣ comment helpers
  const handleCommentChange = (postId, value) =>
    setCommentInputs((p) => ({ ...p, [postId]: value }));

  const submitComment = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await fetch("http://localhost:3030/post/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, content }),
      });
      setProfile((prev) => {
        const updated = { ...prev };
        const post = updated.posts.find((x) => x.postId === postId);
        post.comments = [
          ...(post.comments || []),
          { username: updated.username, text: content, timestamp: new Date().toISOString() }
        ];
        return updated;
      });
      setCommentInputs((p) => ({ ...p, [postId]: "" }));
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  // 3️⃣ delete
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      const res = await fetch(`http://localhost:3030/post/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setProfile((prev) => ({
        ...prev,
        posts: prev.posts.filter((x) => x.postId !== postId),
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  };

  // 4️⃣ toggle-like
  const handleToggleLike = async (postId) => {
    setProfile((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.postId !== postId) return p;
        const willLike = !p.liked;
        return {
          ...p,
          liked: willLike,
          likeCount: p.likeCount + (willLike ? 1 : -1),
        };
      }),
    }));
    const post = profile.posts.find((p) => p.postId === postId);
    try {
      await fetch(
        `http://localhost:3030/post/${postId}/like`,
        {
          method: post.liked ? "DELETE" : "POST",
          credentials: "include",
        }
      );
    } catch (err) {
      console.error("Like toggle failed:", err);
      // rollback
      setProfile((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.postId === postId
            ? {
                ...p,
                liked: !p.liked,
                likeCount: p.likeCount + (p.liked ? 1 : -1),
              }
            : p
        ),
      }));
    }
  };

  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!profile) return <p>Loading…</p>;

  const { username, followerCount, followingCount, posts } = profile;
  const myPic = localStorage.getItem("profileImageUrl") || "";

  return (
    <div style={{ padding: "2rem" }}>
      {/* PROFILE HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        {myPic ? (
          <img
            src={myPic}
            alt="You"
            style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#ddd" }} />
        )}
        <button
          onClick={() => navigate("/profile")}
          style={{
            padding: "0.6rem 1.2rem",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Change Profile Photo
        </button>
      </div>

      <h2>@{username}</h2>
      <p>Followers: {followerCount}</p>
      <p>Following: {followingCount}</p>

      <h3 style={{ marginTop: "2rem" }}>Your Posts</h3>
      {posts.length === 0 && <p>You haven't posted anything yet.</p>}
      {posts.map((post) => {
        const imgSrc = post.imageUrl
          ? post.imageUrl.startsWith("http")
            ? post.imageUrl
            : `http://localhost:3030${post.imageUrl}`
          : null;

        return (
          <div
            key={post.postId}
            style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem", borderRadius: "8px" }}
          >
            <p>{post.text}</p>

            {/* image */}
            {imgSrc && (
              <img
                src={imgSrc}
                alt="post"
                style={{ display: "block",
                  width: "300px",       // or whatever max width you want
                  height: "auto",       // preserve aspect ratio
                  marginTop: "0.5rem" }}
              />
            )}

            {/* hashtags */}
            {post.hashtags.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {post.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#e0e0e0",
                      borderRadius: "12px",
                      padding: "0.2rem 0.6rem",
                      marginRight: "0.5rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}

            <small>{new Date(post.timestamp).toLocaleString()}</small>

            {/* like toggle */}
            <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
              <button
                onClick={() => handleToggleLike(post.postId)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: post.liked ? "red" : "black",
                }}
              >
                ❤️ {post.likeCount}
              </button>
            </div>

            {/* comments */}
            {(post.comments || []).map((c, i) => (
              <div key={i} style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                <strong>@{c.username}</strong>: {c.text}
              </div>
            ))}

            <input
              type="text"
              placeholder="Write a comment…"
              value={commentInputs[post.postId] || ""}
              onChange={(e) => handleCommentChange(post.postId, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment(post.postId)}
              style={{ marginTop: "0.5rem", width: "100%", padding: "0.4rem" }}
            />

            <button
              onClick={() => handleDeletePost(post.postId)}
              style={{
                marginTop: "0.5rem",
                backgroundColor: "#ffdddd",
                border: "1px solid #ffaaaa",
                color: "#aa0000",
                padding: "0.3rem 0.6rem",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Delete Post
            </button>
          </div>
        );
      })}
    </div>
  );
}