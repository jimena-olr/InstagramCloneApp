import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function FeedPage() {
  const [posts, setPosts]                 = useState([]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [textContent, setTextContent]     = useState("");
  const [hashtags, setHashtags]           = useState("");
  const [imageFile, setImageFile]         = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const navigate   = useNavigate();
  const location   = useLocation();

  /* ────────────────── open create‑post modal via ?create=true ────────────────── */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      setShowModal(true);
      navigate("/feed", { replace: true });
    }
  }, [location, navigate]);

  /* ──────────────────────────── fetch session + feed ─────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const sess = await fetch("http://localhost:3030/session", { credentials: "include" });
        const { sessionUser } = await sess.json();
        if (!sessionUser) return navigate("/login");
        setCurrentUsername(sessionUser.username);

        const feedRes = await fetch("http://localhost:3030/feed", {
          method: "POST",
          credentials: "include",
        });
        const feedData = await feedRes.json();
        if (!feedRes.ok) throw new Error(feedData.error || "Failed to load feed");
        setPosts(feedData);          // ← keep DB‑supplied likeCount/liked
      } catch (err) {
        console.error("Feed fetch error:", err);
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  /* ─────────────────────────────  create post  ──────────────────────────────── */
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("text_content", textContent);
    form.append("hashtag_text", JSON.stringify(
      hashtags.split(",").map(t=>t.trim()).filter(Boolean)
    ));
    if (imageFile) form.append("image", imageFile);

    try {
      await axios.post("http://localhost:3030/post/create", form, { withCredentials: true });
      setTextContent(""); setHashtags(""); setImageFile(null); setShowModal(false);
      // reload feed
      const r = await fetch("http://localhost:3030/feed", {
        method: "POST", credentials: "include",
      });
      const refreshed = await r.json();
      setPosts(refreshed);
    } catch (err) {
      console.error("Post creation error:", err);
      alert("Error creating post.");
    }
  };

  /* ─────────────────────────────  comment  ──────────────────────────────────── */
  const handleSubmitComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    try {
      await fetch("http://localhost:3030/post/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, content: text }),
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      // refresh comments
      const r = await fetch("http://localhost:3030/feed", {
        method: "POST", credentials: "include",
      });
      setPosts(await r.json());
    } catch (err) {
      console.error("Comment submission error:", err);
    }
  };

  /* ─────────────────────────────  delete post  ──────────────────────────────── */
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`http://localhost:3030/post/${postId}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPosts((prev) => prev.filter((x) => x.postId !== postId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete post.");
    }
  };

  /* ─────────────────────────────── like toggle ─────────────────────────────── */
  const handleToggleLike = async (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.postId === postId ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p
      )
    );

    const post   = posts.find((p) => p.postId === postId);
    const method = post.liked ? "DELETE" : "POST";

    try {
      const res  = await fetch(`http://localhost:3030/post/${postId}/like`, {
        method, credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Like failed");

      /* sync UI with server truth */
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId ? { ...p, liked: data.liked, likeCount: data.likeCount } : p
        )
      );
    } catch (err) {
      console.error("Like toggle failed:", err);
      // rollback
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId ? { ...p, liked: post.liked, likeCount: post.likeCount } : p
        )
      );
    }
  };

  /* ────────────────────────────────  render  ───────────────────────────────── */
  if (loading) return <p>Loading posts...</p>;
  if (error)   return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Welcome to your Feed</h2><hr />

      {posts.length === 0 ? (
        <p>No live posts yet.</p>
      ) : (
        posts.map((post) => {
          const hashtagsArr = Array.isArray(post.hashtags) ? post.hashtags : [];
          const imgSrc = post.imageUrl
            ? post.imageUrl.startsWith("http") ? post.imageUrl : `http://localhost:3030${post.imageUrl}`
            : null;

          return (
            <div key={post.postId}
                 style={{ border: "1px solid #ccc", padding: "1rem",
                          marginBottom: "1rem", borderRadius: "8px" }}>
              <strong>@{post.author}</strong>
              <p>{post.text}</p>

              {hashtagsArr.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  {hashtagsArr.map((t, i) => (
                    <span key={i}
                          style={{ display: "inline-block", backgroundColor: "#e0e0e0",
                                   borderRadius: "12px", padding: "0.2rem 0.6rem",
                                   marginRight: "0.5rem", fontSize: "0.8rem" }}>
                      {t.startsWith("#") ? t : `#${t}`}
                    </span>
                  ))}
                </div>
              )}

              {imgSrc && (
                <img src={imgSrc} alt="post"
                     style={{ display: "block", width: "300px",
                              height: "auto", marginTop: "0.5rem" }} />
              )}

              <small>{new Date(post.timestamp).toLocaleString()}</small>

              <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
                <button onClick={() => handleToggleLike(post.postId)}
                        style={{ background: "none", border: "none",
                                 cursor: "pointer", fontSize: "1rem",
                                 color: post.liked ? "red" : "black" }}>
                  ❤️ {post.likeCount}
                </button>
              </div>

              {(post.comments || []).length > 0 ? (
                <div style={{ marginTop: "0.5rem" }}>
                  {post.comments.map((c, i) => (
                    <div key={i}
                         style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      <strong>@{c.username}</strong>: {c.text}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontStyle: "italic", fontSize: "0.85rem",
                            marginTop: "0.5rem" }}>Be the first to comment…</p>
              )}

              <input type="text"
                     placeholder="Write a comment…"
                     value={commentInputs[post.postId] || ""}
                     onChange={(e) =>
                       setCommentInputs((prev) => ({ ...prev, [post.postId]: e.target.value }))
                     }
                     onKeyDown={(e) => e.key === "Enter" && handleSubmitComment(post.postId)}
                     style={{ marginTop: "0.5rem", width: "100%", padding: "0.4rem" }} />

              {post.author.toLowerCase() === currentUsername.toLowerCase() && (
                <button onClick={() => handleDeletePost(post.postId)}
                        style={{ marginTop: "0.5rem", backgroundColor: "#ffdddd",
                                 border: "1px solid #ffaaaa", color: "#aa0000",
                                 padding: "0.3rem 0.6rem", borderRadius: "4px",
                                 cursor: "pointer" }}>
                  Delete Post
                </button>
              )}
            </div>
          );
        })
      )}

      {/* floating ➕ button */}
      <button onClick={() => setShowModal(true)}
              style={{ position: "fixed", bottom: 30, right: 30,
                       fontSize: "2rem", padding: "10px 20px" }}>➕</button>

      {/* modal */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%",
                      height: "100%", backgroundColor: "rgba(0,0,0,0.5)",
                      display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "white", padding: 20, borderRadius: 8, width: 300 }}>
            <h2>Create a Post</h2>
            <form onSubmit={handlePostSubmit}>
              <textarea value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="What's on your mind?" style={{ width: "100%" }} />
              <input type="text" value={hashtags}
                     onChange={(e) => setHashtags(e.target.value)}
                     placeholder="Hashtags, comma-separated"
                     style={{ width: "100%", marginTop: 10 }} />
              <input type="file" accept="image/*"
                     onChange={(e) => setImageFile(e.target.files[0])}
                     style={{ marginTop: 10 }} />
              <div style={{ marginTop: 10 }}>
                <button type="submit">Post</button>{" "}
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}