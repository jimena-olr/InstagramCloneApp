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
              <div style={{ marginTop:4, fontSize:"0.85rem" }}>
                ❤️ {post.likeCount || 0} likes
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