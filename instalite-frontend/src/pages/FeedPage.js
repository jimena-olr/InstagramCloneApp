import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { resolveAvatar } from "../utils/avatar";

export default function FeedPage() {
  const [posts, setPosts]                 = useState([]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [textContent, setTextContent]     = useState("");
  const [hashtags,   setHashtags]         = useState("");
  const [imageFile,  setImageFile]        = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const navigate = useNavigate();
  const location = useLocation();

  /* ─── open ?create=true modal ─── */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      setShowModal(true);
      navigate("/feed", { replace: true });
    }
  }, [location, navigate]);

  /* ─── fetch session + feed ─── */
  useEffect(() => {
    async function load() {
      try {
        const sess = await fetch("http://localhost:3030/session", {
          credentials: "include",
        });
        const { sessionUser } = await sess.json();
        if (!sessionUser) return navigate("/login");
        setCurrentUsername(sessionUser.username);

        const r = await fetch("http://localhost:3030/feed", {
          method: "POST",
          credentials: "include",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load feed");
        setPosts(data);                      // keep DB likeCount / liked flags
      } catch (err) {
        console.error("Feed fetch error:", err);
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  /* ─── create a post ─── */
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("text_content", textContent);
    form.append(
      "hashtag_text",
      JSON.stringify(
        hashtags.split(",").map((t) => t.trim()).filter(Boolean)
      )
    );
    if (imageFile) form.append("image", imageFile);

    try {
      await axios.post("http://localhost:3030/post/create", form, {
        withCredentials: true,
      });
      setTextContent("");
      setHashtags("");
      setImageFile(null);
      setShowModal(false);

      /* reload feed */
      const r = await fetch("http://localhost:3030/feed", {
        method: "POST",
        credentials: "include",
      });
      setPosts(await r.json());
    } catch (err) {
      console.error("Post creation error:", err);
      alert("Error creating post.");
    }
  };

  /* ─── comment ─── */
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
      setCommentInputs((p) => ({ ...p, [postId]: "" }));
      /* refresh feed comments only (cheap way) */
      const r = await fetch("http://localhost:3030/feed", {
        method: "POST",
        credentials: "include",
      });
      setPosts(await r.json());
    } catch (err) {
      console.error("Comment submission error:", err);
    }
  };

  /* ─── delete post ─── */
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      const res = await fetch(`http://localhost:3030/post/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPosts((prev) => prev.filter((x) => x.postId !== postId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete post.");
    }
  };

  const handleToggleLike = async (postId, isLiked) => {
    const method = isLiked ? "DELETE" : "POST";
    try {
      await fetch(`http://localhost:3030/post/${postId}/like`, {
            method,
            credentials: "include",
          });
      
          // Re-fetch the updated feed
          const refreshedFeed = await fetch("http://localhost:3030/feed", {
            method: "POST",
            credentials: "include",
          });
          const feedData = await refreshedFeed.json();
          setPosts(feedData);
        } catch (err) {
          console.error("Like toggle failed:", err);
        }
      };

  /* ─── render ─── */
  if (loading) return <p>Loading posts…</p>;
  if (error)   return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Welcome to your Feed</h2>
      <hr />

      {posts.length === 0 ? (
        <p>No live posts yet.</p>
      ) : (
        posts.map((post) => {
          const avatarSrc = resolveAvatar(post.profileImageUrl, `@${post.author}`);
          const hashtagsArr = Array.isArray(post.hashtags) ? post.hashtags : [];

          return (
            <div key={post.postId}
                 style={{ border:"1px solid #ccc", padding:"1rem",
                          marginBottom:"1rem", borderRadius:"8px" }}>

              {/* header with avatar + author */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <img
                  src={avatarSrc}
                  alt={`@${post.author}`}
                  style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover" }}
                />
                <strong>
                  <Link to={`/user/${post.author}`}>@{post.author}</Link>
                </strong>
              </div>

              <p>{post.text}</p>

              {hashtagsArr.length > 0 && (
                <div style={{ marginTop:"0.5rem" }}>
                  {hashtagsArr.map((t, i) => (
                    <span key={i}
                          style={{ display:"inline-block", background:"#e0e0e0",
                                   borderRadius:12, padding:"2px 8px",
                                   marginRight:6, fontSize:"0.8rem" }}>
                      {t.startsWith("#") ? t : `#${t}`}
                    </span>
                  ))}
                </div>
              )}

              {post.imageUrl && (
                <img
                  src={
                    post.imageUrl.startsWith("http")
                      ? post.imageUrl
                      : `http://localhost:3030${post.imageUrl}`
                  }
                  alt="post"
                  style={{ display:"block", width:300, height:"auto", marginTop:"0.5rem" }}
                />
              )}

              <small>{new Date(post.timestamp).toLocaleString()}</small>

              {/* like / comment */}
              <div style={{ marginTop: '0.3rem', fontSize: '0.85rem' }}>
                <button
                  onClick={() => handleToggleLike(post.postId, post.liked)}
                  style={{
                    marginTop: "0.5rem",
                    backgroundColor: "white",
                    border: "1px solid lightgray",
                    color: post.liked ? "red" : "gray",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  {post.liked ? "❤️ Unlike" : "🤍 Like"}
                </button>
                  {post.likeCount || 0} likes
                </div>


              {/* comments */}
              {(post.comments || []).length > 0 ? (
                <div style={{ marginTop:"0.5rem" }}>
                  {post.comments.map((c, i) => (
                    <div key={i} style={{ fontSize:"0.85rem", marginTop:"0.2rem" }}>
                      <strong>
                        <Link to={`/user/${c.username}`}>@{c.username}</Link>
                      </strong>: {c.text}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontStyle:"italic", fontSize:"0.85rem", marginTop:"0.5rem" }}>
                  Be the first to comment…
                </p>
              )}

              <input
                type="text"
                placeholder="Write a comment…"
                value={commentInputs[post.postId] || ""}
                onChange={(e) =>
                  setCommentInputs((p) => ({ ...p, [post.postId]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment(post.postId)}
                style={{ marginTop:"0.5rem", width:"100%", padding:"0.4rem" }}
              />

              {post.author.toLowerCase() === currentUsername.toLowerCase() && (
                <button
                  onClick={() => handleDeletePost(post.postId)}
                  style={{
                    marginTop:"0.5rem",
                    background:"#ffdddd",
                    border:"1px solid #ffaaaa",
                    color:"#aa0000",
                    padding:"0.3rem 0.6rem",
                    borderRadius:4,
                    cursor:"pointer",
                  }}
                >
                  Delete Post
                </button>
              )}
            </div>
          );
        })
      )}

      {/* floating + button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position:"fixed",
          bottom:30,
          right:30,
          fontSize:"2rem",
          padding:"10px 20px",
        }}
      >
        ➕
      </button>

      {/* create‑post modal */}
      {showModal && (
        <div
          style={{
            position:"fixed",
            top:0,
            left:0,
            width:"100%",
            height:"100%",
            background:"rgba(0,0,0,0.5)",
            display:"flex",
            justifyContent:"center",
            alignItems:"center",
          }}
        >
          <div style={{ background:"white", padding:20, borderRadius:8, width:300 }}>
            <h2>Create a Post</h2>
            <form onSubmit={handlePostSubmit}>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What's on your mind?"
                style={{ width:"100%" }}
              />
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Hashtags, comma‑separated"
                style={{ width:"100%", marginTop:10 }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                style={{ marginTop:10 }}
              />
              <div style={{ marginTop:10 }}>
                <button type="submit">Post</button>{" "}
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}