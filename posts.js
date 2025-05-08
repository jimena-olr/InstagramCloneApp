import { get_db_connection } from './server/models/rdbms.js';
import { producePostEvent } from './server/kafka/producePostEvent.js';
import { getCommentsForPosts } from './comments.js';

const db = get_db_connection();

export async function createPost(userId, text, imageUrl = null, hashtags = []) {
  try {
    const [result] = await db.send_sql(
      "INSERT INTO posts (author, text_content, image_url, hashtag_text) VALUES (?, ?, ?, ?)",
      [userId, text, imageUrl, JSON.stringify(hashtags)]
    );
    const postId = result.insertId;

    if (hashtags.length > 0) {
      await linkPostToHashtags(postId, hashtags);
    }

    const [userResult] = await db.send_sql(
      "SELECT username FROM users WHERE user_id = ?",
      [userId]
    );
    const username = userResult[0]?.username || `user_${userId}`;

    await producePostEvent({
      username,
      post_text: text,
      attach: imageUrl,
      hashtags
    });

    return { success: true, postId };
  } catch (err) {
    console.error("createPost error:", err);
    return { error: "Failed to create post" };
  }
}

export async function deletePost(postId, authorId) {
  try {
    // First, delete associated comments
    await db.send_sql(`DELETE FROM comments WHERE post_id = ?`, [postId]);

    // Then, delete the post
    const [result] = await db.send_sql(
      `DELETE FROM posts WHERE post_id = ? AND author = ?`,
      [postId, authorId]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error("deletePost error:", err);
    return false;
  }
}

export async function likePost(postId, userId) {
  try {
    const [rows] = await db.send_sql(
      "SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (rows.length > 0) {
      return { error: "You have already liked this post" };
    }
    await db.send_sql(
      "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
      [postId, userId]
    );

    return { success: true };
  } catch (err) {
    console.error("likePost error:", err);
    return { error: "Failed to like post" };
  }
}

export async function unlikePost(postId, userId) {
  try {
    const [rows] = await db.send_sql(
      "SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (rows.length === 0) {
      return { error: "You have not liked this post" };
    }

    await db.send_sql(
      "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    return { success: true };
  } catch (err) {
    console.error("unlikePost error:", err);
    return { error: "Failed to unlike post" };
  }
}

export async function linkPostToHashtags(postId, hashtags) {
  try {
    for (const tag of hashtags) {
      await db.send_sql(
        `INSERT INTO hashtags (hashtag, count)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE count = count + 1`,
        [tag]
      );
    }
    return { success: true };
  } catch (err) {
    console.error("linkPostToHashtags error:", err);
    return { error: "Failed to link hashtags" };
  }
}

function safeParseJSON(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getPostsByUser(userId) {
  try {
    const db = await get_db_connection().connect();

    // 1) Pull everything, aliasing columns to JS-friendly names:
    const [rows] = await db.send_sql(
      `SELECT
         p.post_id                AS postId,
         p.text_content           AS text,
         p.timestamp              AS timestamp,
         p.image_url              AS imageUrl,
         JSON_UNQUOTE(p.hashtag_text) AS hashtagsJson,
         COUNT(pl.user_id)        AS likeCount,
         u.username               AS authorUsername,
         u.profile_image_url      AS profileImageUrl
       FROM posts p
       JOIN users u
         ON p.author = u.user_id
       LEFT JOIN post_likes pl
         ON p.post_id = pl.post_id
       WHERE p.author = ?
       GROUP BY p.post_id
       ORDER BY p.timestamp DESC`,
      [userId]
    );

    // If no posts, just return empty array
    if (rows.length === 0) return [];

    // 2) Batch-load comments
    const postIds = rows.map((r) => r.postId);
    const commentsByPost = await getCommentsForPosts(postIds);

    // 3) Build the final JS objects
    return rows.map((r) => ({
      postId:         r.postId,
      text:           r.text,
      timestamp:      r.timestamp,
      imageUrl:       r.imageUrl,        // <-- this will now be a real URL
      authorUsername: r.authorUsername,
      profileImageUrl:r.profileImageUrl, // <-- so you can render the poster’s avatar too
      likeCount:      r.likeCount || 0,
      hashtags:       JSON.parse(r.hashtagsJson || '[]'),
      comments:       commentsByPost[r.postId] || []
    }));
  } catch (err) {
    console.error("getPostsByUser error:", err);
    throw err;
  }
}

export async function getPostsForUser(userId) {
  try {
    // Step 1: Get post_ids from ranked_feed for the given user, ordered by rank
    const [rankedRows] = await db.send_sql(
      "SELECT post_id FROM ranked_feed WHERE user_id = ? ORDER BY `rank` ASC",
      [userId]
    );

    const postIds = rankedRows.map((row) => row.post_id);

    if (postIds.length === 0) return [];

    // Step 2: Fetch full post details for these ranked post IDs
    const [posts] = await db.send_sql(
      `SELECT p.post_id, p.text_content, p.timestamp, p.image_url, p.hashtag_text,
              u.username AS author_username, u.profile_image_url,
              COUNT(pl.user_id) AS likeCount
         FROM posts p
         JOIN users u ON p.author = u.user_id
         LEFT JOIN post_likes pl ON p.post_id = pl.post_id
        WHERE p.post_id IN (?)
        GROUP BY p.post_id`,
      [postIds]
    );

    // Step 3: Preserve original rank order
    const postMap = new Map();
    posts.forEach((post) => postMap.set(post.post_id, post));
    const orderedPosts = postIds.map((id) => postMap.get(id)).filter(Boolean);

    // Step 4: Attach comments
    const commentsByPost = await getCommentsForPosts(postIds);

    return orderedPosts.map((post) => ({
      postId: post.post_id,
      text: post.text_content,
      timestamp: post.timestamp,
      imageUrl: post.image_url,
      author: post.author_username,
      profileImage: post.profile_image,
      likeCount: post.likeCount || 0,
      liked: Boolean(post.liked),
      hashtags: safeParseJSON(post.hashtag_text),
      comments: commentsByPost[post.post_id] || []
    }));
  } catch (err) {
    console.error("getPostsForUser error:", err);
    return { error: "Failed to retrieve ranked posts" };
  }
}

