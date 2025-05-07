// src/pages/UserSearchPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function UserSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1) On mount, verify that the session is valid
  useEffect(() => {
    fetch("http://localhost:3030/session", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.sessionUser) navigate("/login");
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

  // 2) Grab your userId (must be set at login)
  const uid = localStorage.getItem("userId");

  // 3) Form submit -> call /users/search
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:3030/users/search?userId=${uid}&q=${encodeURIComponent(
          q
        )}`,
        {
          credentials: "include",
        }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>User Search</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name or username…"
          required
          style={{ width: "60%", padding: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8, padding: 8 }}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <div style={{ color: "red" }}>Error: {error}</div>}

      {!error && results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map((u) => (
            <li key={u.userId}>
              {u.firstName} {u.lastName} (@{u.username})
            </li>
          ))}
        </ul>
      )}

      {!error && !loading && q.trim() !== "" && results.length === 0 && (
        <div><em>No users found</em></div>
      )}
    </div>
  );
}
