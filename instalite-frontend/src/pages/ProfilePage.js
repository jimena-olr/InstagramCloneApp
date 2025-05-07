// src/pages/ProfilePage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("userId");
  const [uploading, setUploading] = useState(false);
  const [matchesData, setMatchesData] = useState(null);
  const [error, setError] = useState("");

  // 1) Upload & fetch your image + actorMatches
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("userId", userId);
      form.append("profileImage", file);

      const res  = await fetch("http://localhost:3000/uploadProfileImage", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      // stash both your upload URL and the 5 actor matches
      setMatchesData({
        imageUrl:     json.imageUrl,
        actorMatches: json.actorMatches,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // 2) User clicked one of the 6 options
  const handleSelect = async (opt) => {
    const { id, imageUrl } = opt;
  
    // 1) Save locally so Layout.js and UserPage.js can read it immediately
    localStorage.setItem("profileImageUrl", imageUrl);
  
    // 2) Tell the server both which actor (if any) and which image URL we want
    try {
      const res = await fetch("http://localhost:3000/linkActorToUser", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          actorId:     id === "__uploaded__" ? null : id,
          imageUrl
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to link profile photo");
      }
    } catch (err) {
      console.error("Error in handleSelect:", err);
      // we’ll still navigate so the user isn't stuck here
    }
  
    // 3) Go on to the feed
    navigate("/feed");
  };

  // — RENDER —

  // A) Before upload: pick a file
  if (!matchesData) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Pick a Profile Photo</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading && <p>Uploading and matching…</p>}
        {error     && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  // B) After upload: show the 6 clickable thumbnails
  const { imageUrl, actorMatches } = matchesData;
  const options = [
    { id: "__uploaded__", name: "My Upload", imageUrl },
    ...actorMatches.map((m) => ({
      id: m.nconst,
      name: m.name,
      imageUrl: m.imageUrl,
    })),
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Select Your Profile Photo</h2>

      <div
        style={{
          display:            "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap:                16,
          marginTop:          16,
          marginBottom:       24,
        }}
      >
        {options.map((opt) => (
          <div
            key={opt.id}
            onClick={() => handleSelect(opt)}
            style={{
              cursor:          "pointer",
              border:          "1px solid #ccc",
              borderRadius:    8,
              padding:         8,
              textAlign:       "center",
              userSelect:      "none",
              transition:      "border 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.border = "2px solid #007bff"}
            onMouseLeave={(e) => e.currentTarget.style.border = "1px solid #ccc"}
          >
            <img
              src={opt.imageUrl}
              alt={opt.name}
              style={{
                width:        100,
                height:       100,
                objectFit:    "cover",
                borderRadius: "50%",
                marginBottom: 8,
              }}
            />
            <div style={{ fontWeight: "bold" }}>{opt.name}</div>
            <button style={{ marginTop: 8 }}>Use this photo</button>
          </div>
        ))}
      </div>
    </div>
  );
}