import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolveAvatar } from "../utils/avatar";

export default function UserPage() {
  const [profile, setProfile]   = useState(null);
  const [error,   setError]     = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const navigate = useNavigate();

  /* ─── load my own profile ─── */
  useEffect(() => {
    async function fetchProfile() {
      try {
        const sess = await fetch("http://localhost:3030/session", {
          credentials:"include",
        });
        const { sessionUser } = await sess.json();
        if (!sessionUser) return navigate("/login");

        const r = await fetch("http://localhost:3030/user", {
          method:"POST",
          credentials:"include",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load profile");

        if (data.profileImageUrl) {
          const abs = data.profileImageUrl.startsWith("http")
            ? data.profileImageUrl
            : `http://localhost:3030${data.profileImageUrl}`;
          localStorage.setItem("profileImageUrl", abs);
        }

        setProfile(data);
      } catch (err) {
        console.error(err);
        setError("Could not load profile.");
      }
    }
    fetchProfile();
  }, [navigate]);

  /* ─── comment helper ─── */
  const handleCommentChange = (postId, v) =>
    setCommentInputs((p) => ({ ...p, [postId]: v }));

  const submitComment = async (postId) => {
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
  
      // 🔁 Re-fetch user profile to update comments
      const res = await fetch("http://localhost:3030/user", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reload profile");
  
      setProfile(data);
    } catch (err) {
      console.error("Comment submission error:", err);
    }
  };
  
  /* ─── delete helper ─── */
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      const r = await fetch(`http://localhost:3030/post/${postId}`, {
        method:"DELETE",
        credentials:"include",
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setProfile((p) => ({
        ...p,
        posts: p.posts.filter((x) => x.postId !== postId),
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  };

  /* ─── like toggle ─── */
  const handleToggleLike = async (postId) => {
    setProfile((p) => ({
      ...p,
      posts: p.posts.map((x) =>
        x.postId === postId
          ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) }
          : x
      ),
    }));

    const post   = profile.posts.find((x) => x.postId === postId);
    const method = post.liked ? "DELETE" : "POST";

    try {
      const r = await fetch(`http://localhost:3030/post/${postId}/like`, {
        method, credentials:"include",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Like failed");

      setProfile((p) => ({
        ...p,
        posts: p.posts.map((x) =>
          x.postId === postId ? { ...x, liked:data.liked, likeCount:data.likeCount } : x
        ),
      }));
    } catch (err) {
      console.error("Like toggle failed:", err);
      setProfile((p) => ({
        ...p,
        posts: p.posts.map((x) =>
          x.postId === postId ? { ...x, liked:post.liked, likeCount:post.likeCount } : x
        ),
      }));
    }
  };

  /* ─── render ─── */
  if (error)     return <div style={{ color:"red" }}>{error}</div>;
  if (!profile)  return <p>Loading…</p>;

  const { username, followerCount, followingCount, posts } = profile;
  const avatarSrc = resolveAvatar(profile.profileImageUrl, `@${username}`);

  return (
    <div style={{ padding:"2rem" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
        <img
          src={avatarSrc}
          alt={`@${username}`}
          style={{ width:100, height:100, borderRadius:"50%", objectFit:"cover" }}
        />
        <button
          onClick={() => navigate("/profile")}
          style={{
            padding:"0.6rem 1.2rem",
            background:"#007bff",
            color:"white",
            border:"none",
            borderRadius:4,
            cursor:"pointer",
          }}
        >
          Change Profile Photo
        </button>
      </div>

      <h2>@{username}</h2>
      <p>Followers: {followerCount}</p>
      <p>Following: {followingCount}</p>

      <h3 style={{ marginTop:"2rem" }}>Your Posts</h3>
      {posts.length === 0 && <p>You haven't posted anything yet.</p>}

      {posts.map((post) => (
        <div key={post.postId}
             style={{ border:"1px solid #ccc", padding:"1rem",
                      marginBottom:"1rem", borderRadius:8 }}>
          <p>{post.text}</p>

          {post.imageUrl && (
            <img
              src={
                post.imageUrl.startsWith("http")
                  ? post.imageUrl
                  : `http://localhost:3030${post.imageUrl}`
              }
              alt="post"
              style={{ width:300, height:"auto", marginTop:"0.5rem" }}
            />
          )}

          {post.hashtags.length > 0 && (
            <div style={{ marginTop:"0.5rem" }}>
              {post.hashtags.map((tag, i) => (
                <span key={i}
                      style={{ display:"inline-block", background:"#e0e0e0", borderRadius:12,
                               padding:"0.2rem 0.6rem", marginRight:6, fontSize:"0.8rem" }}>
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          <small>{new Date(post.timestamp).toLocaleString()}</small>

          <div style={{ marginTop:"0.3rem", fontSize:"0.85rem" }}>
            <button
              onClick={() => handleToggleLike(post.postId)}
              style={{
                background:"none",
                border:"none",
                cursor:"pointer",
                fontSize:"1rem",
                color: post.liked ? "red" : "black",
              }}
            >
              ❤️ {post.likeCount}
            </button>
          </div>

          {(post.comments || []).map((c, i) => (
            <div key={i} style={{ marginTop:"0.5rem", fontSize:"0.9rem" }}>
              <strong>@{c.username}</strong>: {c.text}
            </div>
          ))}

          <input
            type="text"
            placeholder="Write a comment…"
            value={commentInputs[post.postId] || ""}
            onChange={(e) => handleCommentChange(post.postId, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment(post.postId)}
            style={{ marginTop:"0.5rem", width:"100%", padding:"0.4rem" }}
          />

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
        </div>
      ))}
    </div>
  );
}