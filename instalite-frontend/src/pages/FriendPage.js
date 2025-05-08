import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveAvatar } from "../utils/avatar";

export default function FriendPage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const r = await fetch(`http://localhost:3030/user/${username}`,
                              { credentials:"include" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProfile(d);
      } catch (err) {
        console.error(err);
        setError("Failed to load user.");
      }
    }
    fetchProfile();
  }, [username]);

  const handleToggleLike = async (postId, isLiked) => {
    const method = isLiked ? "DELETE" : "POST";
    try {
      await fetch(`http://localhost:3030/post/${postId}/like`, {
        method,
        credentials: "include"
      });
  
      const r = await fetch(`http://localhost:3030/user/${username}`, {
        credentials: "include"
      });
      const data = await r.json();
      setProfile(data);
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };  

  if (error)    return <p style={{ color:"red" }}>{error}</p>;
  if (!profile) return <p>Loading {username}…</p>;

  const avatar = resolveAvatar(profile.profileImageUrl, `@${profile.username}`);

  return (
    <div style={{ padding:"2rem" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
        <img src={avatar} alt={`@${profile.username}`}
             style={{ width:100, height:100, borderRadius:"50%", objectFit:"cover" }}/>
        <div>
          <h2 style={{ margin:0 }}>@{profile.username}</h2>
          <p style={{ margin:0 }}>Followers: {profile.followerCount}</p>
          <p style={{ margin:0 }}>Following: {profile.followingCount}</p>
        </div>
      </div>

      {/* posts */}
      <h3>Posts</h3>
      {Array.isArray(profile.posts) && profile.posts.length ? (
        profile.posts.map(post => {
          const imgSrc = post.imageUrl
            ? (post.imageUrl.startsWith("http")
                ? post.imageUrl
                : `http://localhost:3030${post.imageUrl}`)
            : null;
          return (
            <div key={post.postId}
                 style={{ border:"1px solid #ccc", padding:"1rem",
                          marginBottom:"1rem", borderRadius:8 }}>
              <p>{post.text}</p>
              {imgSrc && (
                <img src={imgSrc} alt="post"
                     style={{ maxWidth:"100%", marginTop:8 }}/>
              )}
              {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {post.hashtags.map((tag, i) => (
                  <span key={i}
                        style={{
                          display: "inline-block",
                          background: "#e0e0e0",
                          borderRadius: 12,
                          padding: "0.2rem 0.6rem",
                          marginRight: 6,
                          fontSize: "0.8rem"
                        }}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}

              <div style={{ marginTop:4, fontSize:"0.85rem" }}>
              <button
                onClick={() => handleToggleLike(post.postId, post.liked)}
                style={{
                  background: "#fff",
                  border: "1px solid #ccc",
                  color: post.liked ? "red" : "gray",
                  padding: "4px 10px",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                {post.liked ? "❤️" : "🤍"}
              </button>
              {post.likeCount || 0}
            </div>

            </div>
          );
        })
      ) : (
        <p>No posts yet.</p>
      )}
    </div>
  );
}